import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notifyOwnerNewOrder } from '@/lib/telegram';
import { calculatePrice } from '@/lib/pricing';
import { z } from 'zod';

// ─── Validation ───────────────────────────────────────────────────────────────

const FileSchema = z.object({
  name:         z.string(),
  url:          z.string(),
  size:         z.number(),
  storage_path: z.string(),
  pages:        z.number().optional(),
});

const CreateOrderSchema = z.object({
  shop_id:       z.string().uuid().optional(),
  shop_slug:     z.string().optional(),
  student_name:  z.string().min(1).max(100),
  student_phone: z.string().min(5).max(30),
  student_email: z.string().email().optional().or(z.literal('')),
  student_notes: z.string().max(500).optional(),
  paper_size:    z.enum(['A0','A1','A2','A3','A4','A5','Custom']),
  colour_mode:   z.enum(['colour','blackwhite']),
  copies:        z.number().int().min(1).max(100),
  double_sided:  z.boolean().default(false),
  binding:       z.enum(['none','staple','spiral','hardcover','clip']).default('none'),
  files:         z.array(FileSchema).min(1),
});

// ─── GET — Admin: list shop orders ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the shop owned by this user
  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_user_id', user.id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: 'No shop found for this account' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '200'), 500);
  const status = searchParams.get('status');
  const since  = searchParams.get('since');

  let query = supabase
    .from('orders')
    .select('*')
    .eq('shop_id', shop.id)
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (since)  query = query.gte('submitted_at', since);

  const { data: orders, error } = await query;

  if (error) {
    console.error('[GET /api/orders]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  return NextResponse.json({ orders: orders ?? [] });
}

// ─── POST — Public: submit a new order ───────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const data  = parsed.data;
  const admin = createAdminClient();

  // Resolve shop_id from slug if not provided directly
  let shopId = data.shop_id;
  if (!shopId && data.shop_slug) {
    const { data: shop } = await admin
      .from('shops')
      .select('id')
      .eq('slug', data.shop_slug)
      .eq('is_active', true)
      .single();
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    shopId = shop.id;
  }
  if (!shopId) {
    return NextResponse.json({ error: 'shop_id or shop_slug is required' }, { status: 400 });
  }

  // Fetch shop pricing for accurate cost calculation
  const { data: pricingRows } = await admin
    .from('pricing')
    .select('*')
    .eq('shop_id', shopId);

  // Infer page count from file metadata (students can provide it, else default to 1/file)
  const totalPages = data.files.reduce((s, f) => s + (f.pages ?? 1), 0) || 1;

  const breakdown = calculatePrice({
    paper_size:   data.paper_size,
    colour_mode:  data.colour_mode,
    copies:       data.copies,
    pages:        totalPages,
    double_sided: data.double_sided,
    binding:      data.binding,
    pricing:      pricingRows ?? [],
  });

  // Insert — order_number generated automatically by DB trigger
  const { data: order, error } = await admin
    .from('orders')
    .insert({
      shop_id:       shopId,
      student_name:  data.student_name,
      student_phone: data.student_phone,
      student_email: data.student_email || null,
      student_notes: data.student_notes || null,
      paper_size:    data.paper_size,
      colour_mode:   data.colour_mode,
      copies:        data.copies,
      double_sided:  data.double_sided,
      binding:       data.binding,
      page_count:    totalPages,
      files:         data.files,
      unit_price:    breakdown.unit_price,
      total_price:   breakdown.total,
      currency:      'USD',
      status:        'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/orders]', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }

  // Log initial event
  await admin.from('order_events').insert({
    order_id: order.id,
    status:   'pending',
    actor:    'system',
    note:     'Order submitted',
  });

  // Fire-and-forget Telegram notification to shop owner
  notifyOwnerNewOrder(order).catch(err =>
    console.error('[Telegram] notify owner failed:', err),
  );

  return NextResponse.json({ order }, { status: 201 });
}
