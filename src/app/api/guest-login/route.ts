// /src/app/api/guest-login/route.ts
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST() {
  const supabase = createServerComponentClient({ cookies });

  const guestEmail = 'supabase994@gmail.com';
  const guestPassword = 'sisi4405';

  const { error } = await supabase.auth.signInWithPassword({
    email: guestEmail,
    password: guestPassword,
  });

  if (error) {
    console.error('お試しログイン失敗:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
