'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Printer, Mail, Lock, User, Store, Phone, Eye, EyeOff, CheckCircle,
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const PERKS = [
  'Real-time print queue dashboard',
  'Automatic Telegram notifications',
  'Live order tracking for students',
  'Analytics & demand forecasting',
  'First 30 days completely free',
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep]       = useState<'account' | 'shop' | 'done'>('account');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  /* account fields */
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  /* shop fields */
  const [shopName, setShopName]       = useState('');
  const [shopSlug, setShopSlug]       = useState('');
  const [shopPhone, setShopPhone]     = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [telegramId, setTelegramId]   = useState('');

  /* auto-generate URL slug from shop name */
  const handleShopName = (v: string) => {
    setShopName(v);
    setShopSlug(
      v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    );
  };

  /* ── Step 1: create Supabase auth account ───────────────────────────────── */
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setStep('shop');
    setLoading(false);
  };

  /* ── Step 2: create shop record ─────────────────────────────────────────── */
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !shopSlug.trim()) {
      toast.error('Shop name is required');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('shops').insert({
        name:           shopName.trim(),
        slug:           shopSlug.trim(),
        owner_user_id:  user.id,
        phone:          shopPhone.trim()   || null,
        address:        shopAddress.trim() || null,
        telegram_chat_id: telegramId.trim() || null,
      });

      if (error) {
        if (error.code === '23505')
          toast.error('That shop URL is already taken. Try a different name.');
        else throw error;
        return;
      }

      /* seed default pricing via API route */
      await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_slug: shopSlug }),
      });

      setStep('done');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  /* ── Done ───────────────────────────────────────────────────────────────── */
  if (step === 'done') {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://printflow.app';
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="font-display text-3xl font-bold text-navy-900 mb-3">
            Your shop is live! 🎉
          </h1>
          <p className="text-stone-500 mb-4">
            Share this link with your students to start receiving structured orders:
          </p>
          <div className="bg-navy-50 border border-navy-200 rounded-2xl px-5 py-4 mb-8 font-mono text-navy-700 text-sm break-all select-all">
            {origin}/order?shop={shopSlug}
          </div>
          <Button variant="accent" size="lg" fullWidth onClick={() => router.push('/admin')}>
            Open my dashboard →
          </Button>
        </div>
      </div>
    );
  }

  /* ── Layout ─────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-center bg-navy-800 w-96 flex-shrink-0 p-12">
        <div className="flex items-center gap-2.5 mb-12">
          <span className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
            <Printer className="w-5 h-5 text-white" />
          </span>
          <span className="font-display font-bold text-white text-xl">
            Print<span className="text-amber-400">Flow</span>
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-3 leading-tight">
          End the midnight<br />print order chaos.
        </h2>
        <p className="text-stone-400 text-sm mb-8 leading-relaxed">
          Join print shop owners who've replaced chaotic Telegram floods
          with a structured, automated queue.
        </p>
        <ul className="space-y-3">
          {PERKS.map((p, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-stone-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 justify-center">
              <span className="w-9 h-9 bg-navy-700 rounded-xl flex items-center justify-center">
                <Printer className="w-4 h-4 text-amber-400" />
              </span>
              <span className="font-display font-bold text-navy-700 text-xl">PrintFlow</span>
            </Link>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            {[
              { id: 'account', label: 'Account' },
              { id: 'shop',    label: 'Your Shop' },
            ].map((s, i) => {
              const isActive = step === s.id;
              const isDone   = step === 'shop' && i === 0;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-navy-700 text-white' : 'bg-stone-200 text-stone-400'}`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-navy-700' : 'text-stone-400'}`}>
                    {s.label}
                  </span>
                  {i === 0 && (
                    <div className={`flex-1 h-px mx-2 ${isDone ? 'bg-emerald-400' : 'bg-stone-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Account form ── */}
          {step === 'account' && (
            <div className="card p-8">
              <h1 className="font-display text-2xl font-bold text-navy-900 mb-1">
                Create your account
              </h1>
              <p className="text-stone-500 text-sm mb-6">Start your free 30-day trial</p>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <Input
                  label="Full Name" required placeholder="Sami Al-Rashid"
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Email" type="email" required placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                />
                <Input
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  required placeholder="Min. 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="pointer-events-auto"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <Button type="submit" variant="accent" size="lg" fullWidth loading={loading}>
                  Continue →
                </Button>
              </form>

              <p className="text-center text-sm text-stone-400 mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-navy-600 font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* ── Shop setup form ── */}
          {step === 'shop' && (
            <div className="card p-8">
              <h1 className="font-display text-2xl font-bold text-navy-900 mb-1">
                Set up your shop
              </h1>
              <p className="text-stone-500 text-sm mb-6">Takes less than a minute</p>

              <form onSubmit={handleCreateShop} className="space-y-4">
                <Input
                  label="Shop Name" required placeholder="Sami Print Centre"
                  value={shopName} onChange={e => handleShopName(e.target.value)}
                  leftIcon={<Store className="w-4 h-4" />}
                />

                {/* URL slug preview */}
                <div>
                  <label className="label">Your Student Order Link</label>
                  <div className="flex items-center rounded-xl border border-stone-300 overflow-hidden
                    focus-within:ring-2 focus-within:ring-navy-700/20 focus-within:border-navy-600">
                    <span className="px-3 py-3 bg-stone-50 text-stone-400 text-xs border-r
                      border-stone-300 whitespace-nowrap flex-shrink-0">
                      printflow.app/order?shop=
                    </span>
                    <input
                      className="flex-1 px-3 py-3 text-sm focus:outline-none font-mono min-w-0"
                      value={shopSlug}
                      onChange={e =>
                        setShopSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      placeholder="my-print-shop"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-stone-400">
                    Share this link with your students
                  </p>
                </div>

                <Input
                  label="Phone (optional)" type="tel" placeholder="+1 234 567 8900"
                  value={shopPhone} onChange={e => setShopPhone(e.target.value)}
                  leftIcon={<Phone className="w-4 h-4" />}
                />
                <Input
                  label="Telegram Chat ID (optional)"
                  placeholder="e.g. 123456789  — get from @userinfobot"
                  value={telegramId} onChange={e => setTelegramId(e.target.value)}
                  hint="Required for Telegram order notifications"
                />

                <Button type="submit" variant="accent" size="lg" fullWidth loading={loading}>
                  Launch my shop 🚀
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
