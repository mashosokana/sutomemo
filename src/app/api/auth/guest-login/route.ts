// src/app/api/auth/guest-login/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs'; // EdgeではなくNode.jsで実行

export async function POST() {
  const email = process.env.GUEST_USER_EMAIL;
  const password = process.env.GUEST_USER_PASSWORD;

  if (!email || !password) {
    return NextResponse.json({ error: 'server env missing' }, { status: 500 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: `login failed: ${error.message}` }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
  });
}
