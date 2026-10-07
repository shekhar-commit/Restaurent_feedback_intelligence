import { Router, Request, Response } from 'express';
import { db, Review, ReviewAnalysis } from './database.js';
import { analyzeReview, getEmbedding, vectorStore, askReviews } from './ai.js';

export const routes = Router();

// --- Health ---
routes.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', time: new Date().toISOString() });
});

// --- Restaurants ---
routes.get('/restaurants', async (_req: Request, res: Response) => {
  const rests = await db.restaurants.find();
  res.json(rests);
});

// --- Reviews ---
routes.get('/reviews', async (req: Request, res: Response) => {
  const restaurantId = (req.query.restaurantId as string) || 'rest_bellavista_001';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const sentiment = req.query.sentiment as string;
  const rating = req.query.rating ? Number(req.query.rating) : undefined;
  const source = req.query.source as string;
  const search = req.query.search as string;

  const allFiltered = await db.reviews.find({
    restaurantId,
    sentiment,
    rating,
    source,
    search,
  });

  const totalCount = allFiltered.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const paginated = allFiltered.slice((page - 1) * limit, page * limit);

  // Attach analysis to each review
  const analyses = await db.review_analysis.find({ restaurantId });
  const map = new Map<string, ReviewAnalysis>();
  analyses.forEach((a) => map.set(a.reviewId, a));

  const data = paginated.map((r) => ({
    ...r,
    analysis: map.get(r._id) || null,
  }));

  res.json({
    data,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  });
});

routes.get('/reviews/:id', async (req: Request, res: Response) => {
  const review = await db.reviews.findById(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  const analysis = await db.review_analysis.findByReviewId(review._id);
  res.json({ ...review, analysis });
});

routes.post('/reviews', async (req: Request, res: Response) => {
  try {
    const { restaurantId = 'rest_bellavista_001', customerName, rating, reviewText, source = 'Direct Feedback' } = req.body;

    if (!reviewText || typeof reviewText !== 'string' || reviewText.trim().length === 0) {
      return res.status(400).json({ error: 'Review text is required' });
    }

    const starRating = Math.max(1, Math.min(5, Number(rating) || 3));
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const reviewDoc: Review = {
      _id: reviewId,
      restaurantId,
      customerName: customerName || 'Anonymous Guest',
      rating: starRating,
      reviewText: reviewText.trim(),
      source,
      status: 'completed',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.reviews.insertOne(reviewDoc);

    // AI Analysis
    const aiResult = await analyzeReview(reviewDoc.reviewText, reviewDoc.rating);
    const analysisDoc: ReviewAnalysis = {
      _id: `ana_${reviewId}`,
      reviewId,
      restaurantId,
      overallSentiment: aiResult.overallSentiment,
      sentimentScore: aiResult.sentimentScore,
      aspects: aiResult.aspects,
      issues: aiResult.issues,
      summary: aiResult.summary,
      analyzedAt: nowIso,
    };

    await db.review_analysis.insertOne(analysisDoc);

    // Vector Embedding
    try {
      const emb = await getEmbedding(reviewDoc.reviewText);
      vectorStore.upsert({
        reviewId,
        restaurantId,
        embedding: emb,
        text: reviewDoc.reviewText,
        sentiment: analysisDoc.overallSentiment,
        rating: reviewDoc.rating,
        date: reviewDoc.createdAt,
      });
    } catch (e) {
      console.warn('Vector upsert warning:', e);
    }

    // Recompute recurring issues
    db.recomputeIssues(restaurantId);

    res.status(201).json({
      review: reviewDoc,
      analysis: analysisDoc,
      status: 'completed',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process review' });
  }
});

routes.delete('/reviews/:id', async (req: Request, res: Response) => {
  const deleted = await db.reviews.deleteOne(req.params.id);
  res.json({ success: deleted });
});

routes.post('/reviews/:id/reanalyze', async (req: Request, res: Response) => {
  const review = await db.reviews.findById(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  const aiResult = await analyzeReview(review.reviewText, review.rating);
  const analysisDoc: ReviewAnalysis = {
    _id: `ana_${review._id}`,
    reviewId: review._id,
    restaurantId: review.restaurantId,
    overallSentiment: aiResult.overallSentiment,
    sentimentScore: aiResult.sentimentScore,
    aspects: aiResult.aspects,
    issues: aiResult.issues,
    summary: aiResult.summary,
    analyzedAt: new Date().toISOString(),
  };

  await db.review_analysis.insertOne(analysisDoc);
  db.recomputeIssues(review.restaurantId);
  res.json(analysisDoc);
});

routes.post('/reviews/process-pending', async (req: Request, res: Response) => {
  const restaurantId = (req.body.restaurantId as string) || 'rest_bellavista_001';
  const reviews = await db.reviews.find({ restaurantId });
  let processed = 0;

  for (const r of reviews) {
    const existing = await db.review_analysis.findByReviewId(r._id);
    if (!existing) {
      const aiResult = await analyzeReview(r.reviewText, r.rating);
      await db.review_analysis.insertOne({
        _id: `ana_${r._id}`,
        reviewId: r._id,
        restaurantId: r.restaurantId,
        overallSentiment: aiResult.overallSentiment,
        sentimentScore: aiResult.sentimentScore,
        aspects: aiResult.aspects,
        issues: aiResult.issues,
        summary: aiResult.summary,
        analyzedAt: new Date().toISOString(),
      });
      processed++;
    }
  }

  if (processed > 0) db.recomputeIssues(restaurantId);
  res.json({ processed });
});

// --- Analytics ---
routes.get('/analytics/overview', async (req: Request, res: Response) => {
  const restaurantId = (req.query.restaurantId as string) || 'rest_bellavista_001';
  const reviews = await db.reviews.find({ restaurantId });
  const analyses = await db.review_analysis.find({ restaurantId });
  const analysisMap = new Map<string, ReviewAnalysis>();
  analyses.forEach((a) => analysisMap.set(a.reviewId, a));

  const total = reviews.length;
  if (total === 0) {
    return res.json({
      totalReviews: 0,
      positiveCount: 0,
      positivePercent: 0,
      neutralCount: 0,
      neutralPercent: 0,
      negativeCount: 0,
      negativePercent: 0,
      averageRating: 0,
    });
  }

  let pos = 0;
  let neu = 0;
  let neg = 0;
  let sumRating = 0;

  reviews.forEach((r) => {
    sumRating += r.rating;
    const a = analysisMap.get(r._id);
    const sentiment = a ? a.overallSentiment : r.rating >= 4 ? 'positive' : r.rating <= 2 ? 'negative' : 'neutral';
    if (sentiment === 'positive') pos++;
    else if (sentiment === 'negative' || sentiment === 'mixed') neg++;
    else neu++;
  });

  res.json({
    totalReviews: total,
    positiveCount: pos,
    positivePercent: Math.round((pos / total) * 100),
    neutralCount: neu,
    neutralPercent: Math.round((neu / total) * 100),
    negativeCount: neg,
    negativePercent: Math.round((neg / total) * 100),
    averageRating: Number((sumRating / total).toFixed(1)),
  });
});

routes.get('/analytics/sentiment', async (req: Request, res: Response) => {
  const restaurantId = (req.query.restaurantId as string) || 'rest_bellavista_001';
  const days = Math.max(7, Math.min(90, Number(req.query.days) || 30));
  const reviews = await db.reviews.find({ restaurantId });
  const analyses = await db.review_analysis.find({ restaurantId });
  const analysisMap = new Map<string, ReviewAnalysis>();
  analyses.forEach((a) => analysisMap.set(a.reviewId, a));

  const now = Date.now();
  const dateMap = new Map<string, { positive: number; neutral: number; negative: number; total: number }>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(5, 10); // MM-DD
    dateMap.set(key, { positive: 0, neutral: 0, negative: 0, total: 0 });
  }

  const cutoff = now - days * 24 * 60 * 60 * 1000;
  reviews.forEach((r) => {
    const t = new Date(r.createdAt).getTime();
    if (t >= cutoff) {
      const key = r.createdAt.slice(5, 10);
      const bucket = dateMap.get(key) || { positive: 0, neutral: 0, negative: 0, total: 0 };
      const a = analysisMap.get(r._id);
      const s = a ? a.overallSentiment : r.rating >= 4 ? 'positive' : r.rating <= 2 ? 'negative' : 'neutral';
      if (s === 'positive') bucket.positive++;
      else if (s === 'negative' || s === 'mixed') bucket.negative++;
      else bucket.neutral++;
      bucket.total++;
      dateMap.set(key, bucket);
    }
  });

  const points = Array.from(dateMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));
  res.json(points);
});

routes.get('/analytics/aspects', async (req: Request, res: Response) => {
  const restaurantId = (req.query.restaurantId as string) || 'rest_bellavista_001';
  const analyses = await db.review_analysis.find({ restaurantId });
  const aspectCounts = new Map<string, { positive: number; negative: number; neutral: number }>();

  analyses.forEach((a) => {
    a.aspects.forEach((asp) => {
      const key = asp.aspect.toLowerCase();
      const curr = aspectCounts.get(key) || { positive: 0, negative: 0, neutral: 0 };
      if (asp.sentiment === 'positive') curr.positive++;
      else if (asp.sentiment === 'negative') curr.negative++;
      else curr.neutral++;
      aspectCounts.set(key, curr);
    });
  });

  const results = Array.from(aspectCounts.entries()).map(([aspect, counts]) => {
    const total = counts.positive + counts.negative + counts.neutral;
    return {
      aspect: aspect.charAt(0).toUpperCase() + aspect.slice(1),
      positiveCount: counts.positive,
      negativeCount: counts.negative,
      neutralCount: counts.neutral,
      totalMentions: total,
      positivePercentage: total > 0 ? Math.round((counts.positive / total) * 100) : 0,
    };
  });

  results.sort((a, b) => b.totalMentions - a.totalMentions);
  res.json(results);
});

routes.get('/analytics/issues', async (req: Request, res: Response) => {
  const restaurantId = (req.query.restaurantId as string) || 'rest_bellavista_001';
  const issues = await db.issues.find({ restaurantId });
  res.json(issues);
});

routes.get('/analytics/ratings', async (req: Request, res: Response) => {
  const restaurantId = (req.query.restaurantId as string) || 'rest_bellavista_001';
  const reviews = await db.reviews.find({ restaurantId });
  const total = reviews.length;
  const counts = [0, 0, 0, 0, 0];

  reviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(r.rating)));
    counts[star - 1]++;
  });

  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: counts[rating - 1],
    percentage: total > 0 ? Math.round((counts[rating - 1] / total) * 100) : 0,
  }));

  res.json(distribution);
});

// --- RAG Ask ---
routes.post('/rag/ask', async (req: Request, res: Response) => {
  const { restaurantId = 'rest_bellavista_001', question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required' });
  }

  const result = await askReviews(restaurantId, question);
  res.json(result);
});
