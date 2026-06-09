import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendOwnerDailySummary } from '@/lib/telegram';

/**
 * POST /api/notify
 *
 * Two modes:
 *  1. summary  — send a daily stats summary to the owner
 *  2. webhook  — handle incoming Telegram bot commands from the owner
 *
 * Body: { type: 'summary' | 'webhook', ... }
 *
 * For the Telegram webhook, register it via:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.com/api/notify
 */
export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // ── Daily summary (called by a cron job / manual trigger) ─────────────────
  if (body.type === 'summary') {
    const admin  = createAdminClient();
    const today  = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: orders } = await admin
      .from('orders')
      .select('status, total_price')
      .gte('submitted_at', today.toISOString());

    const total   = orders?.length ?? 0;
    const pending = orders?.filter(o => ['pending','queued','printing'].includes(o.status)).length ?? 0;
    const done    = orders?.filter(o => o.status === 'collected').length ?? 0;
    const revenue = orders
      ?.filter(o => o.status === 'collected')
      .reduce((s, o) => s + (o.total_price ?? 0), 0) ?? 0;

    await sendOwnerDailySummary({ total, pending, completed: done, revenue });
    return NextResponse.json({ ok: true });
  }

  // ── Telegram webhook — handle bot commands from the owner ─────────────────
  if (body.message) {
    const msg  = body.message;
    const text = (msg.text ?? '').trim();
    const chatId = msg.chat?.id?.toString();

    if (!chatId) return NextResponse.json({ ok: true });

    const admin    = createAdminClient();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return NextResponse.json({ ok: true });

    const sendReply = async (reply: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: 'HTML' }),
      });
    };

    // /queue — show pending + queued orders
    if (text.startsWith('/queue')) {
      const { data: orders } = await admin
        .from('orders')
        .select('order_number, student_name, paper_size, colour_mode, copies, status')
        .in('status', ['pending', 'queued', 'printing'])
        .order('submitted_at', { ascending: true })
        .limit(15);

      if (!orders?.length) {
        await sendReply('✅ Queue is empty! No pending orders.');
      } else {
        const lines = orders.map((o, i) =>
          `${i + 1}. <b>${o.student_name}</b> — ${o.paper_size} · ${
            o.colour_mode === 'colour' ? '🎨' : '⚫'
          } · ${o.copies}x  [${o.status.toUpperCase()}]\n   <code>${o.order_number}</code>`,
        );
        await sendReply(`📋 <b>Queue (${orders.length})</b>\n\n${lines.join('\n\n')}`);
      }
    }

    // /done PF-YYYYMM-XXXX — mark order as ready
    else if (text.startsWith('/done')) {
      const orderNum = text.split(/\s+/)[1]?.toUpperCase();
      if (!orderNum) {
        await sendReply('Usage: /done PF-202411-0042');
      } else {
        const { data: order, error } = await admin
          .from('orders')
          .update({ status: 'ready', ready_at: new Date().toISOString() })
          .eq('order_number', orderNum)
          .select()
          .single();

        if (error || !order) {
          await sendReply(`❌ Order <code>${orderNum}</code> not found.`);
        } else {
          await admin.from('order_events').insert({
            order_id: order.id, status: 'ready', actor: 'admin',
            note: 'Marked done via Telegram bot',
          });
          await sendReply(
            `✅ <b>${order.student_name}</b>'s order is marked ready!\n` +
            `Order: <code>${orderNum}</code>\n` +
            `Student notified.`,
          );
        }
      }
    }

    // /summary — today's stats
    else if (text.startsWith('/summary')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: orders } = await admin
        .from('orders')
        .select('status, total_price')
        .gte('submitted_at', today.toISOString());

      const total   = orders?.length ?? 0;
      const pending = orders?.filter(o => ['pending','queued','printing'].includes(o.status)).length ?? 0;
      const done    = orders?.filter(o => o.status === 'collected').length ?? 0;
      const revenue = orders?.filter(o => o.status === 'collected')
        .reduce((s, o) => s + (o.total_price ?? 0), 0) ?? 0;

      await sendReply(
        `📊 <b>Today's Summary</b>\n\n` +
        `📦 Total orders: <b>${total}</b>\n` +
        `⏳ Pending: <b>${pending}</b>\n` +
        `✅ Completed: <b>${done}</b>\n` +
        `💰 Revenue: <b>$${revenue.toFixed(2)}</b>`,
      );
    }

    // /help
    else if (text.startsWith('/help') || text.startsWith('/start')) {
      await sendReply(
        '🖨️ <b>PrintFlow Bot</b>\n\n' +
        '/queue — see pending orders\n' +
        '/done [ORDER#] — mark order as ready\n' +
        '/summary — today\'s stats\n' +
        '/help — this message',
      );
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
