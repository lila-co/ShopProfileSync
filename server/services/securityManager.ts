import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from '../storage';

export class SecurityManager {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;

  // Password Security
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Data Encryption
  static encryptSensitiveData(data: string, key?: string): { encrypted: string; iv: string; tag: string } {
    const encryptionKey = key ? Buffer.from(key, 'hex') : crypto.randomBytes(this.KEY_LENGTH);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ENCRYPTION_ALGORITHM, encryptionKey);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    };
  }

  static decryptSensitiveData(encryptedData: string, iv: string, tag: string, key: string): string {
    const encryptionKey = Buffer.from(key, 'hex');
    const decipher = crypto.createDecipher(this.ENCRYPTION_ALGORITHM, encryptionKey);
    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Data Anonymization
  static anonymizeUserData(userData: any): any {
    return {
      ...userData,
      email: this.maskEmail(userData.email),
      firstName: this.maskName(userData.firstName),
      lastName: this.maskName(userData.lastName),
      phone: userData.phone ? this.maskPhone(userData.phone) : null,
      address: userData.address ? this.maskAddress(userData.address) : null
    };
  }

  private static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }

  private static maskName(name: string): string {
    return name.charAt(0) + '*'.repeat(name.length - 1);
  }

  private static maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
  }

  private static maskAddress(address: string): string {
    // Mask street number and name, keep city/state
    return address.replace(/^\d+\s+\w+.*?(?=,)/, '*** *** ***');
  }

  // Audit Logging
  static async logSecurityEvent(userId: number, action: string, details: any, ipAddress?: string): Promise<void> {
    const logEntry = {
      userId,
      action,
      details: JSON.stringify(details),
      ipAddress,
      timestamp: new Date(),
      severity: this.determineSeverity(action)
    };

    // Store in security audit log
    await storage.createSecurityLog(logEntry);
  }

  private static determineSeverity(action: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const highRiskActions = ['login_failed', 'password_changed', 'admin_access'];
    const criticalActions = ['data_export', 'account_deleted', 'permission_escalation'];

    if (criticalActions.includes(action)) return 'CRITICAL';
    if (highRiskActions.includes(action)) return 'HIGH';
    return 'MEDIUM';
  }

  // GDPR/CCPA Compliance
  static async exportUserData(userId: number): Promise<any> {
    const userData = await storage.getCompleteUserData(userId);

    return {
      personal_information: this.anonymizeUserData(userData.profile),
      purchase_history: userData.purchases,
      shopping_lists: userData.shoppingLists,
      preferences: userData.preferences,
      export_date: new Date().toISOString(),
      retention_period: '7 years from last activity'
    };
  }

  static async deleteUserData(userId: number, retainAnalytics: boolean = true): Promise<void> {
    if (retainAnalytics) {
      // Anonymize but retain for analytics
      await storage.anonymizeUserData(userId);
    } else {
      // Complete deletion
      await storage.deleteAllUserData(userId);
    }

    await this.logSecurityEvent(userId, 'data_deletion', { retainAnalytics });
  }

  // Session Security
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async validateSession(token: string, userId: number): Promise<boolean> {
    // Implement session validation logic
    const session = await storage.getSession(token);
    return session && session.userId === userId && !this.isSessionExpired(session);
  }

  private static isSessionExpired(session: any): boolean {
    const now = new Date();
    const sessionExpiry = new Date(session.createdAt);
    sessionExpiry.setHours(sessionExpiry.getHours() + 24); // 24-hour sessions
    return now > sessionExpiry;
  }
}