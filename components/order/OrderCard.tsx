'use client';

import { FileText, Clock, Printer, Phone, Hash, Copy, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { cn, formatDate, formatRelative, formatFileSize } from '@/lib/utils';
import { StatusBadge } from '@/components/ui';
import type { Order } from '@/types';
import { PAPER_SIZE_DIMS } from '@/types';

interface OrderCardProps {
  order: Order;
  variant?: 'student' | 'admin';
  onReorder?: (order: Order) => void;
  onStatusChange?: (order: Order, status: Order['status']) => void;
  compact?: boolean;
}

export function OrderCard({
  order, variant = 'student', onReorder, onStatusChange, compact = false,
}: OrderCardProps) {
  const isAdmin = variant === 'admin';

  return (
    <div className={cn(
      'card overflow-hidden transition-shadow hover:shadow-medium',
      compact && 'shadow-none border-stone-100',
    )}>
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-stone-100">
        <div className="flex items-center gap-3 min-w-0">
          {/* File icon */}
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            order.status === 'printing' ? 'bg-violet-100' :
            order.status === 'ready'    ? 'bg-emerald-100' :
            order.status === 'queued'   ? 'bg-blue-100'    : 'bg-stone-100',
          )}>
            {order.status === 'printing' ? (
              <Printer className="w-4 h-4 text-violet-600 animate-pulse-soft" />
            ) : (
              <FileText className={cn(
                'w-4 h-4',
                order.status === 'ready'  ? 'text-emerald-600' :
                order.status === 'queued' ? 'text-blue-600'    : 'text-stone-500',
              )} />
            )}
          </div>

          {/* Order info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-medium text-stone-500">
                #{order.order_number}
              </span>
              <StatusBadge status={order.status} size="sm" />
            </div>
            {isAdmin && (
              <div className="font-semibold text-stone-800 text-sm mt-0.5 truncate">
                {order.student_name}
              </div>
            )}
            {!isAdmin && (
              <div className="text-sm text-stone-600 mt-0.5">
                {order.files.length} file{order.files.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-stone-400 whitespace-nowrap">
            {formatRelative(order.submitted_at)}
          </span>
        </div>
      </div>

      {/* Specs */}
      <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Spec label="Paper" value={order.paper_size} sub={PAPER_SIZE_DIMS[order.paper_size]} />
        <Spec label="Mode"  value={order.colour_mode === 'colour' ? 'Colour 🎨' : 'B&W ⚫'} />
        <Spec label="Copies" value={`${order.copies}×`} sub={order.double_sided ? 'Double-sided' : 'Single-sided'} />
        <Spec label="Binding" value={capitalise(order.binding)} />
      </div>

      {/* Files */}
      {order.files.length > 0 && !compact && (
        <div className="px-5 pb-3 space-y-1">
          {order.files.slice(0, 3).map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-stone-500">
              <FileText className="w-3 h-3 text-stone-400" />
              <span className="truncate">{f.name}</span>
              <span className="text-stone-300">·</span>
              <span className="flex-shrink-0">{formatFileSize(f.size)}</span>
            </div>
          ))}
          {order.files.length > 3 && (
            <p className="text-xs text-stone-400">+{order.files.length - 3} more files</p>
          )}
        </div>
      )}

      {/* Notes */}
      {order.student_notes && !compact && (
        <div className="mx-5 mb-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs text-amber-800">
            <span className="font-medium">Note: </span>{order.student_notes}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-3 flex-wrap">
        {/* Price */}
        <div className="flex items-center gap-4">
          {order.total_price !== undefined && order.total_price !== null ? (
            <span className="font-semibold text-navy-700">
              ${order.total_price.toFixed(2)}
            </span>
          ) : (
            <span className="text-sm text-stone-400">Price TBD</span>
          )}

          {/* Admin: phone */}
          {isAdmin && (
            <a href={`tel:${order.student_phone}`}
               className="flex items-center gap-1 text-xs text-stone-500 hover:text-navy-700 transition-colors">
              <Phone className="w-3 h-3" />
              {order.student_phone}
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Student: track & reorder */}
          {!isAdmin && (
            <>
              <Link
                href={`/track/${order.order_number}`}
                className="btn-outline btn-sm"
              >
                Track order
              </Link>
              {onReorder && (
                <button
                  type="button"
                  onClick={() => onReorder(order)}
                  className="btn-ghost btn-sm"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reorder
                </button>
              )}
            </>
          )}

          {/* Admin: status change */}
          {isAdmin && onStatusChange && (
            <AdminActions order={order} onStatusChange={onStatusChange} />
          )}
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-stone-400 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-stone-800">{value}</div>
      {sub && <div className="text-xs text-stone-400">{sub}</div>}
    </div>
  );
}

function AdminActions({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (order: Order, status: Order['status']) => void;
}) {
  const next: Record<Order['status'], { label: string; status: Order['status']; className: string } | null> = {
    pending:   { label: '→ Queue',     status: 'queued',    className: 'btn-outline btn-sm' },
    queued:    { label: '🖨 Print',    status: 'printing',  className: 'btn-primary btn-sm' },
    printing:  { label: '✓ Done',     status: 'ready',     className: 'btn-accent btn-sm'  },
    ready:     { label: 'Collected',   status: 'collected', className: 'btn-outline btn-sm' },
    collected: null,
    cancelled: null,
  };

  const action = next[order.status];

  return (
    <div className="flex items-center gap-2">
      {action && (
        <button
          type="button"
          onClick={() => onStatusChange(order, action.status)}
          className={cn('btn', action.className)}
        >
          {action.label}
        </button>
      )}
      {order.status !== 'collected' && order.status !== 'cancelled' && (
        <button
          type="button"
          onClick={() => onStatusChange(order, 'cancelled')}
          className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function capitalise(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
