'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data, error: verifyError } = await authClient.emailOtp.verifyEmail({
        email,
        otp: code,
      });

      if (verifyError) {
        setError(verifyError.message || 'Verification failed');
      } else {
        // Check if auto-sign-in is enabled (default behavior)
        const hasSession = data && 'session' in data && data.session;
        if (hasSession) {
          setMessage('Email verified successfully! Redirecting...');
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 1500);
        } else {
          setMessage('Email verified! You can now sign in.');
          setTimeout(() => {
            router.push('/auth/sign-in');
          }, 1500);
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { error: resendError } = await authClient.sendVerificationEmail({
        email,
        callbackURL: window.location.origin + '/',
      });

      if (resendError) {
        setError(resendError.message || 'Failed to resend verification code');
      } else {
        setMessage('Verification code sent! Check your email.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Resend error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No email provided. Please sign up first.
            </p>
            <Button
              onClick={() => router.push('/auth/sign-up')}
              className="w-full mt-4"
            >
              Go to Sign Up
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            Enter the verification code sent to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                {message}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Didn't receive a code?{' '}
              <button
                type="button"
                onClick={handleResend}
                className="text-primary hover:underline"
                disabled={loading}
              >
                Resend code
              </button>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/auth/sign-in')}
            >
              Back to Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
