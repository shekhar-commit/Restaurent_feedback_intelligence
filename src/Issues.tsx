import React, { useEffect, useState } from 'react';
import { AlertTriangle, MessageSquare, Search, Star } from 'lucide-react';
import { api, IssueMetric, Review } from './api';

interface IssuesProps {
  restaurantId: string;
  initialSelectedIssue?: string;
}

export function Issues({ restaurantId, initialSelectedIssue }: IssuesProps) {
  const [issues, setIssues] = useState<IssueMetric[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueMetric | null>(null);
  const [relatedReviews, setRelatedReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchIssues = async () => {
    try {
      setIsLoading(true);
      const data = await api.getIssueMetrics(restaurantId);
      setIssues(data);

      if (initialSelectedIssue) {
        const found = data.find((i) => i.issue.toLowerCase() === initialSelectedIssue.toLowerCase());
        if (found) {
          setSelectedIssue(found);
          loadRelatedReviews(found.issue);
          return;
        }
      }

      if (data.length > 0 && !selectedIssue) {
        setSelectedIssue(data[0]);
        loadRelatedReviews(data[0].issue);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRelatedReviews = async (issueName: string) => {
    try {
      setIsReviewsLoading(true);
      const res = await api.getReviews({
        restaurantId,
        search: issueName,
        limit: 10,
      });
      setRelatedReviews(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [restaurantId]);

  const handleSelect = (iss: IssueMetric) => {
    setSelectedIssue(iss);
    loadRelatedReviews(iss.issue);
  };

  const filtered = issues.filter((i) => i.issue.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Recurring Operational Problems</h2>
        <p className="text-xs text-neutral-400">
          Clustered issue patterns detected across customer feedback with practical recommended actions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Issues List */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recurring issues..."
              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 pl-9 pr-3 py-1.5 rounded focus:outline-hidden"
            />
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center py-8 text-xs text-neutral-500">Scanning issues...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-500">No issues found.</div>
            ) : (
              filtered.map((iss) => {
                const isSelected = selectedIssue?.issue === iss.issue;
                return (
                  <div
                    key={iss.issue}
                    onClick={() => handleSelect(iss)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-neutral-800/90 border-amber-500/80 shadow-md'
                        : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-semibold text-white capitalize">{iss.issue}</span>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded font-medium ${
                        iss.priority === 'critical' ? 'bg-rose-950 text-rose-300' : iss.priority === 'high' ? 'bg-orange-950 text-orange-300' : 'bg-amber-950 text-amber-300'
                      }`}>
                        {iss.priority}
                      </span>
                    </div>

                    {iss.recommendedAction && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-800/80">
                        <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block font-semibold mb-0.5">
                          Recommended Action
                        </span>
                        <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                          "{iss.recommendedAction}"
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono mt-2.5 pt-2 border-t border-neutral-800/60 tabular-nums">
                      <span>{iss.mentions} mentions</span>
                      <span className={iss.trend === 'increasing' ? 'text-rose-400 font-medium' : 'text-neutral-400'}>
                        {iss.trend === 'increasing' ? '↑ Increasing' : '→ Stable'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Issue Details */}
        <div className="lg:col-span-7 space-y-4">
          {selectedIssue ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-5">
              <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block">
                    {selectedIssue.category}
                  </span>
                  <h3 className="text-lg font-bold text-white capitalize mt-0.5">{selectedIssue.issue}</h3>
                </div>
                <span className={`text-[11px] uppercase font-mono px-2 py-0.5 rounded font-medium ${
                  selectedIssue.priority === 'critical' ? 'bg-rose-950 text-rose-300' : selectedIssue.priority === 'high' ? 'bg-orange-950 text-orange-300' : 'bg-amber-950 text-amber-300'
                }`}>
                  {selectedIssue.priority}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block">Mentions</span>
                  <span className="text-xl font-bold font-mono text-white tabular-nums mt-0.5 block">
                    {selectedIssue.mentions}
                  </span>
                </div>
                <div className="p-3 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block">Severity</span>
                  <span className="text-sm font-bold font-mono uppercase text-amber-400 mt-1 block">
                    {selectedIssue.priority}
                  </span>
                </div>
                <div className="p-3 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block">Trend</span>
                  <span className="text-sm font-semibold font-mono text-amber-400 mt-1 block">
                    {selectedIssue.trend === 'increasing' ? '↑ Increasing' : '→ Stable'}
                  </span>
                </div>
              </div>

              {/* Prominent Recommended Action */}
              {selectedIssue.recommendedAction && (
                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-400 block">
                    Recommended Action
                  </span>
                  <p className="text-sm text-neutral-100 leading-relaxed font-normal">
                    "{selectedIssue.recommendedAction}"
                  </p>
                </div>
              )}

              {/* Supporting Reviews */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                  Related Customer Feedback ({relatedReviews.length})
                </h4>

                {isReviewsLoading ? (
                  <div className="text-center py-6 text-xs text-neutral-500">Loading feedback...</div>
                ) : relatedReviews.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-500 border border-neutral-800 rounded">
                    No individual reviews directly matched this keyword filter.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {relatedReviews.map((rev) => (
                      <div key={rev._id} className="p-3 rounded bg-neutral-950/50 border border-neutral-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-white">{rev.customerName || 'Guest'}</span>
                          <div className="flex items-center gap-1 text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span className="font-mono text-xs">{rev.rating}</span>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-300 italic leading-relaxed">"{rev.reviewText}"</p>
                        <span className="text-[10px] text-neutral-500 font-mono block">
                          {new Date(rev.createdAt).toLocaleDateString()} · {rev.source}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-lg">
              Select an issue on the left to review details and recommendations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
