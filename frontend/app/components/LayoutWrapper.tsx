'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import TopNav from './TopNav';
import { TaskProvider } from '../contexts/TaskContext';
import { TOSBanner } from './TOSModal';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLoginPage = pathname === '/login';
  const isTryPage = pathname === '/try';
  const hasTaskParam = searchParams?.get('task');
  const showTopNavOnTryPage = isTryPage && hasTaskParam;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {!isLoginPage && (!isTryPage || showTopNavOnTryPage) && <TopNav />}
      <main className="flex-1 overflow-y-auto">
        {!isLoginPage && (!isTryPage || showTopNavOnTryPage) && (
          <TOSBanner />
        )}
        {children}
      </main>
    </div>
  );
}

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TaskProvider>
      <Suspense fallback={
        <div className="flex flex-col h-screen overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      }>
        <LayoutContent>{children}</LayoutContent>
      </Suspense>
    </TaskProvider>
  );
}

