'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, Package, Clock, Star,
  Download, Calendar,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Spinner, Card } from '@/components/ui';
import { cn, formatPrice } from '@/lib/utils';
import type { Order } from '@/types';

interface DayStats {
  date: string;
  orders: number;
  revenue: number;
  completed: number;
}

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetch('/api/orders?limit=500')
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar variant="admin" />
        <div className="flex items-center justify-center py-32">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // ── Compute analytics ──────────────────────────────────────────────────────

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = new Date(Date.now() - days * 86_400_000);

  const filtered = orders.filter(o => new Date(o.submitted_at) >= cutoff);
  const completed = filtered.filter(o => o.status === 'collected');
  const revenue = completed.reduce((s, o) => s + (o.total_price ?? 0), 0);
  const avgOrderValue = completed.length ? revenue / completed.length : 0;

  // Orders by paper size
  const bySizeMap: Record<string, number> = {};
  filtered.forEach(o => {
    bySizeMap[o.paper_size] = (bySizeMap[o.paper_size] ?? 0) + 1;
  });
  const bySize = Object.entries(bySizeMap).sort((a, b) => b[1] - a[1]);

  // Orders by colour mode
  const colourCount = filtered.filter(o => o.colour_mode === 'colour').length;
  const bwCount = filtered.filter(o => o.colour_mode === 'blackwhite').length;

  // Daily breakdown (last N days)
  const dailyMap: Record<string, DayStats> = {};
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { date: key, orders: 0, revenue: 0, completed: 0 };
  }
  filtered.forEach(o => {
    const key = o.submitted_at.split('T')[0];
    if (dailyMap[key]) {
      dailyMap[key].orders += 1;
      if (o.status === 'collected') {
        dailyMap[key].completed += 1;
        dailyMap[key].revenue += o.total_price ?? 0;
      }
    }
  });
  const daily = Object.values(dailyMap);
  const maxOrders = Math.max(...daily.map(d => d.orders), 1);

  // Status breakdown
  const statusCount: Record<string, number> = {};
  filtered.forEach(o => { statusCount[o.status] = (statusCount[o.status] ?? 0) + 1; });

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar variant="admin" />

      <div className="page-container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-900">Analytics</h1>
            <p className="text-stone-500 text-sm mt-0.5">Your shop performance at a glance</p>
          </div>
          {/* Range selector */}
          <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1">
            {(['7d', '30d', '90d'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                  range === r ? 'bg-navy-700 text-white' : 'text-stone-500 hover:text-stone-800',
                )}
              >
                {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Orders"
            value={filtered.length.toString()}
            sub={`in last ${days} days`}
            icon={Package}
            color="navy"
            trend={+12}
          />
          <KpiCard
            label="Completed"
            value={completed.length.toString()}
            sub={`${filtered.length ? Math.round(completed.length / filtered.length * 100) : 0}% completion rate`}
            icon={Star}
            color="emerald"
          />
          <KpiCard
            label="Revenue"
            value={formatPrice(revenue)}
            sub={`avg ${formatPrice(avgOrderValue)} / order`}
            icon={DollarSign}
            color="amber"
          />
          <KpiCard
            label="Pending"
            value={orders.filter(o => ['pending','queued','printing'].includes(o.status)).length.toString()}
            sub="need action now"
            icon={Clock}
            color={orders.filter(o => o.status === 'pending').length > 10 ? 'red' : 'blue'}
          />
        </div>

        {/* Bar chart */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-navy-900 mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-navy-600" />
            Daily Orders
          </h2>
          <div className="flex items-end gap-1 h-36 overflow-x-auto pb-2">
            {daily.map((d, i) => {
              const height = maxOrders > 0 ? (d.orders / maxOrders) * 100 : 0;
              const isToday = d.date === new Date().toISOString().split('T')[0];
              return (
                <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-[20px] group">
                  <div className="relative w-full flex items-end justify-center" style={{ height: '120px' }}>
                    <div
                      title={`${d.date}: ${d.orders} orders`}
                      className={cn(
                        'w-full rounded-t-lg transition-all duration-300 cursor-pointer',
                        'group-hover:opacity-80',
                        isToday ? 'bg-amber-500' : 'bg-navy-200',
                        d.orders === 0 && 'opacity-30',
                      )}
                      style={{ height: `${Math.max(height, d.orders > 0 ? 8 : 2)}%` }}
                    />
                    {/* Tooltip */}
                    {d.orders > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                        {d.orders} orders
                      </div>
                    )}
                  </div>
                  {(i === 0 || i === Math.floor(daily.length / 2) || i === daily.length - 1) && (
                    <span className="text-xs text-stone-400 rotate-0">
                      {new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Paper sizes */}
          <div className="card p-5 sm:col-span-2">
            <h3 className="font-display font-semibold text-navy-900 mb-4">Orders by Paper Size</h3>
            <div className="space-y-2.5">
              {bySize.map(([size, count]) => {
                const pct = filtered.length ? (count / filtered.length) * 100 : 0;
                return (
                  <div key={size}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-stone-700">{size}</span>
                      <span className="text-stone-400">{count} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-navy-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Colour vs B&W */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-navy-900 mb-4">Colour Split</h3>
            <div className="space-y-4">
              <MiniDonut colour={colourCount} bw={bwCount} />
              <div className="space-y-2">
                <LegendRow color="bg-amber-500" label="Colour" count={colourCount} total={filtered.length} />
                <LegendRow color="bg-stone-400" label="Black & White" count={bwCount} total={filtered.length} />
              </div>
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              const csv = [
                ['Order #','Student','Paper','Mode','Copies','Status','Total','Date'],
                ...filtered.map(o => [
                  o.order_number, o.student_name, o.paper_size, o.colour_mode,
                  o.copies, o.status, o.total_price?.toFixed(2) ?? '', o.submitted_at,
                ]),
              ].map(r => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `printflow-orders-${range}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn-outline btn-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType; color: string; trend?: number;
}) {
  const colors: Record<string, string> = {
    navy:    'bg-navy-50 text-navy-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    blue:    'bg-blue-50 text-blue-600',
    red:     'bg-red-50 text-red-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && (
          <span className={cn(
            'text-xs font-medium flex items-center gap-0.5',
            trend >= 0 ? 'text-emerald-600' : 'text-red-600',
          )}>
            <TrendingUp className="w-3 h-3" />
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="font-display font-bold text-2xl text-stone-900">{value}</div>
      <div className="text-xs text-stone-500 mt-1">{label}</div>
      <div className="text-xs text-stone-400 mt-0.5">{sub}</div>
    </div>
  );
}

function MiniDonut({ colour, bw }: { colour: number; bw: number }) {
  const total = colour + bw || 1;
  const colourPct = colour / total;
  const r = 28, cx = 36, cy = 36, circ = 2 * Math.PI * r;
  const colourDash = colourPct * circ;

  return (
    <div className="flex justify-center">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke="#F59E0B"
          strokeWidth="8"
          strokeDasharray={`${colourDash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
    </div>
  );
}

function LegendRow({ color, label, count, total }: { color: string; label: string; count: number; total: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={cn('w-3 h-3 rounded-full flex-shrink-0', color)} />
      <span className="text-stone-600 flex-1">{label}</span>
      <span className="font-medium text-stone-800">{count}</span>
      <span className="text-stone-400 text-xs">({total ? Math.round(count / total * 100) : 0}%)</span>
    </div>
  );
}
