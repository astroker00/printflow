import type {
  PaperSize, ColourMode, BindingType, PriceBreakdown, PricingRow,
} from '@/types';
import { BINDING_PRICES } from '@/types';

/**
 * Calculate the price breakdown for an order.
 * Falls back to default prices when no shop pricing is available.
 */
export function calculatePrice(params: {
  paper_size: PaperSize;
  colour_mode: ColourMode;
  copies: number;
  pages: number;
  double_sided: boolean;
  binding: BindingType;
  pricing?: PricingRow[];
}): PriceBreakdown {
  const { paper_size, colour_mode, copies, pages, double_sided, binding, pricing } = params;

  // Sheets of paper needed (double-sided halves the sheet count)
  const sheets_per_copy = double_sided ? Math.ceil(pages / 2) : pages;
  const total_sheets = sheets_per_copy * copies;

  // Find unit price from shop pricing or use defaults
  const price_row = pricing?.find(
    p => p.paper_size === paper_size && p.colour_mode === colour_mode
  );
  const unit_price = price_row?.price ?? DEFAULT_PRICES[paper_size][colour_mode];

  const subtotal = unit_price * total_sheets;
  const binding_cost = BINDING_PRICES[binding] * copies;
  const total = subtotal + binding_cost;

  return {
    unit_price,
    copies,
    pages,
    sheets: total_sheets,
    subtotal,
    binding_cost,
    total,
    currency: 'USD',
  };
}

/** Default per-sheet prices when shop hasn't configured custom pricing */
export const DEFAULT_PRICES: Record<PaperSize, Record<ColourMode, number>> = {
  A5:     { blackwhite: 0.03,  colour: 0.10 },
  A4:     { blackwhite: 0.05,  colour: 0.15 },
  A3:     { blackwhite: 0.10,  colour: 0.30 },
  A2:     { blackwhite: 0.40,  colour: 1.20 },
  A1:     { blackwhite: 1.00,  colour: 3.00 },
  A0:     { blackwhite: 2.00,  colour: 6.00 },
  Custom: { blackwhite: 0.20,  colour: 0.60 },
};

/** Estimated print time in minutes per sheet */
export const PRINT_TIME_PER_SHEET: Record<PaperSize, number> = {
  A5: 0.25, A4: 0.3, A3: 0.5, A2: 1, A1: 1.5, A0: 2.5, Custom: 1,
};

/** Estimate completion time for an order */
export function estimatePrintTime(sheets: number, paper_size: PaperSize): number {
  return Math.ceil(sheets * PRINT_TIME_PER_SHEET[paper_size]);
}

/** Format price for display */
export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
