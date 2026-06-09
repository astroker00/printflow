-- ═══════════════════════════════════════════════════════════════
-- PrintFlow Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────────────────────────────
-- ENUM TYPES
-- ───────────────────────────────────────────────────────────────
CREATE TYPE order_status AS ENUM (
  'pending',       -- Submitted, awaiting admin review
  'queued',        -- Confirmed and in the print queue
  'printing',      -- Currently being printed
  'ready',         -- Printed and ready for pickup
  'collected',     -- Student has picked up their order
  'cancelled'      -- Cancelled by student or admin
);

CREATE TYPE paper_size AS ENUM ('A0','A1','A2','A3','A4','A5','Custom');
CREATE TYPE colour_mode AS ENUM ('colour','blackwhite');
CREATE TYPE binding_type AS ENUM ('none','staple','spiral','hardcover','clip');
CREATE TYPE payment_status AS ENUM ('unpaid','paid','waived');

-- ───────────────────────────────────────────────────────────────
-- SHOPS TABLE
-- Each print shop has one record here
-- ───────────────────────────────────────────────────────────────
CREATE TABLE shops (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,         -- URL-friendly identifier, e.g. "sami-prints"
  owner_user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id TEXT,                        -- Owner's Telegram chat ID for notifications
  phone           TEXT,
  address         TEXT,
  logo_url        TEXT,
  accent_color    TEXT DEFAULT '#E87722',
  is_active       BOOLEAN DEFAULT true,
  settings        JSONB DEFAULT '{
    "accepts_a0": true,
    "accepts_a1": true,
    "accepts_colour": true,
    "auto_notify_student": true,
    "max_file_size_mb": 50
  }'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- PRICING TABLE
-- Per-shop pricing configuration
-- ───────────────────────────────────────────────────────────────
CREATE TABLE pricing (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  paper_size  paper_size NOT NULL,
  colour_mode colour_mode NOT NULL,
  price       NUMERIC(10,2) NOT NULL,           -- Price per sheet
  currency    TEXT DEFAULT 'USD',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, paper_size, colour_mode)
);

-- ───────────────────────────────────────────────────────────────
-- ORDERS TABLE
-- Core order record
-- ───────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number     TEXT UNIQUE NOT NULL,         -- Human-readable: PF-2024-0001
  shop_id          UUID REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Student info (no auth required for students)
  student_name     TEXT NOT NULL,
  student_phone    TEXT NOT NULL,
  student_email    TEXT,
  student_notes    TEXT,
  
  -- Print specifications
  paper_size       paper_size NOT NULL,
  colour_mode      colour_mode NOT NULL DEFAULT 'blackwhite',
  copies           INTEGER NOT NULL DEFAULT 1 CHECK (copies > 0 AND copies <= 100),
  double_sided     BOOLEAN DEFAULT false,
  binding          binding_type DEFAULT 'none',
  page_count       INTEGER,                      -- Filled after file analysis
  
  -- Files (stored in Supabase Storage)
  files            JSONB DEFAULT '[]'::jsonb,   -- Array of {name, url, size, pages}
  
  -- Status & flow
  status           order_status DEFAULT 'pending',
  priority         INTEGER DEFAULT 0,            -- Higher = print sooner
  admin_notes      TEXT,
  
  -- Pricing
  unit_price       NUMERIC(10,2),
  total_price      NUMERIC(10,2),
  currency         TEXT DEFAULT 'USD',
  payment_status   payment_status DEFAULT 'unpaid',
  
  -- Timestamps
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  queued_at        TIMESTAMPTZ,
  printing_at      TIMESTAMPTZ,
  ready_at         TIMESTAMPTZ,
  collected_at     TIMESTAMPTZ,
  
  -- Metadata
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- ORDER STATUS HISTORY
-- Complete audit trail of every status change
-- ───────────────────────────────────────────────────────────────
CREATE TABLE order_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  actor       TEXT NOT NULL DEFAULT 'system',   -- 'system', 'admin', 'student'
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- STOCK ALERTS
-- Paper inventory tracking
-- ───────────────────────────────────────────────────────────────
CREATE TABLE stock (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  paper_size  paper_size NOT NULL,
  sheets      INTEGER NOT NULL DEFAULT 0,
  alert_at    INTEGER DEFAULT 50,               -- Notify when below this
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, paper_size)
);

-- ───────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ───────────────────────────────────────────────────────────────
CREATE INDEX idx_orders_shop_id      ON orders(shop_id);
CREATE INDEX idx_orders_status       ON orders(status);
CREATE INDEX idx_orders_submitted    ON orders(submitted_at DESC);
CREATE INDEX idx_orders_phone        ON orders(student_phone);
CREATE INDEX idx_order_events_order  ON order_events(order_id);
CREATE INDEX idx_orders_number       ON orders(order_number);

-- ───────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ───────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate order numbers: PF-YYYYMM-XXXX
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  seq INTEGER;
  yr_mo TEXT;
BEGIN
  yr_mo := TO_CHAR(NOW(), 'YYYYMM');
  SELECT COUNT(*) + 1 INTO seq
  FROM orders
  WHERE TO_CHAR(submitted_at, 'YYYYMM') = yr_mo;
  NEW.order_number := 'PF-' || yr_mo || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_generate_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Auto-record status changes to event log
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_events(order_id, status, actor)
    VALUES(NEW.id, NEW.status, 'system');
    -- Update relevant timestamp
    IF    NEW.status = 'queued'    THEN NEW.queued_at    := NOW();
    ELSIF NEW.status = 'printing'  THEN NEW.printing_at  := NOW();
    ELSIF NEW.status = 'ready'     THEN NEW.ready_at     := NOW();
    ELSIF NEW.status = 'collected' THEN NEW.collected_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_log_status
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- ───────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────
ALTER TABLE shops  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- Shop owners can manage their own shop
CREATE POLICY "Shop owner full access" ON shops
  USING (owner_user_id = auth.uid());

-- Anyone can read active shops (for the student portal)
CREATE POLICY "Public read active shops" ON shops
  FOR SELECT USING (is_active = true);

-- Anyone can submit orders (students don't need accounts)
CREATE POLICY "Anyone can insert orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Students can read their own orders by phone number (stored in metadata)
CREATE POLICY "Public order read by number" ON orders
  FOR SELECT USING (true);  -- Filtered in application layer by order_number

-- Shop owners can manage all orders for their shop
CREATE POLICY "Owner manages shop orders" ON orders
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_user_id = auth.uid()
    )
  );

-- Public pricing reads
CREATE POLICY "Public read pricing" ON pricing
  FOR SELECT USING (true);

-- Owner manages pricing
CREATE POLICY "Owner manages pricing" ON pricing
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_user_id = auth.uid()
    )
  );

-- Public order events reads (for tracking)
CREATE POLICY "Public read events" ON order_events
  FOR SELECT USING (true);

-- Owner manages stock
CREATE POLICY "Owner manages stock" ON stock
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_user_id = auth.uid()
    )
  );

-- ───────────────────────────────────────────────────────────────
-- SEED DATA — Default pricing for a new shop
-- Run after creating your shop record, replacing <shop_id>
-- ───────────────────────────────────────────────────────────────
-- INSERT INTO pricing (shop_id, paper_size, colour_mode, price) VALUES
--   ('<shop_id>', 'A4',  'blackwhite', 0.05),
--   ('<shop_id>', 'A4',  'colour',     0.15),
--   ('<shop_id>', 'A3',  'blackwhite', 0.10),
--   ('<shop_id>', 'A3',  'colour',     0.30),
--   ('<shop_id>', 'A2',  'blackwhite', 0.40),
--   ('<shop_id>', 'A2',  'colour',     1.20),
--   ('<shop_id>', 'A1',  'blackwhite', 1.00),
--   ('<shop_id>', 'A1',  'colour',     3.00),
--   ('<shop_id>', 'A0',  'blackwhite', 2.00),
--   ('<shop_id>', 'A0',  'colour',     6.00);

-- ───────────────────────────────────────────────────────────────
-- STORAGE BUCKET
-- Run in Supabase Storage section, or via dashboard
-- ───────────────────────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'print-files',
--   'print-files',
--   false,
--   52428800,  -- 50MB
--   ARRAY['application/pdf','image/jpeg','image/png','image/tiff','application/postscript']
-- );
