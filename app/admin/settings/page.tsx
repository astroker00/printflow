'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Settings, DollarSign, Bell, Store, Save, AlertCircle, Check,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button, Input, Toggle, Spinner } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { cn, formatPrice } from '@/lib/utils';
import type { Shop, PricingRow, PaperSize, ColourMode } from '@/types';
import { DEFAULT_PRICES } from '@/lib/pricing';

const PAPER_SIZES: PaperSize[]   = ['A5','A4','A3','A2','A1','A0'];
const COLOUR_MODES: ColourMode[] = ['blackwhite','colour'];

export default function SettingsPage() {
  const router  = useRouter();
  const [shop, setShop]       = useState<Shop | null>(null);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Editable shop fields
  const [shopName, setShopName]       = useState('');
  const [shopPhone, setShopPhone]     = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [telegramId, setTelegramId]   = useState('');
  const [autoNotify, setAutoNotify]   = useState(true);

  // Editable pricing: { 'A4-colour': 0.15, ... }
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: shopData } = await supabase
        .from('shops').select('*').eq('owner_user_id', user.id).single();
      if (!shopData) { router.push('/signup'); return; }

      setShop(shopData as Shop);
      setShopName(shopData.name);
      setShopPhone(shopData.phone ?? '');
      setShopAddress(shopData.address ?? '');
      setTelegramId(shopData.telegram_chat_id ?? '');
      setAutoNotify(shopData.settings?.auto_notify_student ?? true);

      // Load pricing
      const res  = await fetch(`/api/pricing?shop_id=${shopData.id}`);
      const data = await res.json();
      const rows: PricingRow[] = data.pricing ?? [];
      setPricing(rows);

      // Convert to editable map
      const map: Record<string, string> = {};
      PAPER_SIZES.forEach(size => {
        COLOUR_MODES.forEach(mode => {
          const row = rows.find(r => r.paper_size === size && r.colour_mode === mode);
          map[`${size}-${mode}`] = row ? row.price.toString() : DEFAULT_PRICES[size][mode].toString();
        });
      });
      setPrices(map);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSaveShop = async () => {
    if (!shop) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('shops')
        .update({
          name:             shopName,
          phone:            shopPhone || null,
          address:          shopAddress || null,
          telegram_chat_id: telegramId || null,
          settings:         { ...(shop.settings ?? {}), auto_notify_student: autoNotify },
        })
        .eq('id', shop.id);

      if (error) throw error;
      toast.success('Shop settings saved');
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricing = async () => {
    if (!shop) return;
    setSaving(true);
    try {
      const updates = Object.entries(prices).map(([key, val]) => {
        const [paper_size, colour_mode] = key.split('-') as [PaperSize, ColourMode];
        return fetch('/api/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_id:     shop.id,
            paper_size,
            colour_mode,
            price: parseFloat(val) || 0,
          }),
        });
      });
      await Promise.all(updates);
      toast.success('Pricing updated');
    } catch {
      toast.error('Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar variant="admin" />
        <div className="flex items-center justify-center py-32">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar variant="admin" />

      <div className="page-container py-6 max-w-3xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Settings</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Configure your shop, pricing, and notifications
          </p>
        </div>

        {/* ── Shop settings ──────────────────────────────────────────────────── */}
        <Section title="Shop Details" icon={Store}>
          <div className="space-y-4">
            <Input label="Shop Name" value={shopName} onChange={e => setShopName(e.target.value)} required />
            <Input label="Phone" type="tel" placeholder="+1 234 567 8900"
              value={shopPhone} onChange={e => setShopPhone(e.target.value)} />
            <Input label="Address" placeholder="123 Main St, City"
              value={shopAddress} onChange={e => setShopAddress(e.target.value)} />

            {/* Student order link */}
            {shop && (
              <div>
                <label className="label">Student Order Link</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 input bg-stone-50 font-mono text-sm text-stone-600 truncate select-all">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://printflow.app'}
                    /order?shop={shop.slug}
                  </div>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/order?shop=${shop.slug}`
                      );
                      toast.success('Copied!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-stone-400 mt-1.5">
                  Share this with your students. It's the only link they need.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-5">
            <Button variant="primary" loading={saving} onClick={handleSaveShop}
              icon={<Save className="w-4 h-4" />}>
              Save shop settings
            </Button>
          </div>
        </Section>

        {/* ── Telegram ───────────────────────────────────────────────────────── */}
        <Section title="Telegram Notifications" icon={Bell}>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How to set up Telegram notifications:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Start a conversation with your bot on Telegram</li>
                  <li>Message <code className="bg-blue-100 px-1 rounded">@userinfobot</code> to get your Chat ID</li>
                  <li>Paste your Chat ID below and save</li>
                </ol>
              </div>
            </div>
          </div>

          <Input
            label="Your Telegram Chat ID"
            placeholder="e.g. 123456789"
            value={telegramId}
            onChange={e => setTelegramId(e.target.value)}
            hint="Get this from @userinfobot on Telegram"
          />

          <div className="mt-4">
            <Toggle
              checked={autoNotify}
              onChange={setAutoNotify}
              label="Auto-notify students when order is ready"
              description="Students receive a Telegram notification when their prints are done"
            />
          </div>

          <div className="flex justify-end mt-5">
            <Button variant="primary" loading={saving} onClick={handleSaveShop}
              icon={<Save className="w-4 h-4" />}>
              Save notification settings
            </Button>
          </div>
        </Section>

        {/* ── Pricing ────────────────────────────────────────────────────────── */}
        <Section title="Pricing (per sheet)" icon={DollarSign}>
          <p className="text-sm text-stone-500 mb-5">
            Set the price per sheet for each paper size and colour mode. Binding costs are fixed.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-2 text-stone-500 font-medium w-20">Size</th>
                  <th className="text-center py-2 text-stone-500 font-medium">B&W per sheet</th>
                  <th className="text-center py-2 text-stone-500 font-medium">Colour per sheet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {PAPER_SIZES.map(size => (
                  <tr key={size}>
                    <td className="py-3 font-semibold text-navy-700">{size}</td>
                    {COLOUR_MODES.map(mode => {
                      const key = `${size}-${mode}`;
                      const def = DEFAULT_PRICES[size][mode];
                      const cur = parseFloat(prices[key] ?? '0');
                      const changed = Math.abs(cur - def) > 0.001;
                      return (
                        <td key={mode} className="py-2 px-2 text-center">
                          <div className="relative inline-flex items-center">
                            <span className="absolute left-3 text-stone-400 text-sm">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={prices[key] ?? ''}
                              onChange={e => setPrices(p => ({ ...p, [key]: e.target.value }))}
                              className={cn(
                                'input w-24 pl-7 text-center tabular-nums text-sm py-2',
                                changed && 'border-amber-400 bg-amber-50',
                              )}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-stone-400 mt-3">
            Default prices shown. Orange fields have been modified from defaults.
          </p>

          <div className="flex justify-end mt-5">
            <Button variant="primary" loading={saving} onClick={handleSavePricing}
              icon={<Save className="w-4 h-4" />}>
              Save pricing
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title, icon: Icon, children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-stone-200">
        <div className="w-8 h-8 bg-navy-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-navy-600" />
        </div>
        <h2 className="font-display font-semibold text-navy-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}
