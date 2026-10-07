import fs from 'fs';
import path from 'path';

export interface Restaurant {
  _id: string;
  name: string;
  cuisine: string;
  address: string;
  phone?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  restaurantId: string;
  customerName?: string;
  rating: number; // 1-5
  reviewText: string;
  source: 'Direct Feedback' | 'Website' | 'CSV Import' | 'API' | 'Other';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface ReviewAnalysis {
  _id: string;
  reviewId: string;
  restaurantId: string;
  overallSentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentimentScore: number;
  aspects: {
    aspect: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    evidence: string;
  }[];
  issues: {
    category: string;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendedAction?: string;
    evidence?: string;
  }[];
  summary: string;
  analyzedAt: string;
}

export interface IssueRecord {
  _id: string;
  restaurantId: string;
  category: string;
  issue: string;
  mentions: number;
  negativePercentage: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendedAction?: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
}

export const SEED_RESTAURANT: Restaurant = {
  _id: 'rest_bellavista_001',
  name: 'Bella Vista Trattoria & Pizzeria',
  cuisine: 'Artisanal Italian & Wood-Fired Pizza',
  address: '452 Columbus Ave, San Francisco, CA 94133',
  phone: '(415) 555-0192',
  ownerId: 'user_owner_001',
  createdAt: '2026-07-01T08:00:00.000Z',
  updatedAt: '2026-07-01T08:00:00.000Z',
};

export function getDefaultActionForIssue(issue: string): string {
  const lower = (issue || '').toLowerCase();
  if (lower.includes('wait') || lower.includes('delay') || lower.includes('time')) {
    return 'Review order preparation and serving workflow during peak hours. Consider evaluating kitchen ticket pacing and staff allocation to reduce customer waiting time.';
  }
  if (lower.includes('cold') || lower.includes('temp')) {
    return 'Reduce the time between food preparation and serving and introduce a final temperature check before serving.';
  }
  if (lower.includes('staff') || lower.includes('rude') || lower.includes('attentive') || lower.includes('unfriendly')) {
    return 'Conduct a staff floor briefing on hospitality standards, active table check-ins, and polite guest communication.';
  }
  if (lower.includes('service') || lower.includes('slow')) {
    return 'Review the service workflow during peak hours and consider improving staff allocation or order processing.';
  }
  if (lower.includes('price') || lower.includes('expensive') || lower.includes('value')) {
    return 'Review pricing and value perception. Consider improving portion/value or introducing suitable combo offers.';
  }
  if (lower.includes('clean') || lower.includes('hygiene') || lower.includes('dirty')) {
    return 'Increase cleaning frequency and introduce regular checks for dining and service areas.';
  }
  if (lower.includes('taste') || lower.includes('flavor') || lower.includes('quality') || lower.includes('cook')) {
    return 'Review food preparation consistency, ingredient quality, and kitchen quality-control procedures.';
  }
  if (lower.includes('packag') || lower.includes('deliver')) {
    return 'Review packaging quality and ensure food remains secure and suitable during transport.';
  }
  return 'Review operational workflow and monitor customer feedback to address this issue and prevent recurrence.';
}

export function synthesizeRecurringAction(issue: string, mentions: number): string {
  const lower = issue.toLowerCase();
  if (mentions >= 2) {
    if (lower.includes('wait') || lower.includes('delay') || lower.includes('time')) {
      return 'Customers are repeatedly mentioning long waiting times. Review peak-hour service and order-processing workflows, identify bottlenecks, and evaluate whether additional staff allocation could reduce waiting time.';
    }
    if (lower.includes('service') || lower.includes('slow')) {
      return 'Customers are repeatedly mentioning slow service during busy shifts. Review peak-hour service workflow and identify bottlenecks that may be causing delays.';
    }
    if (lower.includes('cold') || lower.includes('temp')) {
      return 'Multiple customers are mentioning food temperature. Review the time between preparation and serving and consider adding a temperature check before dishes leave the kitchen.';
    }
    if (lower.includes('staff') || lower.includes('attentive') || lower.includes('rude')) {
      return 'Multiple customers have reported inattentive staff interactions during peak rushes. Provide staff-service training and monitor customer feedback regarding staff interactions.';
    }
    if (lower.includes('price') || lower.includes('expensive')) {
      return 'Several customers have expressed concern regarding pricing. Review pricing and value perception. Consider improving portion/value or introducing suitable combo offers.';
    }
    if (lower.includes('clean') || lower.includes('hygiene')) {
      return 'Multiple reviews mention dining room hygiene concerns. Increase cleaning frequency and introduce regular checks for dining and service areas.';
    }
    if (lower.includes('packag') || lower.includes('deliver')) {
      return 'Customers frequently report delivery packaging concerns. Review packaging quality and ensure food remains secure and suitable during transport.';
    }
    return `Customers are repeatedly noting issues regarding ${issue}. Review operational workflows during busy periods and evaluate procedures to address this pattern.`;
  }
  return getDefaultActionForIssue(issue);
}

interface DatabaseSchema {
  restaurants: Restaurant[];
  reviews: Review[];
  review_analysis: ReviewAnalysis[];
  issues: IssueRecord[];
}

class Database {
  private dataDir = path.resolve(process.cwd(), 'data');
  private dbFilePath = path.join(this.dataDir, 'database.json');
  private state: DatabaseSchema = {
    restaurants: [SEED_RESTAURANT],
    reviews: [],
    review_analysis: [],
    issues: [],
  };
  private isInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.reviews) && parsed.reviews.length > 0) {
          this.state = parsed;
          if (!this.state.restaurants || this.state.restaurants.length === 0) {
            this.state.restaurants = [SEED_RESTAURANT];
          }
          this.recomputeIssues(SEED_RESTAURANT._id);
          this.isInitialized = true;
          return;
        }
      }

      // If database file is missing or empty, seed initial baseline
      this.state.restaurants = [SEED_RESTAURANT];
      this.isInitialized = true;
      this.saveToFile();
    } catch (err) {
      console.warn('Database initialization warning, using in-memory state:', err);
      this.state.restaurants = [SEED_RESTAURANT];
      this.isInitialized = true;
    }
  }

  public saveToFile(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not save database to disk:', e);
    }
  }

  public recomputeIssues(restaurantId: string): void {
    const analyses = this.state.review_analysis.filter((a) => a.restaurantId === restaurantId);
    const reviewsMap = new Map<string, Review>();
    this.state.reviews.forEach((r) => reviewsMap.set(r._id, r));

    const issueStats = new Map<
      string,
      {
        category: string;
        issue: string;
        mentions: number;
        negativeCount: number;
        severities: string[];
        dates: string[];
      }
    >();

    analyses.forEach((ana) => {
      const rev = reviewsMap.get(ana.reviewId);
      const revDate = rev ? rev.createdAt : ana.analyzedAt;

      ana.issues.forEach((iss) => {
        const key = (iss.issue || iss.category || 'General').toLowerCase().trim();
        const existing = issueStats.get(key) || {
          category: iss.category || 'General',
          issue: iss.issue || iss.category,
          mentions: 0,
          negativeCount: 0,
          severities: [],
          dates: [],
        };

        existing.mentions += 1;
        if (ana.overallSentiment === 'negative' || ana.overallSentiment === 'mixed') {
          existing.negativeCount += 1;
        }
        existing.severities.push(iss.severity);
        existing.dates.push(revDate);
        issueStats.set(key, existing);
      });
    });

    const calculatedIssues: IssueRecord[] = [];
    issueStats.forEach((stat, key) => {
      let priority: IssueRecord['priority'] = 'low';
      if (stat.severities.includes('critical')) priority = 'critical';
      else if (stat.severities.includes('high')) priority = 'high';
      else if (stat.severities.includes('medium')) priority = 'medium';

      stat.dates.sort();
      const firstDetectedAt = stat.dates[0] || new Date().toISOString();
      const lastDetectedAt = stat.dates[stat.dates.length - 1] || new Date().toISOString();

      let trend: IssueRecord['trend'] = 'stable';
      if (stat.mentions >= 3) {
        trend = 'increasing';
      }

      const issueTitle = stat.issue
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const negPct = stat.mentions > 0 ? Math.round((stat.negativeCount / stat.mentions) * 100) : 100;

      calculatedIssues.push({
        _id: `iss_${restaurantId}_${key.replace(/\s+/g, '_')}`,
        restaurantId,
        category: stat.category,
        issue: issueTitle,
        mentions: stat.mentions,
        negativePercentage: negPct,
        priority,
        trend,
        recommendedAction: synthesizeRecurringAction(issueTitle, stat.mentions),
        firstDetectedAt,
        lastDetectedAt,
      });
    });

    calculatedIssues.sort((a, b) => b.mentions - a.mentions);

    this.state.issues = this.state.issues
      .filter((i) => i.restaurantId !== restaurantId)
      .concat(calculatedIssues);

    this.saveToFile();
  }

  // --- Collection methods ---
  public get restaurants() {
    return {
      find: async () => this.state.restaurants,
      findById: async (id: string) => this.state.restaurants.find((r) => r._id === id) || null,
    };
  }

  public get reviews() {
    return {
      find: async (filter?: {
        restaurantId?: string;
        rating?: number;
        source?: string;
        search?: string;
        sentiment?: string;
        startDate?: string;
        endDate?: string;
      }) => {
        let results = [...this.state.reviews];
        if (filter?.restaurantId) {
          results = results.filter((r) => r.restaurantId === filter.restaurantId);
        }
        if (filter?.rating) {
          results = results.filter((r) => r.rating === filter.rating);
        }
        if (filter?.source && filter.source !== 'all') {
          results = results.filter((r) => r.source === filter.source);
        }
        if (filter?.startDate) {
          const start = new Date(filter.startDate).getTime();
          results = results.filter((r) => new Date(r.createdAt).getTime() >= start);
        }
        if (filter?.endDate) {
          const end = new Date(filter.endDate).getTime();
          results = results.filter((r) => new Date(r.createdAt).getTime() <= end);
        }
        if (filter?.search) {
          const term = filter.search.toLowerCase();
          results = results.filter(
            (r) =>
              r.reviewText.toLowerCase().includes(term) ||
              (r.customerName && r.customerName.toLowerCase().includes(term))
          );
        }
        if (filter?.sentiment && filter.sentiment !== 'all') {
          const matchingAnalyses = new Set(
            this.state.review_analysis
              .filter((a) => a.overallSentiment === filter.sentiment)
              .map((a) => a.reviewId)
          );
          results = results.filter((r) => matchingAnalyses.has(r._id));
        }

        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return results;
      },
      findById: async (id: string) => this.state.reviews.find((r) => r._id === id) || null,
      insertOne: async (doc: Review) => {
        this.state.reviews.unshift(doc);
        this.saveToFile();
        return doc;
      },
      updateOne: async (id: string, update: Partial<Review>) => {
        const idx = this.state.reviews.findIndex((r) => r._id === id);
        if (idx >= 0) {
          this.state.reviews[idx] = { ...this.state.reviews[idx], ...update, updatedAt: new Date().toISOString() };
          this.saveToFile();
          return this.state.reviews[idx];
        }
        return null;
      },
      deleteOne: async (id: string) => {
        const before = this.state.reviews.length;
        this.state.reviews = this.state.reviews.filter((r) => r._id !== id);
        this.state.review_analysis = this.state.review_analysis.filter((a) => a.reviewId !== id);
        this.saveToFile();
        return before !== this.state.reviews.length;
      },
    };
  }

  public get review_analysis() {
    return {
      find: async (query?: { restaurantId?: string; reviewId?: string }) => {
        let results = [...this.state.review_analysis];
        if (query?.restaurantId) results = results.filter((a) => a.restaurantId === query.restaurantId);
        if (query?.reviewId) results = results.filter((a) => a.reviewId === query.reviewId);
        return results;
      },
      findByReviewId: async (reviewId: string) =>
        this.state.review_analysis.find((a) => a.reviewId === reviewId) || null,
      insertOne: async (doc: ReviewAnalysis) => {
        this.state.review_analysis = this.state.review_analysis.filter((a) => a.reviewId !== doc.reviewId);
        this.state.review_analysis.push(doc);
        this.saveToFile();
        return doc;
      },
    };
  }

  public get issues() {
    return {
      find: async (query?: { restaurantId?: string }) => {
        if (!query?.restaurantId) return this.state.issues;
        return this.state.issues.filter((i) => i.restaurantId === query.restaurantId);
      },
    };
  }
}

export const db = new Database();
