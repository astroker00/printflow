'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Printer, ArrowLeft, Phone, FileText, RefreshCw, Search,
} from 'lucide-react';
import { Button, StatusBadge, Spinner, Input } from '@/components/ui';
import { OrderTimeline } from '@/components/tracking/OrderTimeline';
import { createClient } from '@/lib/supabase/client';
import { cn, formatDate, formatFileSize } from '@/lib/utils';
import type { Order, OrderEvent } from '@/types';
import { STATUS_CONFIG, PAPER_SIZE_DIMS } from '@/types';

export default function TrackPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.orderId as string | undefined;

  const [order, setOrder]   = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  // Search state when no orderId is in URL
  const [searchVal, setSearchVal] = useState('');

  const orderId = rawId ?? '';

  // ── Fetch order ────────────────────────────────────────────────────────────

  const fetchOrder = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        setError('Order not found. Please check your order number.');
        setOrder(null);
      } else if (!res.ok) {
        setError('Failed to load order. Please try again.');
        setOrder(null);
      } else {
        const data = await res.json();
        setOrder(data.order);
        setEvents(data.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrder(orderId);
    else setLoading(false);
  }, [orderId]);

  // ── Real-time subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (!order?.id) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        payload => {
          setOrder(payload.new as Order);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_events', filter: `order_id=eq.${order.id}` },
        payload => {
          setEvents(prev => [...prev, payload.new as OrderEvent]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [order?.id]);

  // ── Search screen (no ID in URL) ───────────────────────────────────────────

  if (!orderId) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <span className="w-8 h-8 bg-navy-700 rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-amber-400" />
            </span>
            <span className="font-display font-bold text-navy-700 text-lg">PrintFlow</span>
          </Link>

          <div className="card p-8">
            <div className="w-12 h-12 bg-navy-100 rounded-2xl flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-navy-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-navy-900 mb-2">Track your order</h1>
            <p className="text-stone-500 text-sm mb-6">
              Enter your order number to see the current status.
            </p>
            <div className="flex gap-3">
              <Input
                placeholder="e.g. PF-202411-0042"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && searchVal && router.push(`/track/${searchVal}`)}
                className="font-mono"
              />
              <Button
                variant="accent"
                onClick={() => searchVal && router.push(`/track/${searchVal}`)}
                disabled={!searchVal.trim()}
              >
                Track
              </Button>
            </div>
          </div>

          <p className="text-center text-sm text-stone-400 mt-6">
            Need to place an order?{' '}
            <Link href="/order" className="text-navy-600 font-medium hover:underline">
              Order now →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-stone-400 text-sm">Loading order…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !order) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">😕</span>
          </div>
          <h2 className="font-display text-xl font-bold text-stone-800 mb-2">Order not found</h2>
          <p className="text-stone-500 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/track" className="btn-outline">Try again</Link>
            <Link href="/order" className="btn-accent">Place an order</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Order found ────────────────────────────────────────────────────────────

  const cfg = STATUS_CONFIG[order.status];
  const isReady = order.status === 'ready';

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-7 h-7 bg-navy-700 rounded-lg flex items-center justify-center">
              <Printer className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <span className="font-display font-bold text-navy-700">PrintFlow</span>
          </Link>
          <button
            onClick={() => fetchOrder(orderId)}
            className="btn-ghost btn-sm"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Status hero */}
        <div className={cn(
          'rounded-3xl border-2 p-6 text-center transition-all',
          isReady ? 'border-emerald-300 bg-emerald-50' : cfg.bg + ' border-current/20',
        )}>
          <div className="text-5xl mb-3">{cfg.icon}</div>
          <div className="flex justify-center mb-2">
            <StatusBadge status={order.status} />
          </div>
          <p className={cn('text-sm mt-2 font-medium', cfg.color)}>{cfg.description}</p>

          {isReady && (
            <div className="mt-4 p-3 bg-white rounded-2xl border border-emerald-200">
              <p className="text-sm text-emerald-800 font-medium">
                📍 Show this screen when you arrive at the shop to collect your prints.
              </p>
            </div>
          )}
        </div>

        {/* Order number */}
        <div className="card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400 mb-0.5">Order number</div>
            <div className="font-mono font-bold text-navy-700 text-xl">{order.order_number}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-400 mb-0.5">Placed</div>
            <div className="text-sm text-stone-600">{formatDate(order.submitted_at)}</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-navy-900 mb-5">Order status</h2>
          <OrderTimeline order={order} events={events} />
        </div>

        {/* Order details */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display font-semibold text-navy-900">Order details</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Spec label="Paper"   value={order.paper_size} sub={PAPER_SIZE_DIMS[order.paper_size]} />
            <Spec label="Mode"    value={order.colour_mode === 'colour' ? '🎨 Colour' : '⚫ B&W'} />
            <Spec label="Copies"  value={`${order.copies}×`} sub={order.double_sided ? '2-sided' : '1-sided'} />
            <Spec label="Total"   value={order.total_price !== undefined ? `$${order.total_price.toFixed(2)}` : '—'} />
          </div>

          {/* Files */}
          {order.files.length > 0 && (
            <div>
              <div className="text-xs text-stone-400 mb-2">Files</div>
              <div className="space-y-1.5">
                {order.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-stone-600">
                    <FileText className="w-3.5 h-3.5 text-stone-400" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-stone-300">·</span>
                    <span className="flex-shrink-0 text-stone-400">{formatFileSize(f.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.student_notes && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs font-medium text-amber-700 mb-0.5">Your note</p>
              <p className="text-sm text-amber-800">{order.student_notes}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/order" className="btn-outline flex-1 justify-center py-3">
            Place another order
          </Link>
          <Link href="/track" className="btn-ghost flex-1 justify-center py-3">
            Track different order
          </Link>
        </div>

        {/* Live indicator */}
        <p className="text-center text-xs text-stone-400 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
          Status updates automatically — no need to refresh
        </p>
      </div>
    </div>
  );
}

function Spec({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-stone-400 mb-0.5">{label}</div>
      <div className="font-medium text-stone-800">{value}</div>
      {sub && <div className="text-xs text-stone-400">{sub}</div>}
    </div>
  );
}
