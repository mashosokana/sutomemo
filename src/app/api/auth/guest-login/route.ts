// src/app/api/auth/guest-login/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs'; 

export async function POST() {
  try {
    const email = process.env.GUEST_USER_EMAIL;
    const password = process.env.GUEST_USER_PASSWORD;

    if (!email || !password) {
      console.error('[guest-login] env missing', { hasEmail: !!email, hasPw: !!password });
      return NextResponse.json({ error: 'server env missing' }, { status: 500 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[guest-login] signIn error', error);
      return NextResponse.json({ error: `login failed: ${error.message}` }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    });
  } catch (e) {
    console.error('[guest-login] unexpected', e);
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 });
  }
}
