'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import WorkflowNav from './WorkflowNav';
import { TaskProvider } from '../contexts/TaskContext';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isWorkflowPage = ['/upload', '/procedure', '/questions'].includes(pathname);

  return (
    <TaskProvider>
      <div className="flex h-screen overflow-hidden">
        {!isLoginPage && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          {!isLoginPage && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="font-medium text-blue-900">
                  Free Version: Try the full workflow with sample data
                </span>
                <span className="text-blue-700">•</span>
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
          )}
          {isWorkflowPage && <WorkflowNav />}
          {children}
        </main>
      </div>
    </TaskProvider>
  );
}

