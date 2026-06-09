'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Printer, LogOut, LayoutDashboard, Package, BarChart3, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  variant?: 'landing' | 'student' | 'admin';
  userName?: string;
}

const ADMIN_NAV = [
  { href: '/admin',           label: 'Queue',     icon: Package },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings',  label: 'Settings',  icon: Settings },
];

export function Navbar({ variant = 'landing', userName }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200">
      <div className="page-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href={variant === 'admin' ? '/admin' : '/'} className="flex items-center gap-2.5">
          <span className="w-8 h-8 bg-navy-700 rounded-lg flex items-center justify-center">
            <Printer className="w-4 h-4 text-amber-400" />
          </span>
          <span className="font-display font-bold text-navy-700 text-lg tracking-tight">
            Print<span className="text-amber-500">Flow</span>
          </span>
          {variant === 'admin' && (
            <span className="badge bg-navy-100 border-navy-200 text-navy-600 text-xs hidden sm:inline-flex">
              Admin
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {variant === 'admin' && ADMIN_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-navy-50 text-navy-700'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}

          {variant === 'student' && (
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard'
                  ? 'bg-navy-50 text-navy-700'
                  : 'text-stone-600 hover:bg-stone-100',
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              My Orders
            </Link>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {variant === 'landing' ? (
            <>
              <Link href="/track" className="btn-ghost btn-sm hidden sm:inline-flex">Track order</Link>
              <Link href="/order" className="btn-accent btn-sm">Place Order</Link>
            </>
          ) : (
            <>
              {userName && (
                <span className="text-sm text-stone-500 hidden sm:block">
                  {userName}
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="btn-ghost btn-sm text-stone-600"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          )}

          {/* Mobile menu button */}
          {variant === 'admin' && (
            <button
              className="md:hidden btn-ghost btn-sm"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {open && variant === 'admin' && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pb-4 space-y-1 animate-fade-in">
          {ADMIN_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium',
                pathname === item.href
                  ? 'bg-navy-50 text-navy-700'
                  : 'text-stone-600 hover:bg-stone-100',
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
