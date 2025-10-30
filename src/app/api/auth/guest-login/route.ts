// src/app/api/auth/guest-login/route.ts
import 'server-only';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { jsonNoStore } from '@/lib/http';

export const runtime = 'nodejs';

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
      return jsonNoStore({ error: 'server env missing: GUEST_USER_EMAIL/PASSWORD or SUPABASE URL/ANON KEY' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'X-Client-Info': 'guest-login-route' } },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      console.error('[guest-login] signIn error', error);
      return jsonNoStore({ error: `login failed: ${error?.message || 'no session returned'}` }, { status: 401 });
    }

    const { session } = data;

    // ゲスト専用のセッションIDを生成（投稿の分離用）
    const guestSessionId = randomUUID();

    return jsonNoStore({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      token_type: session.token_type ?? 'bearer',
      user: { id: session.user.id, email: session.user.email },
      guestSessionId, // クライアントはこれをsessionStorageに保存
    }, { status: 200 });
  } catch (e) {
    console.error('[guest-login] unexpected', e);
    return jsonNoStore({ error: 'unexpected error' }, { status: 500 });
  }
}
