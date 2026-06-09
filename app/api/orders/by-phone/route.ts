import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/orders/by-phone?phone=+1234567890
 *
 * Returns all orders for a given student phone number.
 * No auth required — students identify by phone only.
 * Returns limited fields to avoid leaking other students' data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone')?.trim();

  if (!phone || phone.length < 5) {
    return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: orders, error } = await admin
    .from('orders')
    .select([
      'id', 'order_number', 'status', 'paper_size', 'colour_mode',
      'copies', 'double_sided', 'binding', 'files', 'total_price',
      'student_name', 'student_phone', 'student_email', 'student_notes',
      'submitted_at', 'ready_at', 'collected_at', 'updated_at',
    ].join(','))
    .eq('student_phone', phone)
    .order('submitted_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[GET /api/orders/by-phone]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  return NextResponse.json({ orders: orders ?? [] });
}
