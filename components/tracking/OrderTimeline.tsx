'use client';

import { CheckCircle2, Circle, Clock, Printer, Package, Star } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { Order, OrderEvent, OrderStatus } from '@/types';
import { STATUS_CONFIG } from '@/types';

const TIMELINE_STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'pending',   label: 'Order received',   icon: Clock },
  { status: 'queued',    label: 'Added to queue',   icon: Package },
  { status: 'printing',  label: 'Printing now',     icon: Printer },
  { status: 'ready',     label: 'Ready for pickup', icon: CheckCircle2 },
  { status: 'collected', label: 'Collected',        icon: Star },
];

interface OrderTimelineProps {
  order: Order;
  events: OrderEvent[];
}

export function OrderTimeline({ order, events }: OrderTimelineProps) {
  const STATUS_ORDER: OrderStatus[] = ['pending', 'queued', 'printing', 'ready', 'collected'];
  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  const getEventTime = (status: OrderStatus): string | undefined =>
    events.find(e => e.status === status)?.created_at;

  return (
    <div className="space-y-1">
      {TIMELINE_STEPS.map((step, i) => {
        const isCompleted = !isCancelled && i < currentIdx;
        const isCurrent   = !isCancelled && i === currentIdx;
        const isPending   = isCancelled || i > currentIdx;
        const eventTime   = getEventTime(step.status);

        return (
          <div key={step.status} className="flex gap-4">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300',
                isCompleted && 'bg-emerald-500',
                isCurrent   && 'bg-navy-700 ring-4 ring-navy-100',
                isPending   && 'bg-stone-200',
              )}>
                <step.icon className={cn(
                  'w-4 h-4',
                  isCompleted && 'text-white',
                  isCurrent   && 'text-white',
                  isPending   && 'text-stone-400',
                )} />
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={cn(
                  'w-0.5 flex-1 my-1 min-h-[1.5rem] transition-colors duration-300',
                  isCompleted ? 'bg-emerald-400' : 'bg-stone-200',
                )} />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-4 flex-1', i === TIMELINE_STEPS.length - 1 && 'pb-0')}>
              <div className={cn(
                'font-medium text-sm transition-colors',
                isCompleted && 'text-emerald-700',
                isCurrent   && 'text-navy-700',
                isPending   && 'text-stone-400',
              )}>
                {step.label}
                {isCurrent && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-navy-500 font-normal">
                    <span className="w-1.5 h-1.5 rounded-full bg-navy-500 animate-pulse-soft" />
                    Current
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-400 mt-0.5">
                {eventTime ? formatDate(eventTime) : isPending ? 'Pending…' : ''}
              </div>
            </div>
          </div>
        );
      })}

      {/* Cancelled state */}
      {isCancelled && (
        <div className="flex gap-4 mt-1">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100">
            <span className="text-red-600 text-sm">✕</span>
          </div>
          <div className="flex-1 pt-1.5">
            <div className="text-sm font-medium text-red-700">Order cancelled</div>
            <div className="text-xs text-stone-400 mt-0.5">
              {getEventTime('cancelled') ? formatDate(getEventTime('cancelled')!) : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
