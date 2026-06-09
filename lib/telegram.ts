import type { Order } from '@/types';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Send a Telegram message to a specific chat.
 */
async function sendMessage(chat_id: string, text: string, parse_mode = 'HTML') {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] BOT_TOKEN not configured — skipping notification');
    return;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text, parse_mode, disable_web_page_preview: true }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[Telegram] Send error:', err);
    }
  } catch (err) {
    console.error('[Telegram] Network error:', err);
  }
}

// ─── Owner Notifications ──────────────────────────────────────────────────────

/** Notify owner of a new order */
export async function notifyOwnerNewOrder(order: Order) {
  const chat_id = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!chat_id) return;

  const files = order.files.map(f => `  📄 ${f.name}`).join('\n');
  const text = `
🔔 <b>New Print Order!</b>

<b>Order:</b> ${order.order_number}
<b>Student:</b> ${order.student_name}
<b>Phone:</b> ${order.student_phone}

<b>Specs:</b>
  📐 ${order.paper_size} · ${order.colour_mode === 'colour' ? '🎨 Colour' : '⚫ B&W'}
  📑 ${order.copies} ${order.copies === 1 ? 'copy' : 'copies'} · ${order.double_sided ? 'Double-sided' : 'Single-sided'}
  📎 Binding: ${order.binding}

<b>Files:</b>
${files}

${order.student_notes ? `<b>Notes:</b> ${order.student_notes}\n` : ''}
<b>Total:</b> $${order.total_price?.toFixed(2) ?? '—'}

<a href="${process.env.NEXT_PUBLIC_APP_URL}/admin">→ Open Dashboard</a>
`.trim();

  await sendMessage(chat_id, text);
}

/** Notify owner that an order has been updated by student */
export async function notifyOwnerOrderCancelled(order: Order) {
  const chat_id = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!chat_id) return;

  const text = `❌ <b>Order Cancelled</b>\n\n${order.order_number} — ${order.student_name}`;
  await sendMessage(chat_id, text);
}

// ─── Student Notifications ────────────────────────────────────────────────────

/**
 * Notify a student via Telegram that their order is ready.
 * Requires the student to have started a conversation with the bot.
 * This is optional — students can also receive status via email or the web tracker.
 */
export async function notifyStudentReady(order: Order, telegram_user_id?: string) {
  if (!telegram_user_id) return;

  const text = `
✅ <b>Your prints are ready!</b>

<b>Order:</b> ${order.order_number}
Your documents are printed and ready for pickup at the shop.

Show this message when you arrive.
Track your order: ${process.env.NEXT_PUBLIC_APP_URL}/track/${order.order_number}
`.trim();

  await sendMessage(telegram_user_id, text);
}

/** Daily summary for owner */
export async function sendOwnerDailySummary(stats: {
  total: number;
  pending: number;
  completed: number;
  revenue: number;
}) {
  const chat_id = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!chat_id) return;

  const text = `
📊 <b>Daily PrintFlow Summary</b>

📦 Total orders today: <b>${stats.total}</b>
⏳ Still pending: <b>${stats.pending}</b>
✅ Completed: <b>${stats.completed}</b>
💰 Revenue: <b>$${stats.revenue.toFixed(2)}</b>

<a href="${process.env.NEXT_PUBLIC_APP_URL}/admin">→ Open Dashboard</a>
`.trim();

  await sendMessage(chat_id, text);
}
