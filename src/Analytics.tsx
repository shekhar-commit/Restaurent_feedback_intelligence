import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import {
  api,
  OverviewMetrics,
  SentimentTrendPoint,
  AspectMetric,
  IssueMetric,
  RatingDistributionItem,
} from './api';

interface AnalyticsProps {
  restaurantId: string;
}

export function Analytics({ restaurantId }: AnalyticsProps) {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [trends, setTrends] = useState<SentimentTrendPoint[]>([]);
  const [aspects, setAspects] = useState<AspectMetric[]>([]);
  const [issues, setIssues] = useState<IssueMetric[]>([]);
  const [ratings, setRatings] = useState<RatingDistributionItem[]>([]);
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const [ov, tr, asp, iss, rat] = await Promise.all([
          api.getOverview(restaurantId),
          api.getSentimentTrends(restaurantId, days),
          api.getAspectMetrics(restaurantId),
          api.getIssueMetrics(restaurantId),
          api.getRatingDistribution(restaurantId),
        ]);
        setOverview(ov);
        setTrends(tr);
        setAspects(asp);
        setIssues(iss);
        setRatings(rat);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [restaurantId, days]);

  if (isLoading && !overview) {
    return <div className="text-center py-12 text-xs text-neutral-400">Loading feedback analytics...</div>;
  }

  const sentimentDist = [
    { name: 'Positive', count: overview?.positiveCount || 0, percent: overview?.positivePercent || 0, fill: '#10b981' },
    { name: 'Neutral', count: overview?.neutralCount || 0, percent: overview?.neutralPercent || 0, fill: '#737373' },
    { name: 'Negative', count: overview?.negativeCount || 0, percent: overview?.negativePercent || 0, fill: '#f43f5e' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Feedback Analytics</h2>
        <p className="text-xs text-neutral-400">Deep-dive customer sentiment, aspect satisfaction, and rating distribution</p>
      </div>

      {/* Grid 1: Sentiment Distribution + Sentiment Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sentiment Distribution */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white">Sentiment Distribution</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Overall breakdown across reviews</p>

          <div className="h-56 w-full my-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentDist} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '6px', fontSize: '12px', color: '#f5f5f5' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {sentimentDist.map((e, idx) => (
                    <Cell key={idx} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-800 text-center">
            {sentimentDist.map((item) => (
              <div key={item.name} className="p-2 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block">{item.name}</span>
                <span className="text-xs font-mono font-semibold text-white">{item.percent}%</span>
                <span className="text-[10px] text-neutral-500 block font-mono">{item.count} reviews</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment Trend */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Sentiment Trends Over Time</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Customer feedback sentiment evolution</p>
            </div>
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded border border-neutral-800 text-xs">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${days === d ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="date" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '6px', fontSize: '12px', color: '#f5f5f5' }}
                />
                <Line type="monotone" dataKey="positive" name="Positive" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="negative" name="Negative" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="neutral" name="Neutral" stroke="#a3a3a3" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-neutral-400 pt-3 border-t border-neutral-800">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-emerald-500 rounded"></span> Positive</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-rose-500 rounded"></span> Negative</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-neutral-400 rounded"></span> Neutral</span>
          </div>
        </div>
      </div>

      {/* Grid 2: Rating Distribution + Aspect Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rating Distribution */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white">Rating Distribution</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Star ratings Breakdown (1-5)</p>

          <div className="space-y-3 mt-5">
            {ratings.map((r) => (
              <div key={r.rating} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-neutral-400 w-12">{r.rating} Stars</span>
                <div className="flex-1 bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: `${r.percentage}%` }}
                  ></div>
                </div>
                <span className="font-mono text-neutral-300 w-10 text-right">{r.count}</span>
                <span className="font-mono text-neutral-500 w-12 text-right">{r.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Aspect Sentiment */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white">Aspect Sentiment Breakdown</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Sentiment score across key dining aspects</p>

          <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-1">
            {aspects.map((asp) => (
              <div key={asp.aspect} className="p-3 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block capitalize">{asp.aspect}</span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {asp.positiveCount} pos · {asp.negativeCount} neg · {asp.totalMentions} total
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-400">{asp.positivePercentage}%</span>
                  <div className="w-24 bg-neutral-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${asp.positivePercentage}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Recurring Issues */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white">Top Operational Issues</h3>
        <p className="text-xs text-neutral-400 mt-0.5">Ranked by customer mention frequency</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {issues.slice(0, 6).map((iss) => (
            <div key={iss.issue} className="p-3.5 rounded bg-neutral-950 border border-neutral-800 flex flex-col justify-between gap-2">
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
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono border-t border-neutral-800/80 pt-2">
                <span>{iss.mentions} mentions</span>
                <span className={iss.trend === 'increasing' ? 'text-rose-400' : 'text-neutral-400'}>
                  {iss.trend === 'increasing' ? '↑ Increasing' : '→ Stable'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
