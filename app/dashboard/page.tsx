'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Printer, Search, Phone, RotateCcw, Package,
  ChevronRight, Clock, CheckCircle2, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, StatusBadge, EmptyState, Spinner } from '@/components/ui';
import { cn, formatDate, formatRelative } from '@/lib/utils';
import type { Order } from '@/types';
import { STATUS_CONFIG, PAPER_SIZE_DIMS } from '@/types';

/**
 * Student dashboard — no auth required.
 * Students look up their order history by phone number.
 */
export default function DashboardPage() {
  const router = useRouter();

  const [phone, setPhone]     = useState('');
  const [orders, setOrders]   = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Restore phone from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pf_phone');
    if (saved) { setPhone(saved); handleSearch(saved); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (ph?: string) => {
    const query = (ph ?? phone).trim();
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/by-phone?phone=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setOrders(data.orders ?? []);
      setSearched(true);
      localStorage.setItem('pf_phone', query);
    } catch {
      toast.error('Could not find orders. Check the number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (order: Order) => {
    // Pre-fill the order form via URL params
    const params = new URLSearchParams({
      paper_size:   order.paper_size,
      colour_mode:  order.colour_mode,
      copies:       order.copies.toString(),
      double_sided: order.double_sided ? '1' : '0',
      binding:      order.binding,
      name:         order.student_name,
      phone:        order.student_phone,
      email:        order.student_email ?? '',
    });
    router.push(`/order?${params.toString()}`);
  };

  // Group orders by recency
  const active    = orders.filter(o => ['pending','queued','printing','ready'].includes(o.status));
  const completed = orders.filter(o => ['collected','cancelled'].includes(o.status));

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-7 h-7 bg-navy-700 rounded-lg flex items-center justify-center">
              <Printer className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <span className="font-display font-bold text-navy-700">PrintFlow</span>
          </Link>
          <Link href="/order" className="btn-accent btn-sm">
            New order
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">My Orders</h1>
          <p className="text-stone-500 text-sm mt-1">
            Enter your phone number to see your order history.
          </p>
        </div>

        {/* Phone lookup */}
        <div className="card p-5">
          <div className="flex gap-3">
            <Input
              type="tel"
              placeholder="+1 234 567 8900"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              leftIcon={<Phone className="w-4 h-4" />}
              wrapperClassName="flex-1"
            />
            <Button
              variant="primary"
              onClick={() => handleSearch()}
              loading={loading}
              icon={<Search className="w-4 h-4" />}
              disabled={!phone.trim()}
            >
              Look up
            </Button>
          </div>
          {searched && !loading && (
            <p className="text-xs text-stone-400 mt-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Found {orders.length} order{orders.length !== 1 ? 's' : ''} for this number
            </p>
          )}
        </div>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && searched && orders.length === 0 && (
          <EmptyState
            icon={Package}
            title="No orders found"
            description="We couldn't find any orders with that phone number. Try a different number or place a new order."
            action={
              <Link href="/order" className="btn-accent">
                Place an order
              </Link>
            }
          />
        )}

        {!loading && active.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-navy-900 text-sm uppercase tracking-wide">
              Active Orders
            </h2>
            {active.map(order => (
              <DashboardOrderCard
                key={order.id}
                order={order}
                onReorder={handleReorder}
              />
            ))}
          </div>
        )}

        {!loading && completed.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-stone-400 text-sm uppercase tracking-wide">
              Past Orders
            </h2>
            {completed.map(order => (
              <DashboardOrderCard
                key={order.id}
                order={order}
                onReorder={handleReorder}
                muted
              />
            ))}
          </div>
        )}

        {/* No phone yet — show CTA */}
        {!searched && !loading && (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-navy-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-navy-500" />
            </div>
            <p className="text-stone-500 text-sm mb-5">
              Haven't placed an order yet?
            </p>
            <Link href="/order" className="btn-accent">
              Place your first order →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

function DashboardOrderCard({
  order,
  onReorder,
  muted = false,
}: {
  order: Order;
  onReorder: (o: Order) => void;
  muted?: boolean;
}) {
  const cfg     = STATUS_CONFIG[order.status];
  const isReady = order.status === 'ready';

  return (
    <div className={cn(
      'rounded-2xl border bg-white overflow-hidden transition-shadow',
      isReady && 'border-emerald-300 shadow-md ring-1 ring-emerald-100',
      !isReady && 'border-stone-200 hover:shadow-soft',
      muted && 'opacity-75',
    )}>
      {/* Ready highlight bar */}
      {isReady && (
        <div className="bg-emerald-500 px-4 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-semibold">Ready for pickup! 🎉</span>
        </div>
      )}

      <div className="p-4 flex items-start gap-3">
        {/* Status icon */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg',
          cfg.bg,
        )}>
          {cfg.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-stone-400">{order.order_number}</span>
            <StatusBadge status={order.status} size="sm" />
          </div>
          <div className="text-sm font-medium text-stone-700 mt-0.5">
            {order.paper_size} · {order.colour_mode === 'colour' ? 'Colour' : 'B&W'} · {order.copies}×
          </div>
          <div className="text-xs text-stone-400 mt-0.5">
            {order.files.length} file{order.files.length !== 1 ? 's' : ''} · {formatRelative(order.submitted_at)}
            {order.total_price !== undefined && ` · $${order.total_price.toFixed(2)}`}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onReorder(order)}
            className="btn-ghost btn-sm text-stone-500"
            title="Reorder with same settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <Link
            href={`/track/${order.order_number}`}
            className="btn-outline btn-sm"
          >
            Track
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
