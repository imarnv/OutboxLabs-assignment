'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { GoogleIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { oauthUrls } from '@/lib/api';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get('error');
    if (err) {
      toast.error(err);
      window.history.replaceState(null, '', '/login');
    }
  }, [toast]);

  const loginWithGoogle = () => {
    setRedirecting(true);
    window.location.href = oauthUrls.googleLogin;
  };

  const onEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    toast.info('Email & password sign-in is not enabled for this workspace. Please continue with Google.');
  };

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white px-8 py-10 sm:shadow-pop sm:border sm:border-line">
        <h1 className="mb-8 text-center text-3xl font-bold text-ink">Login</h1>

        <Button variant="soft" size="lg" fullWidth leftIcon={<GoogleIcon size={20} />} loading={redirecting} onClick={loginWithGoogle}>
          Login with Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
          <span className="h-px flex-1 bg-line" />
          or sign up through email
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onEmailSubmit} className="flex flex-col gap-4">
          <TextInput name="email" type="email" label="Email ID" placeholder="Email ID" autoComplete="email" />
          <TextInput name="password" type="password" label="Password" placeholder="Password" autoComplete="current-password" />
          <Button type="submit" size="lg" fullWidth className="mt-2">
            Login
          </Button>
        </form>
      </div>
    </main>
  );
}
