import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { Dashboard } from './Dashboard';
import { Reviews } from './Reviews';
import { Analytics } from './Analytics';
import { Issues } from './Issues';
import { AskReviews } from './AskReviews';
import { api, Restaurant } from './api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'reviews' | 'analytics' | 'issues' | 'ask'>('dashboard');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [activeRestaurant, setActiveRestaurant] = useState<Restaurant | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(54);
  const [issueCount, setIssueCount] = useState<number>(6);
  const [selectedIssueName, setSelectedIssueName] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const rests = await api.getRestaurants();
        setRestaurants(rests);
        if (rests.length > 0) {
          setActiveRestaurant(rests[0]);
          const [ov, iss] = await Promise.all([
            api.getOverview(rests[0]._id).catch(() => null),
            api.getIssueMetrics(rests[0]._id).catch(() => null),
          ]);
          if (ov) setReviewCount(ov.totalReviews);
          if (iss) setIssueCount(iss.length);
        }
      } catch (e) {
        console.warn('Initialization note:', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const restaurantId = activeRestaurant?._id || 'rest_bellavista_001';

  const navItems: {
    id: 'dashboard' | 'reviews' | 'analytics' | 'issues' | 'ask';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare, badge: reviewCount },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'issues', label: 'Issues', icon: AlertTriangle, badge: issueCount },
    { id: 'ask', label: 'Ask Reviews', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-60 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0">
        {/* Brand */}
        <div className="p-4 border-b border-neutral-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wide uppercase">Feedback Intel</h1>
            <span className="text-[10px] text-neutral-400">Restaurant Analytics</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-neutral-950">
        {/* Top Header */}
        <header className="h-14 bg-neutral-900/90 border-b border-neutral-800 px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-white">
              {activeRestaurant?.name || 'Bella Vista Trattoria & Pizzeria'}
            </span>
            <span className="text-[11px] text-neutral-500 hidden sm:inline">
              · {activeRestaurant?.cuisine || 'Italian Cuisine'}
            </span>
          </div>

          <button
            onClick={() => setCurrentTab('ask')}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 border border-neutral-700/60"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ask Reviews</span>
          </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto overflow-y-auto">
          {currentTab === 'dashboard' && (
            <Dashboard
              restaurantId={restaurantId}
              onNavigateTab={(tab: any) => setCurrentTab(tab)}
              onSelectIssue={(iss) => {
                setSelectedIssueName(iss);
                setCurrentTab('issues');
              }}
            />
          )}

          {currentTab === 'reviews' && <Reviews restaurantId={restaurantId} />}

          {currentTab === 'analytics' && <Analytics restaurantId={restaurantId} />}

          {currentTab === 'issues' && (
            <Issues restaurantId={restaurantId} initialSelectedIssue={selectedIssueName} />
          )}

          {currentTab === 'ask' && <AskReviews restaurantId={restaurantId} />}
        </main>
      </div>
    </div>
  );
}
