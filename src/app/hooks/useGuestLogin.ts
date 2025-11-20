import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useGuestLogin = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loginAsGuest = async () => {
    if (loading) return;
    try {
      setLoading(true);

      const res = await fetch('/api/auth/guest-login', { method: 'POST' });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(`ログイン失敗: ${body?.error ?? res.statusText}`);
        return;
      }

      if (body.access_token && body.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
        });
        if (error) {
          toast.error(`セッション同期失敗: ${error.message}`);
          return;
        }
      } else {
        toast.error('ログイン失敗: トークンが取得できませんでした');
        return;
      }

      toast.success('ゲストとしてログインしました');
      router.replace('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('ログイン失敗: ネットワークエラー');
    } finally {
      setLoading(false);
    }
  };

  return { loginAsGuest, loading };
};
