import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { DEFAULT_PRICES } from '@/lib/pricing';
import type { PaperSize, ColourMode } from '@/types';

/**
 * GET /api/pricing?shop_slug=xxx
 * Returns all pricing rows for a given shop (public — needed for order form).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('shop_slug');
  const id   = searchParams.get('shop_id');

  if (!slug && !id) {
    return NextResponse.json({ error: 'shop_slug or shop_id required' }, { status: 400 });
  }

  const admin = createAdminClient();

  let shopId = id;
  if (!shopId && slug) {
    const { data: shop } = await admin
      .from('shops').select('id').eq('slug', slug).single();
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    shopId = shop.id;
  }

  const { data: pricing, error } = await admin
    .from('pricing')
    .select('*')
    .eq('shop_id', shopId);

  if (error) return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 });

  return NextResponse.json({ pricing: pricing ?? [] });
}

/**
 * POST /api/pricing
 * Seeds default pricing for a newly created shop.
 * Also used by authenticated admins to update individual price rows.
 */
export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const admin = createAdminClient();

  // ── Seed defaults for a new shop ─────────────────────────────────────────
  if (body.shop_slug) {
    const { data: shop } = await admin
      .from('shops').select('id').eq('slug', body.shop_slug).single();
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });

    const rows: { shop_id: string; paper_size: PaperSize; colour_mode: ColourMode; price: number; currency: string }[] = [];
    (Object.entries(DEFAULT_PRICES) as [PaperSize, Record<ColourMode, number>][]).forEach(([size, modes]) => {
      (Object.entries(modes) as [ColourMode, number][]).forEach(([mode, price]) => {
        rows.push({ shop_id: shop.id, paper_size: size, colour_mode: mode, price, currency: 'USD' });
      });
    });

    const { error } = await admin.from('pricing').upsert(rows, {
      onConflict: 'shop_id,paper_size,colour_mode',
    });

    if (error) {
      console.error('[POST /api/pricing] seed error:', error);
      return NextResponse.json({ error: 'Failed to seed pricing' }, { status: 500 });
    }
    return NextResponse.json({ seeded: rows.length });
  }

  // ── Update a single price row (admin only) ────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { shop_id, paper_size, colour_mode, price } = body;
  if (!shop_id || !paper_size || !colour_mode || price === undefined) {
    return NextResponse.json({ error: 'shop_id, paper_size, colour_mode, price required' }, { status: 400 });
  }

  // Confirm ownership
  const { data: shop } = await admin
    .from('shops').select('id').eq('id', shop_id).eq('owner_user_id', user.id).single();
  if (!shop) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: row, error } = await admin
    .from('pricing')
    .upsert({ shop_id, paper_size, colour_mode, price }, { onConflict: 'shop_id,paper_size,colour_mode' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json({ pricing: row });
}
