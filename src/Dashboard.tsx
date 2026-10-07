import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Star,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api, OverviewMetrics, SentimentTrendPoint, AspectMetric, IssueMetric } from './api';

interface DashboardProps {
  restaurantId: string;
  onNavigateTab: (tab: string) => void;
  onSelectIssue?: (issueName: string) => void;
}

export function Dashboard({ restaurantId, onNavigateTab, onSelectIssue }: DashboardProps) {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [trends, setTrends] = useState<SentimentTrendPoint[]>([]);
  const [aspects, setAspects] = useState<AspectMetric[]>([]);
  const [issues, setIssues] = useState<IssueMetric[]>([]);
  const [trendDays, setTrendDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const [ov, tr, asp, iss] = await Promise.all([
          api.getOverview(restaurantId),
          api.getSentimentTrends(restaurantId, trendDays),
          api.getAspectMetrics(restaurantId),
          api.getIssueMetrics(restaurantId),
        ]);
        if (isMounted) {
          setOverview(ov);
          setTrends(tr);
          setAspects(asp);
          setIssues(iss);
        }
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [restaurantId, trendDays]);

  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-neutral-400 text-sm">
        Loading dashboard feedback analytics...
      </div>
    );
  }

  const sentimentDist = [
    { name: 'Positive', count: overview?.positiveCount || 0, percent: overview?.positivePercent || 0, fill: '#10b981' },
    { name: 'Neutral', count: overview?.neutralCount || 0, percent: overview?.neutralPercent || 0, fill: '#737373' },
    { name: 'Negative', count: overview?.negativeCount || 0, percent: overview?.negativePercent || 0, fill: '#f43f5e' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reviews */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block">Total Reviews</span>
            <span className="text-2xl font-bold font-mono text-white tabular-nums mt-0.5 block">
              {overview?.totalReviews || 0}
            </span>
            <span className="text-[11px] text-neutral-500">Collected in database</span>
          </div>
          <div className="w-9 h-9 rounded-md bg-neutral-800 flex items-center justify-center text-neutral-300">
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>

        {/* Average Rating */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block">Average Rating</span>
            <span className="text-2xl font-bold font-mono text-white tabular-nums mt-0.5 block">
              {overview?.averageRating ? overview.averageRating.toFixed(1) : '0.0'}
            </span>
            <span className="text-[11px] text-neutral-500">Out of 5.0 stars</span>
          </div>
          <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Star className="w-4 h-4 fill-amber-400" />
          </div>
        </div>

        {/* Positive Reviews */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block">Positive Reviews</span>
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums mt-0.5 block">
              {overview?.positivePercent || 0}%
            </span>
            <span className="text-[11px] text-neutral-500">{overview?.positiveCount || 0} submissions</span>
          </div>
          <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ThumbsUp className="w-4 h-4" />
          </div>
        </div>

        {/* Negative Reviews */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block">Negative Reviews</span>
            <span className="text-2xl font-bold font-mono text-rose-400 tabular-nums mt-0.5 block">
              {overview?.negativePercent || 0}%
            </span>
            <span className="text-[11px] text-neutral-500">{overview?.negativeCount || 0} submissions</span>
          </div>
          <div className="w-9 h-9 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ThumbsDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. Sentiment Charts: Distribution + Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sentiment Distribution */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Sentiment Distribution</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Ratio of customer sentiment across feedback</p>
          </div>

          <div className="h-56 w-full my-3">
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
              <div key={item.name} className="p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-[11px] text-neutral-400 block">{item.name}</span>
                <span className="text-xs font-mono font-semibold text-white">{item.percent}%</span>
                <span className="text-[10px] text-neutral-500 block font-mono">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment Trends */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Sentiment Trends Over Time</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Volume of positive, negative, and neutral reviews</p>
            </div>
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded border border-neutral-800 text-xs">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${trendDays === d ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'}`}
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
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-500 rounded"></span>
              <span>Positive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-rose-500 rounded"></span>
              <span>Negative</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-neutral-400 rounded"></span>
              <span>Neutral</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Top Aspects & Top Issues with Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Aspects */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Top Aspects</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Highest mentioned dining dimensions</p>
            </div>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              All analytics <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {aspects.slice(0, 5).map((asp) => (
              <div key={asp.aspect} className="p-3 rounded bg-neutral-950/40 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block capitalize">{asp.aspect}</span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {asp.positiveCount} positive · {asp.totalMentions} total mentions
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-semibold text-emerald-400">{asp.positivePercentage}%</span>
                  <div className="w-20 bg-neutral-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${asp.positivePercentage}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Issues & Actions */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Top Issues & Recommended Actions</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Recurring customer complaints with operational remedies</p>
            </div>
            <button
              onClick={() => onNavigateTab('issues')}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              All issues <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {issues.slice(0, 4).map((prob, idx) => (
              <div
                key={prob.issue}
                onClick={() => {
                  if (onSelectIssue) onSelectIssue(prob.issue);
                  onNavigateTab('issues');
                }}
                className="p-3 rounded bg-neutral-950/40 border border-neutral-800 hover:border-neutral-700 flex flex-col gap-1.5 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-neutral-500 font-semibold">{idx + 1}.</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold text-white capitalize">{prob.issue}</span>
                    <span className="text-[11px] text-neutral-500 font-mono">({prob.mentions} mentions)</span>
                  </div>
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-medium ${
                    prob.priority === 'critical' ? 'bg-rose-950 text-rose-300' : prob.priority === 'high' ? 'bg-orange-950 text-orange-300' : 'bg-amber-950 text-amber-300'
                  }`}>
                    {prob.priority}
                  </span>
                </div>

                {prob.recommendedAction && (
                  <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-900/80 p-2 rounded border border-neutral-800/80 line-clamp-2">
                    "{prob.recommendedAction}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
