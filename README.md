# PrintFlow 🖨️

**Smart print order management for university print shops.**

Replace Telegram chaos with a structured, real-time queue. Students submit in 60 seconds. You print in order. Everyone sleeps.

---

## Tech Stack

| Layer        | Technology                  |
|--------------|-----------------------------|
| Framework    | Next.js 15 (App Router)     |
| Styling      | Tailwind CSS v3             |
| Database     | Supabase (PostgreSQL)       |
| Auth         | Supabase Auth               |
| File Storage | Supabase Storage            |
| Realtime     | Supabase Realtime           |
| Notifications| Telegram Bot API            |
| Hosting      | Vercel (recommended)        |

---

## Project Structure

```
printflow/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout, fonts, toast
│   ├── globals.css                 # Design tokens, utility classes
│   ├── order/page.tsx              # Multi-step order form (students)
│   ├── track/[orderId]/page.tsx    # Real-time order tracking
│   ├── dashboard/page.tsx          # Student order history
│   ├── admin/
│   │   ├── page.tsx                # Live print queue dashboard
│   │   ├── analytics/page.tsx      # Charts and metrics
│   │   └── settings/page.tsx       # Pricing + shop config
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── api/
│       ├── orders/route.ts         # GET (admin list) + POST (create)
│       ├── orders/[id]/route.ts    # GET (track) + PATCH (update) + DELETE
│       ├── orders/by-phone/route.ts# Student order history lookup
│       ├── upload/route.ts         # File upload → Supabase Storage
│       ├── notify/route.ts         # Telegram webhook + daily summary
│       ├── pricing/route.ts        # Price management
│       └── auth/callback/route.ts  # Supabase email confirmation
├── components/
│   ├── ui/index.tsx                # Button, Input, Badge, Toggle, etc.
│   ├── order/
│   │   ├── FileUpload.tsx          # Drag-and-drop file uploader
│   │   ├── OrderCard.tsx           # Order display card
│   │   └── PriceCalculator.tsx     # Live price breakdown
│   ├── admin/QueueItem.tsx         # Expandable queue row (admin)
│   ├── tracking/OrderTimeline.tsx  # Status timeline
│   └── layout/Navbar.tsx          # Shared navigation
├── hooks/index.ts                  # useOrders, useOrderTracking, useFileUpload
├── lib/
│   ├── supabase/client.ts          # Browser client
│   ├── supabase/server.ts          # Server + admin clients
│   ├── pricing.ts                  # Price calculation logic
│   ├── telegram.ts                 # Telegram notification helpers
│   └── utils.ts                    # cn(), formatDate(), etc.
├── types/index.ts                  # All shared TypeScript types
├── supabase/schema.sql             # Full DB schema + RLS policies
├── middleware.ts                   # Auth protection for /admin
└── .env.example                    # Environment variable template
```

---

## Setup Guide

### 1. Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account (free tier works)
- A Telegram account (for notifications)
- A [Vercel](https://vercel.com) account (for deployment)

---

### 2. Supabase Setup

#### 2a. Create a project
1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **anon key** (Settings → API)
3. Also copy the **service_role key** (keep this secret)

#### 2b. Run the database schema
1. Open your project → SQL Editor → New Query
2. Paste the contents of `supabase/schema.sql`
3. Click **Run** — all tables, triggers, and RLS policies are created

#### 2c. Create the storage bucket
Run this in SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'print-files',
  'print-files',
  false,
  52428800,
  ARRAY['application/pdf','image/jpeg','image/png','image/tiff','application/postscript']
);

-- Storage policy: anyone can upload (students don't log in)
CREATE POLICY "Anyone can upload print files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'print-files');

-- Only authenticated owners can read files
CREATE POLICY "Authenticated users can read files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'print-files' AND auth.role() = 'authenticated');
```

#### 2d. Enable Realtime
In Supabase dashboard → Database → Replication:
- Enable realtime for `orders` table
- Enable realtime for `order_events` table

---

### 3. Telegram Bot Setup

1. Open Telegram, message **@BotFather**
2. Send `/newbot`, follow the prompts, copy the **bot token**
3. Start a conversation with your new bot (required before it can message you)
4. Message **@userinfobot** to get your **Telegram Chat ID**
5. Optionally set a webhook for bot commands:
   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-domain.com/api/notify
   ```

---

### 4. Local Development

```bash
# Clone and install
git clone https://github.com/your-org/printflow.git
cd printflow
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and Telegram credentials

# Run development server
npm run dev
# Open http://localhost:3000
```

#### Environment variables (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_OWNER_CHAT_ID=your-telegram-chat-id

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=PrintFlow
```

---

### 5. Create Your First Shop

1. Go to `http://localhost:3000/signup`
2. Create an account with your email
3. Fill in your shop name and slug (e.g. `sami-prints`)
4. Your student order link: `http://localhost:3000/order?shop=sami-prints`
5. Your admin dashboard: `http://localhost:3000/admin`

---

### 6. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# Project Settings → Environment Variables
# Add all variables from .env.example
```

Or connect your GitHub repo to Vercel for automatic deployments on push.

**Important:** After deploying, update `NEXT_PUBLIC_APP_URL` to your production URL,
and re-register the Telegram webhook with the production URL.

---

### 7. Daily Summary Cron (Optional)

To send a daily Telegram summary to the shop owner, set up a cron job that hits:
```
POST https://your-domain.com/api/notify
{"type": "summary"}
```

Using Vercel Cron (add to `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/notify",
      "schedule": "0 20 * * *"
    }
  ]
}
```
*(Fires at 8 PM daily)*

Or use a free service like [cron-job.org](https://cron-job.org).

---

## Key User Flows

### Student submits an order
1. Visit `/order?shop=your-slug`
2. Upload files (PDF/JPG/PNG/TIFF, max 50MB each)
3. Select paper size, colour, copies, binding
4. Enter name and phone
5. Receive order number + tracking link
6. Get Telegram/SMS notification when prints are ready

### Admin manages the queue
1. Sign in at `/login`
2. See live queue at `/admin` — updates in real time
3. Click **Start Printing** → **Mark Done** on each order
4. Student notified automatically on "Done"
5. View analytics at `/admin/analytics`
6. Configure pricing at `/admin/settings`

### Telegram bot commands
- `/queue` — list all pending orders
- `/done PF-202411-0042` — mark order as ready
- `/summary` — today's stats

---

## Customisation

### Add more paper sizes
Edit `types/index.ts` → `PaperSize` enum and `PAPER_SIZE_DIMS`.
Update `supabase/schema.sql` → `paper_size` enum.
Run `ALTER TYPE paper_size ADD VALUE 'A6';` in Supabase SQL Editor.

### Change currency
Set `currency` in `lib/pricing.ts` default exports.
Update the `formatPrice` calls or pass `currency` from shop settings.

### White-label for a different shop
Each shop gets its own `slug`. The order form reads `?shop=slug` from the URL,
making every shop a completely separate tenant with its own pricing, settings, and queue.

---

## Security Notes

- **Files** are stored privately in Supabase Storage; only authenticated owners receive signed URLs
- **Orders** use RLS — owners can only see their own shop's orders
- **Students** don't need accounts — they authenticate by phone number for order history
- **Service role key** is never exposed to the browser — only used in server-side API routes
- **Files auto-delete** after 7 days via signed URL expiry (you can add a cron to purge storage)

---

## License

MIT — use freely for your own print shop or SaaS product.
