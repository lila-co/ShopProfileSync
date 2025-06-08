
import { ProductCategorizerService } from './productCategorizer.js';

export interface LearningData {
  productName: string;
  userCorrectedCategory: string;
  confidence: number;
  timestamp: Date;
  userId: number;
  context?: {
    previousPurchases: string[];
    seasonalPattern: boolean;
    locationBased: boolean;
  };
}

export interface CategoryPattern {
  keywords: string[];
  category: string;
  weight: number;
  learnedFrom: number; // number of corrections that created this pattern
  accuracy: number;
  lastUpdated: Date;
}

export class MLCategorizerService {
  private learningData: LearningData[] = [];
  private dynamicPatterns: Map<string, CategoryPattern[]> = new Map();
  private productFrequency: Map<string, { category: string; count: number; confidence: number }> = new Map();
  private userCorrectionHistory: Map<number, LearningData[]> = new Map();

  constructor(private baseCategorizerService: ProductCategorizerService) {
    this.initializeFromStorage();
  }

  // Learn from user corrections
  async learnFromCorrection(
    productName: string,
    originalCategory: string,
    correctedCategory: string,
    userId: number,
    confidence: number = 1.0
  ): Promise<void> {
    const learningEntry: LearningData = {
      productName: productName.toLowerCase().trim(),
      userCorrectedCategory: correctedCategory,
      confidence,
      timestamp: new Date(),
      userId,
      context: await this.gatherContext(productName, userId)
    };

    this.learningData.push(learningEntry);
    
    // Update user-specific correction history
    if (!this.userCorrectionHistory.has(userId)) {
      this.userCorrectionHistory.set(userId, []);
    }
    this.userCorrectionHistory.get(userId)!.push(learningEntry);

    // Update product frequency tracking
    this.updateProductFrequency(productName, correctedCategory);

    // Generate new patterns from this correction
    await this.generatePatternsFromCorrection(learningEntry);

    // Persist learning data
    await this.persistLearningData();

    console.log(`🧠 ML Categorizer learned: "${productName}" should be "${correctedCategory}" (confidence: ${confidence})`);
  }

  // Enhanced categorization that combines base logic with learned patterns
  async categorizeWithLearning(productName: string, userId?: number): Promise<{
    category: any;
    confidence: number;
    source: 'learned' | 'pattern' | 'base' | 'frequency';
    explanation: string;
  }> {
    const normalizedName = productName.toLowerCase().trim();

    // 1. Check exact learned matches first (highest priority)
    const exactMatch = this.findExactLearnedMatch(normalizedName);
    if (exactMatch && exactMatch.confidence > 0.8) {
      const category = this.baseCategorizerService.getCategoryDefaults(exactMatch.category);
      return {
        category: { ...category, category: exactMatch.category },
        confidence: exactMatch.confidence,
        source: 'learned',
        explanation: `Learned from ${exactMatch.count} user corrections`
      };
    }

    // 2. Check dynamic patterns learned from corrections
    const patternMatch = this.findBestPatternMatch(normalizedName);
    if (patternMatch && patternMatch.accuracy > 0.7) {
      const category = this.baseCategorizerService.getCategoryDefaults(patternMatch.category);
      return {
        category: { ...category, category: patternMatch.category },
        confidence: patternMatch.accuracy,
        source: 'pattern',
        explanation: `Matched learned pattern (${patternMatch.learnedFrom} corrections)`
      };
    }

    // 3. Check frequency-based learning for similar products
    const frequencyMatch = this.findFrequencyMatch(normalizedName);
    if (frequencyMatch && frequencyMatch.confidence > 0.6) {
      const category = this.baseCategorizerService.getCategoryDefaults(frequencyMatch.category);
      return {
        category: { ...category, category: frequencyMatch.category },
        confidence: frequencyMatch.confidence,
        source: 'frequency',
        explanation: `Based on similar product categorizations`
      };
    }

    // 4. Fall back to base categorization
    const baseCategory = this.baseCategorizerService.categorizeProduct(productName);
    return {
      category: baseCategory,
      confidence: baseCategory.confidence,
      source: 'base',
      explanation: 'Using base categorization rules'
    };
  }

  // Find exact matches from learned data
  private findExactLearnedMatch(productName: string): { category: string; confidence: number; count: number } | null {
    const match = this.productFrequency.get(productName);
    if (match && match.count >= 2) { // Require at least 2 corrections for reliability
      return match;
    }
    return null;
  }

  // Find best pattern match from dynamic patterns
  private findBestPatternMatch(productName: string): CategoryPattern | null {
    let bestMatch: CategoryPattern | null = null;
    let bestScore = 0;

    for (const patterns of this.dynamicPatterns.values()) {
      for (const pattern of patterns) {
        const score = this.calculatePatternScore(productName, pattern);
        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = pattern;
        }
      }
    }

    return bestMatch;
  }

  // Calculate how well a product matches a learned pattern
  private calculatePatternScore(productName: string, pattern: CategoryPattern): number {
    const words = productName.split(/\s+/);
    let matchedKeywords = 0;
    let totalWeight = 0;

    for (const keyword of pattern.keywords) {
      const keywordWeight = 1 / pattern.keywords.length;
      totalWeight += keywordWeight;

      if (words.some(word => word.includes(keyword) || keyword.includes(word))) {
        matchedKeywords += keywordWeight;
      }
    }

    const rawScore = matchedKeywords / totalWeight;
    // Weight by pattern accuracy and learning frequency
    return rawScore * pattern.accuracy * Math.min(pattern.weight, 2.0);
  }

  // Find similar products based on frequency data
  private findFrequencyMatch(productName: string): { category: string; confidence: number } | null {
    const words = productName.split(/\s+/).filter(w => w.length > 2);
    const categoryScores: Map<string, { score: number; count: number }> = new Map();

    for (const [learnedProduct, data] of this.productFrequency) {
      const similarity = this.calculateSimilarity(productName, learnedProduct);
      if (similarity > 0.4) {
        const existing = categoryScores.get(data.category) || { score: 0, count: 0 };
        categoryScores.set(data.category, {
          score: existing.score + similarity * data.confidence,
          count: existing.count + data.count
        });
      }
    }

    let bestCategory = '';
    let bestScore = 0;
    for (const [category, data] of categoryScores) {
      const weightedScore = data.score * Math.log(data.count + 1);
      if (weightedScore > bestScore) {
        bestScore = weightedScore;
        bestCategory = category;
      }
    }

    return bestScore > 0.3 ? { category: bestCategory, confidence: Math.min(bestScore, 0.9) } : null;
  }

  // Generate new patterns from user corrections
  private async generatePatternsFromCorrection(correction: LearningData): Promise<void> {
    const words = correction.productName.split(/\s+/).filter(w => w.length > 2);
    const category = correction.userCorrectedCategory;

    if (!this.dynamicPatterns.has(category)) {
      this.dynamicPatterns.set(category, []);
    }

    // Create patterns from significant words
    const significantWords = words.filter(word => 
      !['the', 'and', 'or', 'with', 'for', 'of', 'in', 'on', 'at'].includes(word)
    );

    if (significantWords.length > 0) {
      const existingPattern = this.dynamicPatterns.get(category)!.find(p => 
        p.keywords.some(k => significantWords.includes(k))
      );

      if (existingPattern) {
        // Update existing pattern
        existingPattern.keywords = [...new Set([...existingPattern.keywords, ...significantWords])];
        existingPattern.learnedFrom += 1;
        existingPattern.weight = Math.min(existingPattern.weight + 0.1, 2.0);
        existingPattern.lastUpdated = new Date();
        // Improve accuracy with more data
        existingPattern.accuracy = Math.min(existingPattern.accuracy + 0.05, 0.95);
      } else {
        // Create new pattern
        const newPattern: CategoryPattern = {
          keywords: significantWords,
          category,
          weight: 1.0,
          learnedFrom: 1,
          accuracy: 0.7, // Start with moderate confidence
          lastUpdated: new Date()
        };
        this.dynamicPatterns.get(category)!.push(newPattern);
      }
    }
  }

  // Update product frequency tracking
  private updateProductFrequency(productName: string, category: string): void {
    const normalizedName = productName.toLowerCase().trim();
    const existing = this.productFrequency.get(normalizedName);

    if (existing) {
      if (existing.category === category) {
        existing.count += 1;
        existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
      } else {
        // Category conflict - reduce confidence and update if enough evidence
        existing.confidence -= 0.2;
        if (existing.confidence < 0.3) {
          existing.category = category;
          existing.count = 1;
          existing.confidence = 0.6;
        }
      }
    } else {
      this.productFrequency.set(normalizedName, {
        category,
        count: 1,
        confidence: 0.7
      });
    }
  }

  // Gather context for better learning
  private async gatherContext(productName: string, userId: number): Promise<any> {
    const userHistory = this.userCorrectionHistory.get(userId) || [];
    const recentCorrections = userHistory.slice(-10).map(h => h.userCorrectedCategory);
    
    return {
      previousPurchases: [...new Set(recentCorrections)],
      seasonalPattern: this.isSeasonalProduct(productName),
      locationBased: false // Could be enhanced with store location data
    };
  }

  // Simple seasonal detection
  private isSeasonalProduct(productName: string): boolean {
    const seasonalKeywords = [
      'pumpkin', 'halloween', 'christmas', 'valentine', 'easter', 
      'summer', 'winter', 'spring', 'fall', 'holiday'
    ];
    return seasonalKeywords.some(keyword => 
      productName.toLowerCase().includes(keyword)
    );
  }

  // Calculate string similarity (Jaro-Winkler-like)
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(str1, str2);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Persistence methods
  private async persistLearningData(): Promise<void> {
    // In a real implementation, this would save to database
    // For now, we'll use in-memory storage with periodic saves
    console.log(`💾 Persisting ${this.learningData.length} learning entries`);
  }

  private initializeFromStorage(): void {
    // In a real implementation, this would load from database
    // For now, initialize empty
    console.log('🚀 ML Categorizer initialized');
  }

  // Analytics and insights
  getCategoryAccuracy(): Record<string, { accuracy: number; corrections: number; coverage: number }> {
    const stats: Record<string, { correct: number; total: number; coverage: number }> = {};

    for (const entry of this.learningData) {
      const category = entry.userCorrectedCategory;
      if (!stats[category]) {
        stats[category] = { correct: 0, total: 0, coverage: 0 };
      }
      stats[category].total += 1;
      if (entry.confidence > 0.8) {
        stats[category].correct += 1;
      }
    }

    const result: Record<string, { accuracy: number; corrections: number; coverage: number }> = {};
    for (const [category, data] of Object.entries(stats)) {
      result[category] = {
        accuracy: data.total > 0 ? data.correct / data.total : 0,
        corrections: data.total,
        coverage: this.dynamicPatterns.get(category)?.length || 0
      };
    }

    return result;
  }

  // Get learning insights for admin dashboard
  getLearningInsights(): {
    totalCorrections: number;
    categoriesLearned: number;
    patternsGenerated: number;
    topImprovedCategories: Array<{ category: string; improvement: number }>;
  } {
    const totalPatterns = Array.from(this.dynamicPatterns.values())
      .reduce((sum, patterns) => sum + patterns.length, 0);

    return {
      totalCorrections: this.learningData.length,
      categoriesLearned: this.dynamicPatterns.size,
      patternsGenerated: totalPatterns,
      topImprovedCategories: [] // Could be calculated from accuracy improvements
    };
  }
}

export const mlCategorizer = new MLCategorizerService(new ProductCategorizerService());
