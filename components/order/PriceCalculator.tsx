'use client';

import { useMemo } from 'react';
import { Calculator, Info } from 'lucide-react';
import { calculatePrice, formatPrice } from '@/lib/pricing';
import type { PaperSize, ColourMode, BindingType, PricingRow } from '@/types';
import { BINDING_PRICES } from '@/types';
import { cn } from '@/lib/utils';

interface PriceCalculatorProps {
  paper_size: PaperSize;
  colour_mode: ColourMode;
  copies: number;
  pages: number;
  double_sided: boolean;
  binding: BindingType;
  pricing?: PricingRow[];
  className?: string;
}

export function PriceCalculator({
  paper_size, colour_mode, copies, pages, double_sided, binding, pricing, className,
}: PriceCalculatorProps) {
  const breakdown = useMemo(() => {
    if (!pages || pages < 1) return null;
    return calculatePrice({ paper_size, colour_mode, copies, pages, double_sided, binding, pricing });
  }, [paper_size, colour_mode, copies, pages, double_sided, binding, pricing]);

  const hasPages = pages >= 1;

  return (
    <div className={cn('rounded-2xl border border-stone-200 bg-white overflow-hidden', className)}>
      {/* Header */}
      <div className="px-5 py-4 bg-navy-50 border-b border-navy-100 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-navy-600" />
        <h3 className="font-semibold text-navy-700 text-sm">Estimated Cost</h3>
      </div>

      <div className="p-5 space-y-3">
        {!hasPages ? (
          <div className="flex items-start gap-2 text-sm text-stone-400">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Enter number of pages to see price estimate.</span>
          </div>
        ) : breakdown ? (
          <>
            {/* Line items */}
            <div className="space-y-2 text-sm">
              <LineItem
                label={`${paper_size} · ${colour_mode === 'colour' ? 'Colour' : 'B&W'}`}
                value={formatPrice(breakdown.unit_price)}
                sublabel="per sheet"
              />
              <LineItem
                label={`${breakdown.sheets} sheet${breakdown.sheets !== 1 ? 's' : ''}`}
                sublabel={`${pages} page${pages !== 1 ? 's' : ''} × ${copies} cop${copies !== 1 ? 'ies' : 'y'}${double_sided ? ' (double-sided)' : ''}`}
                value={formatPrice(breakdown.subtotal)}
              />
              {breakdown.binding_cost > 0 && (
                <LineItem
                  label={`Binding`}
                  sublabel={`${copies} × ${formatPrice(BINDING_PRICES[binding])}`}
                  value={formatPrice(breakdown.binding_cost)}
                />
              )}
            </div>

            <div className="border-t border-stone-200 pt-3 mt-3 flex items-center justify-between">
              <span className="font-semibold text-stone-800 text-sm">Total</span>
              <span className="font-display font-bold text-2xl text-navy-700">
                {formatPrice(breakdown.total)}
              </span>
            </div>

            <p className="text-xs text-stone-400 flex items-start gap-1.5 pt-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Final price confirmed at the shop. This is an estimate.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function LineItem({ label, sublabel, value }: { label: string; sublabel?: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <span className="text-stone-700">{label}</span>
        {sublabel && <div className="text-xs text-stone-400 mt-0.5">{sublabel}</div>}
      </div>
      <span className="text-stone-700 font-medium tabular-nums flex-shrink-0">{value}</span>
    </div>
  );
}
