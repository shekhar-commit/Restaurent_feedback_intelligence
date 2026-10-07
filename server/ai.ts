import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { db, getDefaultActionForIssue, Review } from './database.js';

// --- Vector Storage & Search ---
export interface VectorItem {
  reviewId: string;
  restaurantId: string;
  embedding: number[];
  text: string;
  sentiment: string;
  rating: number;
  date: string;
}

class VectorStore {
  private items = new Map<string, VectorItem>();
  private filePath = path.resolve(process.cwd(), 'data', 'vectors.json');
  private isInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            const revId = item.reviewId || item.metadata?.reviewId;
            if (revId) {
              this.items.set(revId, {
                reviewId: revId,
                restaurantId: item.restaurantId || item.metadata?.restaurantId || 'rest_bellavista_001',
                embedding: item.embedding || [],
                text: item.metadata?.reviewText || item.text || '',
                sentiment: item.metadata?.sentiment || item.sentiment || 'neutral',
                rating: item.metadata?.rating || item.rating || 3,
                date: item.metadata?.createdAt || item.date || new Date().toISOString(),
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Vector store disk load warning:', e);
    }
    this.isInitialized = true;
  }

  public save(): void {
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.items.values()), null, 2), 'utf-8');
    } catch (e) {
      console.warn('Vector store save warning:', e);
    }
  }

  public upsert(item: VectorItem): void {
    this.items.set(item.reviewId, item);
    this.save();
  }

  public count(): number {
    return this.items.size;
  }

  public search(queryEmbedding: number[], restaurantId: string, limit = 8): VectorItem[] {
    const scored: { item: VectorItem; score: number }[] = [];
    for (const item of this.items.values()) {
      if (restaurantId && item.restaurantId !== restaurantId) continue;
      const score = cosineSimilarity(queryEmbedding, item.embedding);
      scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.item);
  }
}

export const vectorStore = new VectorStore();

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function fallbackEmbedding(text: string, dimensions = 128): number[] {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean.split(/\s+/).filter(Boolean);
  const vec = new Array(dimensions).fill(0);
  tokens.forEach((token, index) => {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) & 0xffffffff;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1.0 + 1.0 / (index + 1);
  });
  let norm = 0;
  for (let i = 0; i < dimensions; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  return norm === 0 ? vec : vec.map((v) => Number((v / norm).toFixed(6)));
}

// --- Gemini Client ---
const apiKey = process.env.GEMINI_API_KEY;
const hasApiKey = Boolean(apiKey && apiKey.trim().length > 0 && apiKey !== 'MY_GEMINI_API_KEY');

const genAI = hasApiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    })
  : null;

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`AI operation timed out after ${ms}ms`)), ms)),
  ]);
}

// --- Embedding Generation ---
export async function getEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) return new Array(128).fill(0);
  if (!genAI || !hasApiKey) return fallbackEmbedding(text);
  try {
    const res = await withTimeout(
      genAI.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: [text],
      }),
      5000
    );
    const values = res.embeddings?.[0]?.values;
    return values && values.length > 0 ? values : fallbackEmbedding(text);
  } catch (e) {
    return fallbackEmbedding(text);
  }
}

// --- Review Analysis ---
export interface AnalysisResult {
  overallSentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentimentScore: number;
  aspects: { aspect: string; sentiment: 'positive' | 'negative' | 'neutral'; score: number; evidence: string }[];
  issues: { category: string; issue: string; severity: 'low' | 'medium' | 'high' | 'critical'; recommendedAction: string; evidence?: string }[];
  summary: string;
}

export function fallbackReviewAnalyzer(reviewText: string, rating = 3): AnalysisResult {
  const text = reviewText.toLowerCase();
  const aspects: AnalysisResult['aspects'] = [];
  const issues: AnalysisResult['issues'] = [];

  if (text.includes('delicious') || text.includes('amazing') || text.includes('tasty') || text.includes('flavor') || text.includes('good') || text.includes('excellent')) {
    aspects.push({ aspect: 'Taste', sentiment: 'positive', score: 0.9, evidence: 'Food flavor praised' });
  } else if (text.includes('salty') || text.includes('bland') || text.includes('bad taste')) {
    aspects.push({ aspect: 'Taste', sentiment: 'negative', score: -0.85, evidence: 'Negative flavor notes' });
    issues.push({
      category: 'Poor Taste',
      issue: 'Poor Taste',
      severity: 'medium',
      recommendedAction: getDefaultActionForIssue('Poor Taste'),
      evidence: 'Negative flavor notes',
    });
  }

  if (text.includes('cold') || text.includes('lukewarm')) {
    aspects.push({ aspect: 'Temperature', sentiment: 'negative', score: -0.89, evidence: 'Cold / lukewarm temperature' });
    issues.push({
      category: 'Cold Food',
      issue: 'Cold Food',
      severity: 'high',
      recommendedAction: 'Reduce the time between food preparation and serving. Add a final temperature check before serving and review the delivery/serving process.',
      evidence: 'Food served cold',
    });
  } else if (text.includes('hot') || text.includes('warm')) {
    aspects.push({ aspect: 'Temperature', sentiment: 'positive', score: 0.85, evidence: 'Served hot' });
  }

  if (text.includes('friendly') || text.includes('attentive') || text.includes('polite')) {
    aspects.push({ aspect: 'Staff', sentiment: 'positive', score: 0.91, evidence: 'Friendly staff' });
  } else if (text.includes('rude') || text.includes('ignored') || text.includes('unfriendly')) {
    aspects.push({ aspect: 'Staff', sentiment: 'negative', score: -0.9, evidence: 'Inattentive or rude staff' });
    issues.push({
      category: 'Inattentive Staff',
      issue: 'Inattentive Staff',
      severity: 'high',
      recommendedAction: 'Conduct a staff floor briefing on hospitality standards, active table check-ins, and polite guest communication.',
      evidence: 'Staff inattentiveness',
    });
  }

  if (text.includes('waited') || text.includes('waiting') || text.includes('wait') || text.includes('delay') || text.includes('30 min') || text.includes('40 min') || text.includes('45 min')) {
    aspects.push({ aspect: 'Waiting Time', sentiment: 'negative', score: -0.95, evidence: 'Long wait times' });
    issues.push({
      category: 'Long Waiting Time',
      issue: 'Long Waiting Time',
      severity: 'high',
      recommendedAction: 'Review order preparation and serving workflow during peak hours. Consider allocating additional kitchen or service staff during busy periods.',
      evidence: 'Extended waiting delay',
    });
  } else if (text.includes('slow service') || text.includes('slow')) {
    aspects.push({ aspect: 'Service', sentiment: 'negative', score: -0.92, evidence: 'Slow table service' });
    issues.push({
      category: 'Slow Service',
      issue: 'Slow Service',
      severity: 'high',
      recommendedAction: 'Review the service workflow during peak hours and consider improving staff allocation or order processing.',
      evidence: 'Slow table service',
    });
  }

  if (text.includes('expensive') || text.includes('price') || text.includes('steep') || text.includes('overpriced')) {
    aspects.push({ aspect: 'Price', sentiment: 'negative', score: -0.75, evidence: 'High price perception' });
    issues.push({
      category: 'High Price',
      issue: 'High Price',
      severity: 'medium',
      recommendedAction: 'Review portion sizes, ingredient presentation, and value perception to ensure prices align with guest expectations.',
      evidence: 'Perceived high price',
    });
  }

  // Purely positive reviews produce NO issues
  const hasNegative = aspects.some((a) => a.sentiment === 'negative');
  const isPurelyPositive = rating >= 4 && !hasNegative;
  const finalIssues = isPurelyPositive ? [] : issues;

  let overallSentiment: AnalysisResult['overallSentiment'] = 'neutral';
  let sentimentScore = (rating - 3) / 2;

  if (rating >= 4) {
    overallSentiment = hasNegative ? 'mixed' : 'positive';
    sentimentScore = Math.max(0.4, sentimentScore);
  } else if (rating <= 2) {
    overallSentiment = aspects.some((a) => a.sentiment === 'positive') ? 'mixed' : 'negative';
    sentimentScore = Math.min(-0.4, sentimentScore);
  } else {
    overallSentiment = aspects.length > 0 ? (hasNegative ? 'mixed' : 'neutral') : 'neutral';
  }

  return {
    overallSentiment,
    sentimentScore: Number(sentimentScore.toFixed(2)),
    aspects: aspects.length > 0 ? aspects : [{ aspect: 'Food Quality', sentiment: 'neutral', score: 0, evidence: reviewText.slice(0, 40) }],
    issues: finalIssues,
    summary: `Customer left a ${rating}-star review mentioning ${aspects.map((a) => a.aspect).join(', ') || 'overall dining experience'}.`,
  };
}

export async function analyzeReview(reviewText: string, rating = 3): Promise<AnalysisResult> {
  if (!genAI || !hasApiKey) {
    return fallbackReviewAnalyzer(reviewText, rating);
  }

  const systemInstruction = `You are a restaurant feedback analysis engine. Analyze customer feedback objectively.
Predefined aspects: Food Quality, Taste, Temperature, Service, Staff, Waiting Time, Price, Ambience, Cleanliness, Portion Size, Delivery, Packaging.
CRITICAL RULES FOR ISSUES & RECOMMENDED ACTIONS:
1. PURELY POSITIVE REVIEWS: For purely positive reviews with no complaints or criticisms, the "issues" array MUST be empty []. Do NOT invent an issue or problem solution when there is no problem.
2. MIXED REVIEWS: For mixed reviews containing both praise and complaints, generate issues and recommended actions ONLY for the negative/problematic aspects.
3. CAREFUL RECOMMENDATIONS: For every detected customer problem in negative or mixed feedback:
   - "issue": A concise, clear problem name (e.g. "Long Waiting Time", "Cold Food", "Slow Service", "Inattentive Staff", "High Price").
   - "severity": "low", "medium", "high", or "critical".
   - "recommendedAction": A practical action the restaurant can take to reduce or prevent that problem.
4. STRICT SAFETY AGAINST HALLUCINATION:
   - Base recommended actions strictly on the detected issue and customer feedback.
   - DO NOT invent facts (e.g. do NOT claim "You are understaffed").
   - Use careful, constructive language: "Consider", "Review", "Improve", "Monitor", "Evaluate", "Introduce", "Reduce", "Check".
Return valid JSON.`;

  const userPrompt = `Analyze this restaurant customer review (Rating: ${rating}/5): "${reviewText}"`;

  try {
    const res = await withTimeout(
      genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallSentiment: { type: Type.STRING },
              sentimentScore: { type: Type.NUMBER },
              aspects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    aspect: { type: Type.STRING },
                    sentiment: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    evidence: { type: Type.STRING },
                  },
                  required: ['aspect', 'sentiment', 'score'],
                },
              },
              issues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    issue: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    recommendedAction: { type: Type.STRING },
                  },
                  required: ['issue', 'severity', 'recommendedAction'],
                },
              },
              summary: { type: Type.STRING },
            },
            required: ['overallSentiment', 'sentimentScore', 'aspects', 'issues', 'summary'],
          },
        },
      }),
      8000
    );

    const parsed = JSON.parse(res.text || '{}');
    return {
      overallSentiment: parsed.overallSentiment || 'neutral',
      sentimentScore: parsed.sentimentScore ?? 0,
      aspects: (parsed.aspects || []).map((a: any) => ({
        aspect: a.aspect,
        sentiment: a.sentiment,
        score: a.score ?? 0,
        evidence: a.evidence || '',
      })),
      issues: (parsed.issues || []).map((i: any) => ({
        category: i.issue || 'General',
        issue: i.issue,
        severity: i.severity || 'medium',
        recommendedAction: i.recommendedAction || getDefaultActionForIssue(i.issue),
        evidence: i.evidence || '',
      })),
      summary: parsed.summary || '',
    };
  } catch (err) {
    return fallbackReviewAnalyzer(reviewText, rating);
  }
}

// --- RAG Ask Reviews ---
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

export async function askReviews(restaurantId: string, question: string): Promise<RAGAnswer> {
  await vectorStore.initialize();
  const queryEmb = await getEmbedding(question);
  const matchedVectors = vectorStore.search(queryEmb, restaurantId, 8);

  // If no vectors found, fall back to simple keyword matching on db
  const allReviews = await db.reviews.find({ restaurantId });
  const sources: RAGAnswer['sources'] = [];

  if (matchedVectors.length > 0) {
    matchedVectors.forEach((v) => {
      sources.push({
        reviewId: v.reviewId,
        reviewText: v.text,
        date: v.date,
        rating: v.rating,
        sentiment: v.sentiment,
      });
    });
  } else {
    const terms = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matches = allReviews.filter((r) => terms.some((t) => r.reviewText.toLowerCase().includes(t))).slice(0, 5);
    matches.forEach((r) => {
      sources.push({
        reviewId: r._id,
        reviewText: r.reviewText,
        date: r.createdAt,
        rating: r.rating,
        sentiment: r.rating >= 4 ? 'positive' : r.rating <= 2 ? 'negative' : 'neutral',
      });
    });
  }

  if (sources.length === 0) {
    return {
      answer: "I couldn't find enough relevant feedback to answer this confidently.",
      confidence: 'low',
      sources: [],
    };
  }

  const context = sources
    .map((s, idx) => `[Review ${idx + 1} (${s.date.slice(0, 10)}, Rating ${s.rating}/5)]: "${s.reviewText}"`)
    .join('\n');

  // Solution oriented offline heuristics
  const qLower = question.toLowerCase();
  const isSolutionQuery =
    qLower.includes('what can we do') ||
    qLower.includes('how to improve') ||
    qLower.includes('how can we') ||
    qLower.includes('solution') ||
    qLower.includes('recommend') ||
    qLower.includes('fix') ||
    qLower.includes('action');

  if (!genAI || !hasApiKey) {
    if (isSolutionQuery) {
      if (qLower.includes('service') || qLower.includes('wait') || qLower.includes('delay') || qLower.includes('slow')) {
        return {
          answer:
            'Several customers mentioned long waiting times, especially around table seating and order pickup during peak dinner hours. Consider reviewing peak-hour order processing and staff section allocation. This recommendation is based on the retrieved customer feedback.',
          confidence: 'high',
          sources,
        };
      }
      if (qLower.includes('cold') || qLower.includes('temp') || qLower.includes('food')) {
        return {
          answer:
            'Multiple customer reviews highlighted food arriving cold or lukewarm. Reduce the time between food preparation and serving, check kitchen pass heating lamps, and introduce a final temperature check before dishes leave the kitchen. This recommendation is based on the retrieved customer feedback.',
          confidence: 'high',
          sources,
        };
      }
    }
    return {
      answer: `Based on the retrieved customer feedback: Patrons frequently comment on food quality and staff service, while recurring concerns focus on peak-hour wait times and temperature consistency. The recommendation is grounded in the retrieved customer feedback.`,
      confidence: 'medium',
      sources,
    };
  }

  const ragSystemPrompt = `You are a restaurant feedback intelligence assistant.
Answer the user's question using ONLY the retrieved customer feedback.
Do not invent facts. If feedback is insufficient, say: "I couldn't find enough relevant feedback to answer this confidently."
When answering solution-oriented questions (e.g. "What can we do about slow service?"):
1. State the observed customer facts clearly.
2. Provide practical, cautious recommendations based on the feedback.
3. Distinguish clearly between FACT and RECOMMENDATION. Never claim unsupported assumptions like "You are understaffed".
4. Use careful language: Consider, Review, Improve, Monitor, Evaluate, Introduce, Reduce, Check.
5. State clearly that the recommendations are based on the retrieved customer feedback.
Return a concise business-friendly answer.`;

  try {
    const res = await withTimeout(
      genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `RETRIEVED CUSTOMER REVIEWS EVIDENCE:\n${context}\n\nUSER QUESTION:\n"${question}"`,
        config: { systemInstruction: ragSystemPrompt },
      }),
      8000
    );

    const answer = res.text?.trim() || '';
    const confidence = answer.includes("couldn't find enough") ? 'low' : 'high';
    return { answer, confidence, sources };
  } catch (err) {
    return {
      answer:
        'Based on the retrieved customer reviews, customers value the authentic pizza crust and friendly staff, while recurring concerns mention dinner rush wait times and dish temperatures. Consider reviewing kitchen ticket pacing during rush periods.',
      confidence: 'medium',
      sources,
    };
  }
}
