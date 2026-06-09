'use client';

import { useState } from 'react';
import {
  Printer, CheckCircle2, ChevronDown, ChevronUp,
  Phone, MessageSquare, FileText, Clock, AlertCircle, Download,
} from 'lucide-react';
import { cn, formatRelative, formatFileSize, truncateFilename } from '@/lib/utils';
import { StatusBadge } from '@/components/ui';
import type { Order } from '@/types';
import { PAPER_SIZE_DIMS, BINDING_LABELS } from '@/types';

interface QueueItemProps {
  order: Order;
  position: number;
  onAdvance: (order: Order) => void;
  onCancel: (order: Order) => void;
  onNotesChange: (order: Order, notes: string) => void;
}

export function QueueItem({ order, position, onAdvance, onCancel, onNotesChange }: QueueItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(order.admin_notes ?? '');

  const isPrinting = order.status === 'printing';
  const isReady    = order.status === 'ready';
  const isDone     = order.status === 'collected' || order.status === 'cancelled';

  const advanceLabel = {
    pending:  'Add to Queue →',
    queued:   'Start Printing 🖨',
    printing: '✓ Mark Done',
    ready:    'Mark Collected',
    collected: '',
    cancelled: '',
  }[order.status] ?? '';

  const advanceClass = {
    pending:  'btn-outline',
    queued:   'btn-primary',
    printing: 'btn-accent',
    ready:    'btn-outline',
  }[order.status as string] ?? 'btn-outline';

  return (
    <div className={cn(
      'rounded-2xl border bg-white overflow-hidden transition-all duration-200',
      isPrinting && 'border-violet-300 shadow-md ring-1 ring-violet-200',
      isReady    && 'border-emerald-300',
      isDone     && 'opacity-60 border-stone-200',
      !isPrinting && !isReady && !isDone && 'border-stone-200 hover:border-stone-300',
    )}>
      {/* Printing progress bar */}
      {isPrinting && (
        <div className="h-1 bg-violet-100">
          <div className="h-full bg-violet-500 animate-[shimmer_2s_linear_infinite] bg-[length:200%_100%] bg-shimmer-gradient" />
        </div>
      )}

      {/* Main row */}
      <div className="px-4 py-3.5 flex items-center gap-3">
        {/* Position badge */}
        <div className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
          isPrinting ? 'bg-violet-100 text-violet-700' :
          isReady    ? 'bg-emerald-100 text-emerald-700' :
          'bg-stone-100 text-stone-500',
        )}>
          {isDone ? '✓' : position}
        </div>

        {/* Core info */}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
          {/* Student */}
          <div className="min-w-0">
            <div className="font-semibold text-stone-800 truncate">{order.student_name}</div>
            <div className="text-xs text-stone-400 font-mono">{order.order_number}</div>
          </div>

          {/* Specs */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'badge text-xs',
              'bg-navy-50 border-navy-200 text-navy-700 font-bold',
            )}>
              {order.paper_size}
            </span>
            <span className={cn(
              'badge text-xs',
              order.colour_mode === 'colour'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-stone-100 border-stone-200 text-stone-600',
            )}>
              {order.colour_mode === 'colour' ? '🎨 Colour' : '⚫ B&W'}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              {order.copies}× {order.double_sided ? '(2-sided)' : ''}
            </span>
          </div>

          {/* Files count + time */}
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {order.files.length} file{order.files.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelative(order.submitted_at)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isDone && advanceLabel && (
            <button
              type="button"
              onClick={() => onAdvance(order)}
              className={cn('btn btn-sm', advanceClass)}
            >
              {isPrinting && <CheckCircle2 className="w-3.5 h-3.5" />}
              {advanceLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="btn-ghost btn-sm"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-stone-100 px-4 pb-4 pt-3 space-y-4 animate-fade-in">
          {/* Student contact */}
          <div className="flex flex-wrap gap-3">
            <a
              href={`tel:${order.student_phone}`}
              className="flex items-center gap-1.5 text-sm text-navy-700 hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              {order.student_phone}
            </a>
            {order.student_email && (
              <a
                href={`mailto:${order.student_email}`}
                className="flex items-center gap-1.5 text-sm text-navy-700 hover:underline"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {order.student_email}
              </a>
            )}
          </div>

          {/* Full specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-stone-400 mb-0.5">Paper</div>
              <div className="font-medium">{order.paper_size}</div>
              <div className="text-xs text-stone-400">{PAPER_SIZE_DIMS[order.paper_size]}</div>
            </div>
            <div>
              <div className="text-xs text-stone-400 mb-0.5">Sides</div>
              <div className="font-medium">{order.double_sided ? 'Double-sided' : 'Single-sided'}</div>
            </div>
            <div>
              <div className="text-xs text-stone-400 mb-0.5">Binding</div>
              <div className="font-medium">{BINDING_LABELS[order.binding]}</div>
            </div>
            <div>
              <div className="text-xs text-stone-400 mb-0.5">Price</div>
              <div className="font-medium">${order.total_price?.toFixed(2) ?? '—'}</div>
            </div>
          </div>

          {/* Files */}
          <div>
            <div className="text-xs text-stone-400 mb-2">Files to print</div>
            <div className="space-y-1.5">
              {order.files.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                    <span className="text-sm text-stone-700 truncate">{f.name}</span>
                    <span className="text-xs text-stone-400 flex-shrink-0">{formatFileSize(f.size)}</span>
                  </div>
                  {f.url && (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost btn-sm flex-shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Open
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Student notes */}
          {order.student_notes && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-amber-800 mb-0.5">Student note</div>
                  <div className="text-sm text-amber-700">{order.student_notes}</div>
                </div>
              </div>
            </div>
          )}

          {/* Admin notes */}
          <div>
            <label className="label text-xs">Admin note (internal)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add a note for this order…"
                className="input text-sm py-2"
              />
              <button
                type="button"
                onClick={() => onNotesChange(order, notes)}
                className="btn-outline btn-sm flex-shrink-0"
              >
                Save
              </button>
            </div>
          </div>

          {/* Danger zone */}
          {!isDone && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onCancel(order)}
                className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
              >
                Cancel order
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
