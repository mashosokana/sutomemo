// src/app/api/auth/guest-login/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store, max-age=0' } as const;

export async function POST() {
  try {
    const email = process.env.GUEST_USER_EMAIL;
    const password = process.env.GUEST_USER_PASSWORD;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!email || !password || !supabaseUrl || !anonKey) {
      console.error('[guest-login] env missing', {
        hasEmail: !!email, hasPw: !!password, hasUrl: !!supabaseUrl, hasAnon: !!anonKey,
      });
      return NextResponse.json(
        { error: 'server env missing: GUEST_USER_EMAIL/PASSWORD or SUPABASE URL/ANON KEY' },
        { status: 500, headers: noStore }
      );
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'X-Client-Info': 'guest-login-route' } },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      console.error('[guest-login] signIn error', error);
      return NextResponse.json(
        { error: `login failed: ${error?.message || 'no session returned'}` },
        { status: 401, headers: noStore }
      );
    }

    const { session } = data;
    return NextResponse.json(
      {
        ok: true,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,     // Unix秒
        token_type: session.token_type ?? 'bearer',
        user: { id: session.user.id, email: session.user.email }, // 便利なので付与（不要なら消してOK）
      },
      { headers: noStore }
    );
  } catch (e) {
    console.error('[guest-login] unexpected', e);
    return NextResponse.json({ error: 'unexpected error' }, { status: 500, headers: noStore });
  }
}
