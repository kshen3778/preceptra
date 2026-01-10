import { neonAuth } from '@neondatabase/auth/next/server';
import { redirect } from 'next/navigation';
import { AuthView } from '@neondatabase/auth/react';

export const dynamicParams = false;

export default async function AuthPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ path: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { path } = await params;
  const search = await searchParams;
  const verifyRequired = search.verify === 'required';

  // Redirect sign-up to custom page
  if (path === 'sign-up') {
    redirect('/auth/sign-up');
  }

  // If user is already authenticated and verified, redirect to home
  try {
    const { user, session } = await neonAuth();
    if (session && user?.emailVerified) {
      redirect('/');
    }
  } catch (error) {
    // User not authenticated, continue to auth page
  }

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      {verifyRequired && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-600 dark:text-yellow-400 text-sm">
          Please verify your email address before signing in. Check your email for a verification code.
        </div>
      )}
      <AuthView path={path} />
    </main>
  );
}
