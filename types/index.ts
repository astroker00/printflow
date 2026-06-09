// ─────────────────────────────────────────────────────────────────────────────
// PrintFlow — Shared Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'queued'
  | 'printing'
  | 'ready'
  | 'collected'
  | 'cancelled';

export type PaperSize = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'Custom';
export type ColourMode = 'colour' | 'blackwhite';
export type BindingType = 'none' | 'staple' | 'spiral' | 'hardcover' | 'clip';
export type PaymentStatus = 'unpaid' | 'paid' | 'waived';
export type Currency = 'USD' | 'EUR' | 'TRY' | 'SAR' | 'AED';

// ─── Database row types ───────────────────────────────────────────────────────

export interface Shop {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  telegram_chat_id?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  accent_color: string;
  is_active: boolean;
  settings: ShopSettings;
  created_at: string;
  updated_at: string;
}

export interface ShopSettings {
  accepts_a0: boolean;
  accepts_a1: boolean;
  accepts_colour: boolean;
  auto_notify_student: boolean;
  max_file_size_mb: number;
}

export interface OrderFile {
  name: string;
  url: string;
  size: number;       // bytes
  pages?: number;
  storage_path: string;
}

export interface Order {
  id: string;
  order_number: string;
  shop_id: string;

  // Student
  student_name: string;
  student_phone: string;
  student_email?: string;
  student_notes?: string;

  // Print specs
  paper_size: PaperSize;
  colour_mode: ColourMode;
  copies: number;
  double_sided: boolean;
  binding: BindingType;
  page_count?: number;

  // Files
  files: OrderFile[];

  // Status
  status: OrderStatus;
  priority: number;
  admin_notes?: string;

  // Pricing
  unit_price?: number;
  total_price?: number;
  currency: Currency;
  payment_status: PaymentStatus;

  // Timestamps
  submitted_at: string;
  queued_at?: string;
  printing_at?: string;
  ready_at?: string;
  collected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  status: OrderStatus;
  actor: 'system' | 'admin' | 'student';
  note?: string;
  created_at: string;
}

export interface PricingRow {
  id: string;
  shop_id: string;
  paper_size: PaperSize;
  colour_mode: ColourMode;
  price: number;
  currency: Currency;
  updated_at: string;
}

export interface Stock {
  id: string;
  shop_id: string;
  paper_size: PaperSize;
  sheets: number;
  alert_at: number;
  updated_at: string;
}

// ─── API payloads ─────────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  shop_id: string;
  student_name: string;
  student_phone: string;
  student_email?: string;
  student_notes?: string;
  paper_size: PaperSize;
  colour_mode: ColourMode;
  copies: number;
  double_sided: boolean;
  binding: BindingType;
  files: OrderFile[];
}

export interface UpdateOrderPayload {
  status?: OrderStatus;
  admin_notes?: string;
  priority?: number;
  payment_status?: PaymentStatus;
}

// ─── UI / Component types ─────────────────────────────────────────────────────

export interface PriceBreakdown {
  unit_price: number;
  copies: number;
  pages: number;
  sheets: number;   // = pages / 2 if double_sided, else pages
  subtotal: number;
  binding_cost: number;
  total: number;
  currency: Currency;
}

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; icon: string; description: string }
> = {
  pending:   {
    label: 'Pending',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: '⏳',
    description: 'Your order has been received and is awaiting confirmation.',
  },
  queued: {
    label: 'In Queue',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: '📋',
    description: 'Your order is confirmed and waiting in the print queue.',
  },
  printing: {
    label: 'Printing',
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
    icon: '🖨️',
    description: 'Your documents are currently being printed.',
  },
  ready: {
    label: 'Ready for Pickup',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: '✅',
    description: 'Your prints are ready! Come collect them from the shop.',
  },
  collected: {
    label: 'Collected',
    color: 'text-stone-500',
    bg: 'bg-stone-50 border-stone-200',
    icon: '🎉',
    description: 'Order complete. Your documents have been collected.',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: '❌',
    description: 'This order has been cancelled.',
  },
};

export const PAPER_SIZE_DIMS: Record<PaperSize, string> = {
  A0: '841 × 1189 mm',
  A1: '594 × 841 mm',
  A2: '420 × 594 mm',
  A3: '297 × 420 mm',
  A4: '210 × 297 mm',
  A5: '148 × 210 mm',
  Custom: 'Custom size',
};

export const BINDING_LABELS: Record<BindingType, string> = {
  none:      'No binding',
  staple:    'Staple',
  spiral:    'Spiral binding',
  hardcover: 'Hard cover',
  clip:      'Binder clip',
};

export const BINDING_PRICES: Record<BindingType, number> = {
  none:      0,
  staple:    0.25,
  spiral:    2.00,
  hardcover: 5.00,
  clip:      0.50,
};
