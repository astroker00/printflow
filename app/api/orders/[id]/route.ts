import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notifyOwnerNewOrder } from '@/lib/telegram';
import { z } from 'zod';

// ─── Validation ───────────────────────────────────────────────────────────────

const UpdateOrderSchema = z.object({
  status:         z.enum(['pending','queued','printing','ready','collected','cancelled']).optional(),
  admin_notes:    z.string().max(1000).optional(),
  priority:       z.number().int().min(0).max(10).optional(),
  payment_status: z.enum(['unpaid','paid','waived']).optional(),
});

// ─── GET /api/orders/[id] — Public: fetch one order by order_number or UUID ──

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const admin  = createAdminClient();

  // Accept both UUID (internal) and order number (PF-YYYYMM-XXXX)
  const isUUID = /^[0-9a-f-]{36}$/.test(id);

  const { data: order, error } = await admin
    .from('orders')
    .select('*')
    .eq(isUUID ? 'id' : 'order_number', id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Fetch event history
  const { data: events } = await admin
    .from('order_events')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ order, events: events ?? [] });
}

// ─── PATCH /api/orders/[id] — Admin: update status / notes / payment ─────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = UpdateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const updates = parsed.data;
  const admin   = createAdminClient();
  const isUUID  = /^[0-9a-f-]{36}$/.test(params.id);

  // Fetch current order to verify shop ownership
  const { data: existing } = await admin
    .from('orders')
    .select('id, shop_id, status, student_name, order_number')
    .eq(isUUID ? 'id' : 'order_number', params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Confirm this user owns the shop
  const { data: shop } = await admin
    .from('shops')
    .select('id, telegram_chat_id')
    .eq('id', existing.shop_id)
    .eq('owner_user_id', user.id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Build update payload with relevant timestamps
  const payload: Record<string, unknown> = { ...updates };
  if (updates.status === 'queued')    payload.queued_at    = new Date().toISOString();
  if (updates.status === 'printing')  payload.printing_at  = new Date().toISOString();
  if (updates.status === 'ready')     payload.ready_at     = new Date().toISOString();
  if (updates.status === 'collected') payload.collected_at = new Date().toISOString();

  const { data: order, error } = await admin
    .from('orders')
    .update(payload)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    console.error('[PATCH /api/orders/[id]]', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  // Append event log for status changes
  if (updates.status && updates.status !== existing.status) {
    await admin.from('order_events').insert({
      order_id: existing.id,
      status:   updates.status,
      actor:    'admin',
    });

    // Notify owner via Telegram when a new order is queued (summary ping)
    if (updates.status === 'queued') {
      notifyOwnerNewOrder(order).catch(console.error);
    }
  }

  return NextResponse.json({ order });
}

// ─── DELETE /api/orders/[id] — Admin: hard delete (use sparingly) ─────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('orders').select('id, shop_id').eq('id', params.id).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: shop } = await admin
    .from('shops').select('id')
    .eq('id', existing.shop_id).eq('owner_user_id', user.id).single();
  if (!shop) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await admin.from('orders').delete().eq('id', params.id);
  return NextResponse.json({ success: true });
}
