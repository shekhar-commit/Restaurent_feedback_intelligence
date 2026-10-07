import React, { useEffect, useState } from 'react';
import { Search, RefreshCw, Trash2, Eye, X, Star, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api, Review } from './api';

interface ReviewsProps {
  restaurantId: string;
}

export function Reviews({ restaurantId }: ReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [sentiment, setSentiment] = useState('all');
  const [rating, setRating] = useState('all');
  const [source, setSource] = useState('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const res = await api.getReviews({
        restaurantId,
        search: search.trim() || undefined,
        sentiment: sentiment !== 'all' ? sentiment : undefined,
        rating: rating !== 'all' ? Number(rating) : undefined,
        source: source !== 'all' ? source : undefined,
        page,
        limit: 15,
      });
      setReviews(res.data);
      setTotalCount(res.pagination.totalCount);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [restaurantId, page, sentiment, rating, source]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchReviews();
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r._id !== id));
      setTotalCount((c) => Math.max(0, c - 1));
      if (selectedReview?._id === id) setSelectedReview(null);
    } catch (err) {
      alert('Failed to delete review');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Customer Reviews</h2>
          <p className="text-xs text-neutral-400">{totalCount} total customer submissions in restaurant database</p>
        </div>
        <button
          onClick={() => fetchReviews()}
          className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded transition-colors self-start"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search review text or customer..."
            className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 pl-9 pr-3 py-1.5 rounded focus:outline-hidden focus:border-neutral-600 placeholder:text-neutral-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={sentiment}
            onChange={(e) => {
              setSentiment(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-950 border border-neutral-800 text-neutral-200 px-2.5 py-1.5 rounded focus:outline-hidden"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="mixed">Mixed</option>
            <option value="neutral">Neutral</option>
          </select>

          <select
            value={rating}
            onChange={(e) => {
              setRating(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-950 border border-neutral-800 text-neutral-200 px-2.5 py-1.5 rounded focus:outline-hidden"
          >
            <option value="all">All Stars</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-950 border border-neutral-800 text-neutral-200 px-2.5 py-1.5 rounded focus:outline-hidden"
          >
            <option value="all">All Sources</option>
            <option value="Direct Feedback">Direct Feedback</option>
            <option value="Website">Website</option>
            <option value="CSV Import">CSV Import</option>
            <option value="API">API</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      {isLoading ? (
        <div className="text-center py-12 text-xs text-neutral-400">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="p-8 text-center text-xs text-neutral-500 border border-neutral-800 rounded bg-neutral-900">
          No reviews match your filters.
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4 min-w-[280px]">Review Feedback</th>
                  <th className="py-3 px-4">Sentiment</th>
                  <th className="py-3 px-4">Main Aspect</th>
                  <th className="py-3 px-4">Issue</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {reviews.map((rev) => {
                  const ana = rev.analysis;
                  const mainAspect = ana?.aspects?.[0]?.aspect || '—';
                  const firstIssue = ana?.issues?.[0];

                  return (
                    <tr
                      key={rev._id}
                      onClick={() => setSelectedReview(rev)}
                      className="hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                        {rev.customerName || 'Anonymous'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-0.5 text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span className="font-mono text-xs">{rev.rating}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="line-clamp-2 text-neutral-300 leading-relaxed">{rev.reviewText}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {ana ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                              ana.overallSentiment === 'positive'
                                ? 'bg-emerald-950 text-emerald-300'
                                : ana.overallSentiment === 'negative'
                                ? 'bg-rose-950 text-rose-300'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {ana.overallSentiment}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap capitalize text-neutral-300">
                        {mainAspect}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-400 capitalize">
                        {firstIssue ? firstIssue.issue || firstIssue.category : 'None'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-neutral-400">
                        {new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReview(rev)}
                            className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(rev._id, e)}
                            className="p-1.5 text-neutral-500 hover:text-rose-400 rounded hover:bg-neutral-800"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-neutral-950/60 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Showing Page {page} of {totalPages} ({totalCount} reviews)</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:text-white disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Detail Drawer */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900/95 border-b border-neutral-800 p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-neutral-400">{selectedReview.source}</span>
                <h3 className="text-sm font-semibold text-white">{selectedReview.customerName || 'Guest Review'}</h3>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              {/* Rating & Date */}
              <div className="flex items-center justify-between p-3 rounded bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-semibold text-white">{selectedReview.rating} / 5 Stars</span>
                </div>
                <span className="text-neutral-400 font-mono">
                  {new Date(selectedReview.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Review Text */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1.5 font-semibold">
                  Customer Review
                </span>
                <div className="p-3.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-200 leading-relaxed italic">
                  "{selectedReview.reviewText}"
                </div>
              </div>

              {/* AI Analysis Details */}
              {selectedReview.analysis && (
                <div className="space-y-4 pt-3 border-t border-neutral-800">
                  {/* Sentiment */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                      Sentiment
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        selectedReview.analysis.overallSentiment === 'positive'
                          ? 'bg-emerald-950 text-emerald-300'
                          : selectedReview.analysis.overallSentiment === 'negative'
                          ? 'bg-rose-950 text-rose-300'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {selectedReview.analysis.overallSentiment} (Score: {selectedReview.analysis.sentimentScore})
                    </span>
                  </div>

                  {/* Detected Aspects */}
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-2 font-semibold">
                      Detected Aspects
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedReview.analysis.aspects.map((a, i) => (
                        <div key={i} className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                          <span className="capitalize font-medium">{a.aspect}:</span>{' '}
                          <span className={a.sentiment === 'positive' ? 'text-emerald-400' : a.sentiment === 'negative' ? 'text-rose-400' : 'text-neutral-400'}>
                            {a.sentiment}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Issues & Recommended Actions */}
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-2 font-semibold">
                      Detected Issues & Recommended Actions
                    </span>
                    {selectedReview.analysis.issues.length > 0 ? (
                      <div className="space-y-3">
                        {selectedReview.analysis.issues.map((iss, i) => (
                          <div key={i} className="p-3.5 rounded bg-neutral-950 border border-neutral-800 space-y-2.5">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <span className="font-semibold text-white capitalize">{iss.issue}</span>
                              </div>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-medium">
                                {iss.severity}
                              </span>
                            </div>
                            {iss.recommendedAction && (
                              <div className="pt-2 border-t border-neutral-800/80">
                                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block mb-1 font-semibold">
                                  Recommended Action
                                </span>
                                <p className="text-xs text-neutral-200 leading-relaxed bg-neutral-900 p-2.5 rounded border border-neutral-800">
                                  "{iss.recommendedAction}"
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block text-emerald-200">No Operational Issues</span>
                          <p className="text-neutral-300 text-[11px] mt-0.5">
                            Continue maintaining current food quality and staff service.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
