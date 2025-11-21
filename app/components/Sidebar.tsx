'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Upload, BookOpen, MessageSquare, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { useTask } from '../contexts/TaskContext';

const navigation = [
  { name: 'Upload', href: '/upload', icon: Upload, step: 1, description: 'Transcribe videos' },
  { name: 'Procedure', href: '/procedure', icon: BookOpen, step: 2, description: 'Create/update SOP' },
  { name: 'Questions', href: '/questions', icon: MessageSquare, step: 3, description: 'Ask questions' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedTask, setSelectedTask, tasks } = useTask();

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <div className="flex flex-col">
            <span className="text-xl font-bold">Preceptra</span>
            <span className="text-xs text-muted-foreground">by MLink</span>
          </div>
        </Link>
      </div>
      <div className="border-b px-3 py-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-muted-foreground">
            CURRENT TASK
          </label>
        </div>
        <Select
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          className="w-full"
        >
          <option value="">Select a task...</option>
          {tasks.map((task) => (
            <option key={task} value={task}>
              {task}
            </option>
          ))}
        </Select>
        <div className="mt-2 text-xs">
          <span className="text-muted-foreground">Want custom tasks? </span>
          <a
            href="https://trymlink.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Contact us
          </a>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4">
        <div className="mb-3 px-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            3-Step Workflow
          </p>
        </div>
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-start rounded-md px-3 py-3 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className={cn(
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full mr-3 text-xs font-bold',
                  isActive
                    ? 'bg-primary-foreground text-primary'
                    : 'bg-muted text-muted-foreground group-hover:bg-accent-foreground group-hover:text-accent'
                )}>
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <p className={cn(
                    "text-xs mt-0.5",
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="border-t p-4">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
