
import { storage } from "../storage";
import { SecurityManager } from "./securityManager";
import axios from "axios";

interface EmailProvider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  apiUrl: string;
  scopes: string[];
}

const EMAIL_PROVIDERS: { [key: string]: EmailProvider } = {
  gmail: {
    name: "Gmail",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    apiUrl: "https://gmail.googleapis.com/gmail/v1",
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"]
  },
  outlook: {
    name: "Outlook",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    apiUrl: "https://graph.microsoft.com/v1.0",
    scopes: ["https://graph.microsoft.com/Mail.Read"]
  }
};

export class EmailIntegrationService {
  private static readonly RECEIPT_KEYWORDS = [
    'receipt', 'invoice', 'order confirmation', 'purchase', 'transaction',
    'walmart', 'target', 'kroger', 'amazon', 'costco', 'your order'
  ];

  // Generate OAuth authorization URL
  static generateAuthUrl(provider: string, userId: number, redirectUri: string): string {
    const providerConfig = EMAIL_PROVIDERS[provider];
    if (!providerConfig) {
      throw new Error(`Unsupported email provider: ${provider}`);
    }

    const params = new URLSearchParams({
      client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '',
      redirect_uri: redirectUri,
      scope: providerConfig.scopes.join(' '),
      response_type: 'code',
      state: `${userId}-${provider}-${Date.now()}`, // Include user ID for security
      access_type: 'offline', // For refresh tokens
      prompt: 'consent'
    });

    return `${providerConfig.authUrl}?${params.toString()}`;
  }

  // Exchange authorization code for access token
  static async exchangeCodeForToken(provider: string, code: string, redirectUri: string) {
    const providerConfig = EMAIL_PROVIDERS[provider];
    
    const response = await axios.post(providerConfig.tokenUrl, {
      client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
      client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });

    return response.data;
  }

  // Store encrypted email credentials
  static async storeEmailCredentials(userId: number, provider: string, tokens: any) {
    const encryptedTokens = SecurityManager.encryptSensitiveData(JSON.stringify(tokens));
    
    await storage.createEmailIntegration({
      userId,
      provider,
      encryptedTokens: encryptedTokens.encrypted,
      tokenIv: encryptedTokens.iv,
      tokenTag: encryptedTokens.tag,
      isActive: true,
      lastSync: new Date()
    });

    await SecurityManager.logSecurityEvent(userId, 'email_integration_added', { provider });
  }

  // Scan emails for receipts
  static async scanForReceipts(userId: number, provider: string, daysBack: number = 30) {
    const integration = await storage.getEmailIntegration(userId, provider);
    if (!integration || !integration.isActive) {
      throw new Error('Email integration not found or inactive');
    }

    // Decrypt tokens
    const decryptedTokens = JSON.parse(
      SecurityManager.decryptSensitiveData(
        integration.encryptedTokens,
        integration.tokenIv,
        integration.tokenTag,
        process.env.ENCRYPTION_KEY || ''
      )
    );

    const receipts = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    if (provider === 'gmail') {
      const gmailReceipts = await this.scanGmailForReceipts(decryptedTokens, cutoffDate);
      receipts.push(...gmailReceipts);
    } else if (provider === 'outlook') {
      const outlookReceipts = await this.scanOutlookForReceipts(decryptedTokens, cutoffDate);
      receipts.push(...outlookReceipts);
    }

    // Process found receipts
    for (const receiptEmail of receipts) {
      await this.processReceiptEmail(userId, receiptEmail);
    }

    // Update last sync
    await storage.updateEmailIntegrationSync(integration.id);

    return {
      scannedEmails: receipts.length,
      newReceipts: receipts.filter(r => r.isNew).length
    };
  }

  private static async scanGmailForReceipts(tokens: any, cutoffDate: Date) {
    const query = this.RECEIPT_KEYWORDS.map(keyword => `"${keyword}"`).join(' OR ');
    const dateFilter = `after:${Math.floor(cutoffDate.getTime() / 1000)}`;
    
    try {
      const response = await axios.get(`${EMAIL_PROVIDERS.gmail.apiUrl}/users/me/messages`, {
        params: {
          q: `(${query}) AND ${dateFilter} AND has:attachment`,
          maxResults: 50
        },
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      });

      const messages = response.data.messages || [];
      const receipts = [];

      for (const message of messages) {
        const emailData = await this.getGmailMessage(tokens, message.id);
        if (this.isReceiptEmail(emailData)) {
          receipts.push({
            id: message.id,
            subject: emailData.subject,
            from: emailData.from,
            date: emailData.date,
            attachments: emailData.attachments,
            body: emailData.body,
            isNew: true
          });
        }
      }

      return receipts;
    } catch (error) {
      console.error('Error scanning Gmail:', error);
      throw new Error('Failed to scan Gmail for receipts');
    }
  }

  private static async scanOutlookForReceipts(tokens: any, cutoffDate: Date) {
    const filterDate = cutoffDate.toISOString();
    
    try {
      const response = await axios.get(`${EMAIL_PROVIDERS.outlook.apiUrl}/me/messages`, {
        params: {
          $filter: `receivedDateTime ge ${filterDate} and hasAttachments eq true`,
          $search: this.RECEIPT_KEYWORDS.join(' OR '),
          $top: 50,
          $select: 'id,subject,from,receivedDateTime,hasAttachments'
        },
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      });

      const messages = response.data.value || [];
      const receipts = [];

      for (const message of messages) {
        if (this.isReceiptEmail(message)) {
          receipts.push({
            id: message.id,
            subject: message.subject,
            from: message.from.emailAddress,
            date: message.receivedDateTime,
            isNew: true
          });
        }
      }

      return receipts;
    } catch (error) {
      console.error('Error scanning Outlook:', error);
      throw new Error('Failed to scan Outlook for receipts');
    }
  }

  private static async getGmailMessage(tokens: any, messageId: string) {
    const response = await axios.get(
      `${EMAIL_PROVIDERS.gmail.apiUrl}/users/me/messages/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      }
    );

    const message = response.data;
    const headers = message.payload.headers;
    
    return {
      subject: headers.find((h: any) => h.name === 'Subject')?.value || '',
      from: headers.find((h: any) => h.name === 'From')?.value || '',
      date: headers.find((h: any) => h.name === 'Date')?.value || '',
      attachments: message.payload.parts?.filter((p: any) => p.filename) || [],
      body: this.extractEmailBody(message.payload)
    };
  }

  private static extractEmailBody(payload: any): string {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          if (part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
      }
    }
    
    return '';
  }

  private static isReceiptEmail(emailData: any): boolean {
    const content = `${emailData.subject} ${emailData.from} ${emailData.body}`.toLowerCase();
    
    const hasReceiptKeyword = this.RECEIPT_KEYWORDS.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    const hasRetailerDomain = [
      'walmart.com', 'target.com', 'kroger.com', 'amazon.com', 
      'costco.com', 'safeway.com', 'homedepot.com', 'lowes.com'
    ].some(domain => content.includes(domain));
    
    return hasReceiptKeyword || hasRetailerDomain;
  }

  private static async processReceiptEmail(userId: number, receiptEmail: any) {
    try {
      // Extract purchase data from email content
      const purchaseData = await this.extractPurchaseDataFromEmail(receiptEmail);
      
      if (purchaseData && purchaseData.items.length > 0) {
        // Create purchase record
        await storage.createPurchaseFromEmail(purchaseData, userId);
        
        // Log the successful processing
        await SecurityManager.logSecurityEvent(userId, 'email_receipt_processed', {
          emailId: receiptEmail.id,
          itemCount: purchaseData.items.length,
          total: purchaseData.total
        });
      }
    } catch (error) {
      console.error('Error processing receipt email:', error);
      // Continue processing other emails even if one fails
    }
  }

  private static async extractPurchaseDataFromEmail(receiptEmail: any) {
    // Use AI to extract structured data from email content
    // This would integrate with your existing OpenAI service
    const extractedData = {
      retailer: this.extractRetailerFromEmail(receiptEmail),
      date: new Date(receiptEmail.date),
      items: [], // Would be extracted using AI/regex
      subtotal: 0,
      tax: 0,
      total: 0
    };

    return extractedData;
  }

  private static extractRetailerFromEmail(receiptEmail: any): string {
    const content = `${receiptEmail.subject} ${receiptEmail.from}`.toLowerCase();
    
    if (content.includes('walmart')) return 'Walmart';
    if (content.includes('target')) return 'Target';
    if (content.includes('kroger')) return 'Kroger';
    if (content.includes('amazon')) return 'Amazon';
    if (content.includes('costco')) return 'Costco';
    
    return 'Unknown';
  }

  // Refresh expired tokens
  static async refreshTokens(userId: number, provider: string) {
    const integration = await storage.getEmailIntegration(userId, provider);
    if (!integration) return;

    const decryptedTokens = JSON.parse(
      SecurityManager.decryptSensitiveData(
        integration.encryptedTokens,
        integration.tokenIv,
        integration.tokenTag,
        process.env.ENCRYPTION_KEY || ''
      )
    );

    if (!decryptedTokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    const providerConfig = EMAIL_PROVIDERS[provider];
    const response = await axios.post(providerConfig.tokenUrl, {
      client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
      client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
      refresh_token: decryptedTokens.refresh_token,
      grant_type: 'refresh_token'
    });

    const newTokens = { ...decryptedTokens, ...response.data };
    const encryptedTokens = SecurityManager.encryptSensitiveData(JSON.stringify(newTokens));

    await storage.updateEmailIntegrationTokens(integration.id, {
      encryptedTokens: encryptedTokens.encrypted,
      tokenIv: encryptedTokens.iv,
      tokenTag: encryptedTokens.tag
    });
  }
}
