import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Supabase redirects here after email confirmation.
 * Exchange the code for a session and redirect to the admin dashboard.
 */
export async function GET(request: NextRequest) {
  const url  = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/admin';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Auth failed — redirect to login with error indicator
  return NextResponse.redirect(new URL('/login?error=auth', request.url));
}
