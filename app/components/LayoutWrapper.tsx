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
          <>
            <TOSBanner />
            <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-6 py-3">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-sm">
                <span className="font-medium text-blue-900 text-center">
                  Free Version: Try the full workflow with sample data
                </span>
                <span className="text-blue-700 hidden sm:inline">•</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-blue-700">Contact us:</span>
                  <a
                    href="https://trymlink.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                  >
                    trymlink.com
                  </a>
                  <span className="text-blue-700">or</span>
                  <a
                    href="mailto:info@trymlink.com?subject=Unlock Uploads & Custom Tasks"
                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                  >
                    info@trymlink.com
                  </a>
                </div>
              </div>
            </div>
          </>
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

