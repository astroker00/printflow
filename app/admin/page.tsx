'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Printer, RefreshCw, Filter, Search, Bell, Package,
  Clock, CheckCircle2, AlertCircle, TrendingUp,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { QueueItem } from '@/components/admin/QueueItem';
import { Button, Spinner, EmptyState, StatusBadge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types';

type FilterStatus = OrderStatus | 'all';

const FILTER_TABS: { value: FilterStatus; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'pending',   label: 'Pending' },
  { value: 'queued',    label: 'In Queue' },
  { value: 'printing',  label: 'Printing' },
  { value: 'ready',     label: 'Ready' },
  { value: 'collected', label: 'Collected' },
];

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // ── Fetch orders ───────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/orders');
      if (res.status === 401) { router.push('/login'); return; }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Real-time subscription ─────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        payload => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
            toast.success(`New order: ${(payload.new as Order).student_name}`, {
              icon: '🔔',
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev =>
              prev.map(o => o.id === payload.new.id ? payload.new as Order : o)
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Order actions ──────────────────────────────────────────────────────────

  const advanceOrder = async (order: Order) => {
    const next: Record<OrderStatus, OrderStatus | null> = {
      pending: 'queued', queued: 'printing', printing: 'ready', ready: 'collected',
      collected: null, cancelled: null,
    };
    const newStatus = next[order.status];
    if (!newStatus) return;
    await updateStatus(order.id, newStatus);
  };

  const cancelOrder = async (order: Order) => {
    if (!confirm(`Cancel order ${order.order_number}?`)) return;
    await updateStatus(order.id, 'cancelled');
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error('Failed to update order');
    } else {
      const { order } = await res.json();
      setOrders(prev => prev.map(o => o.id === id ? order : o));
      if (status === 'ready') toast.success('Student notified via Telegram ✓');
    }
  };

  const updateNotes = async (order: Order, notes: string) => {
    await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes: notes }),
    });
  };

  // ── Filter + search ────────────────────────────────────────────────────────

  const visible = orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const matchesSearch = !search ||
      o.student_name.toLowerCase().includes(search.toLowerCase()) ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.student_phone.includes(search);
    return matchesFilter && matchesSearch;
  });

  // Sort: active first (printing > queued > pending), then by submitted time
  const STATUS_PRIORITY: Record<OrderStatus, number> = {
    printing: 0, queued: 1, pending: 2, ready: 3, collected: 4, cancelled: 5,
  };
  const sorted = [...visible].sort((a, b) =>
    STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
    new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
  );

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    pending:  orders.filter(o => o.status === 'pending').length,
    queued:   orders.filter(o => o.status === 'queued').length,
    printing: orders.filter(o => o.status === 'printing').length,
    ready:    orders.filter(o => o.status === 'ready').length,
    today:    orders.filter(o => {
      const d = new Date(o.submitted_at);
      const now = new Date();
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
    }).length,
  };

  const totalActive = stats.pending + stats.queued + stats.printing;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar variant="admin" />

      <div className="page-container py-6 space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-900">Print Queue</h1>
            <p className="text-stone-500 text-sm mt-0.5">
              {totalActive > 0
                ? `${totalActive} order${totalActive !== 1 ? 's' : ''} need your attention`
                : 'All caught up! 🎉'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={refreshing}
            onClick={() => fetchOrders(true)}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Today's orders" value={stats.today} icon={TrendingUp} color="text-navy-700 bg-navy-50 border-navy-200" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} color="text-amber-700 bg-amber-50 border-amber-200" />
          <StatCard label="In Queue" value={stats.queued} icon={Package} color="text-blue-700 bg-blue-50 border-blue-200" />
          <StatCard label="Printing" value={stats.printing} icon={Printer} color="text-violet-700 bg-violet-50 border-violet-200" />
          <StatCard label="Ready" value={stats.ready} icon={CheckCircle2} color="text-emerald-700 bg-emerald-50 border-emerald-200" />
        </div>

        {/* Alert for ready orders */}
        {stats.ready > 0 && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <Bell className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800">
              <strong>{stats.ready} order{stats.ready !== 1 ? 's' : ''}</strong> ready for student pickup.
              Students have been notified.
            </p>
          </div>
        )}

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by name, order number, or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map(tab => {
            const count = tab.value === 'all'
              ? orders.length
              : orders.filter(o => o.status === tab.value).length;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border',
                  filter === tab.value
                    ? 'bg-navy-700 text-white border-navy-700'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50',
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                    filter === tab.value ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Queue */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filter === 'all' && !search ? 'Queue is empty' : 'No matching orders'}
            description={
              filter === 'all' && !search
                ? 'New orders from students will appear here in real time.'
                : 'Try a different filter or search term.'
            }
          />
        ) : (
          <div className="space-y-3">
            {sorted.map((order, i) => (
              <QueueItem
                key={order.id}
                order={order}
                position={i + 1}
                onAdvance={advanceOrder}
                onCancel={cancelOrder}
                onNotesChange={updateNotes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className={cn('card border p-4 flex items-center gap-3', color.split(' ').slice(1).join(' '))}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', color.split(' ')[1], color.split(' ')[2])}>
        <Icon className={cn('w-4 h-4', color.split(' ')[0])} />
      </div>
      <div>
        <div className="font-display font-bold text-2xl text-stone-900">{value}</div>
        <div className="text-xs text-stone-500">{label}</div>
      </div>
    </div>
  );
}
