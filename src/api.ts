export interface Restaurant {
  _id: string;
  name: string;
  cuisine: string;
  address: string;
  phone?: string;
  ownerId: string;
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

export interface Review {
  _id: string;
  restaurantId: string;
  customerName?: string;
  rating: number;
  reviewText: string;
  source: 'Direct Feedback' | 'Website' | 'CSV Import' | 'API' | 'Other';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  analysis?: ReviewAnalysis | null;
}

export interface OverviewMetrics {
  totalReviews: number;
  positiveCount: number;
  positivePercent: number;
  neutralCount: number;
  neutralPercent: number;
  negativeCount: number;
  negativePercent: number;
  averageRating: number;
}

export interface SentimentTrendPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface AspectMetric {
  aspect: string;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  totalMentions: number;
  positivePercentage: number;
}

export interface IssueMetric {
  _id: string;
  restaurantId: string;
  category: string;
  issue: string;
  mentions: number;
  negativePercentage: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendedAction?: string;
}

export interface RatingDistributionItem {
  rating: number;
  count: number;
  percentage: number;
}

export interface RAGAnswer {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  sources: {
    reviewId: string;
    reviewText: string;
    date: string;
    rating: number;
    sentiment: string;
  }[];
}

const BASE_URL = '/api';

export const api = {
  async getRestaurants(): Promise<Restaurant[]> {
    const res = await fetch(`${BASE_URL}/restaurants`);
    if (!res.ok) throw new Error('Failed to fetch restaurants');
    return res.json();
  },

  async getReviews(params?: {
    restaurantId?: string;
    page?: number;
    limit?: number;
    sentiment?: string;
    rating?: number;
    source?: string;
    search?: string;
  }): Promise<{ data: Review[]; pagination: { page: number; limit: number; totalCount: number; totalPages: number } }> {
    const q = new URLSearchParams();
    if (params?.restaurantId) q.set('restaurantId', params.restaurantId);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.sentiment && params.sentiment !== 'all') q.set('sentiment', params.sentiment);
    if (params?.rating) q.set('rating', String(params.rating));
    if (params?.source && params.source !== 'all') q.set('source', params.source);
    if (params?.search) q.set('search', params.search);

    const res = await fetch(`${BASE_URL}/reviews?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async getReview(id: string): Promise<Review> {
    const res = await fetch(`${BASE_URL}/reviews/${id}`);
    if (!res.ok) throw new Error('Failed to fetch review');
    return res.json();
  },

  async deleteReview(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/reviews/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete review');
    return res.json();
  },

  async reanalyzeReview(id: string): Promise<ReviewAnalysis> {
    const res = await fetch(`${BASE_URL}/reviews/${id}/reanalyze`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reanalyze review');
    return res.json();
  },

  async processPendingReviews(restaurantId: string): Promise<{ processed: number }> {
    const res = await fetch(`${BASE_URL}/reviews/process-pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    });
    if (!res.ok) throw new Error('Failed to process reviews');
    return res.json();
  },

  async getOverview(restaurantId: string): Promise<OverviewMetrics> {
    const res = await fetch(`${BASE_URL}/analytics/overview?restaurantId=${restaurantId}`);
    if (!res.ok) throw new Error('Failed to fetch overview');
    return res.json();
  },

  async getSentimentTrends(restaurantId: string, days = 30): Promise<SentimentTrendPoint[]> {
    const res = await fetch(`${BASE_URL}/analytics/sentiment?restaurantId=${restaurantId}&days=${days}`);
    if (!res.ok) throw new Error('Failed to fetch sentiment trends');
    return res.json();
  },

  async getAspectMetrics(restaurantId: string): Promise<AspectMetric[]> {
    const res = await fetch(`${BASE_URL}/analytics/aspects?restaurantId=${restaurantId}`);
    if (!res.ok) throw new Error('Failed to fetch aspects');
    return res.json();
  },

  async getIssueMetrics(restaurantId: string): Promise<IssueMetric[]> {
    const res = await fetch(`${BASE_URL}/analytics/issues?restaurantId=${restaurantId}`);
    if (!res.ok) throw new Error('Failed to fetch issues');
    return res.json();
  },

  async getRatingDistribution(restaurantId: string): Promise<RatingDistributionItem[]> {
    const res = await fetch(`${BASE_URL}/analytics/ratings?restaurantId=${restaurantId}`);
    if (!res.ok) throw new Error('Failed to fetch rating distribution');
    return res.json();
  },

  async askReviews(restaurantId: string, question: string): Promise<RAGAnswer> {
    const res = await fetch(`${BASE_URL}/rag/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId, question }),
    });
    if (!res.ok) throw new Error('Failed to query reviews');
    return res.json();
  },
};
