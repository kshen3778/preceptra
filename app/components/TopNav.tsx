'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { VideoIcon, Video, LogOut, User, ChevronDown, FileText, Menu, X, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { useTask } from '../contexts/TaskContext';
import CreateTaskModal from './CreateTaskModal';

const navigation: Array<{ name: string; href: string; icon: any; step: number; description: string }> = [];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedTask, setSelectedTask, tasks } = useTask();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking the menu button itself (it handles its own toggle)
      if (menuButtonRef.current && menuButtonRef.current.contains(target)) {
        return;
      }
      
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isMenuOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isUserMenuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <span className="text-xl font-bold">Preceptra</span>
            <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">by MLink</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 md:gap-3 lg:gap-4">
            {/* Create Task Button */}
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="flex items-center gap-1.5 md:gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">Create Task</span>
            </Button>

            {/* Task Selector */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden lg:inline">
                Task:
              </label>
              <Select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-32 md:w-40 lg:w-48"
              >
                <option value="">Select a task...</option>
                {tasks.map((task) => (
                  <option key={task} value={task}>
                    {task}
                  </option>
                ))}
              </Select>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-0.5 md:gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 md:gap-2 rounded-md px-2 md:px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    title={item.name}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden xl:inline">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">User</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isUserMenuOpen && "rotate-180"
                )} />
              </Button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-background border rounded-md shadow-lg overflow-hidden z-50">
                  <Link
                    href="/tos"
                    className="flex items-center px-4 py-3 text-sm hover:bg-accent transition-colors"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Terms of Service
                  </Link>
                  <button
                    className="flex items-center w-full px-4 py-3 text-sm hover:bg-accent transition-colors text-left border-t"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {/* User Menu Button (Mobile) */}
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <User className="h-4 w-4" />
              </Button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-background border rounded-md shadow-lg overflow-hidden z-50">
                  <Link
                    href="/tos"
                    className="flex items-center px-4 py-3 text-sm hover:bg-accent transition-colors"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Terms of Service
                  </Link>
                  <button
                    className="flex items-center w-full px-4 py-3 text-sm hover:bg-accent transition-colors text-left border-t"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger Menu Button */}
            <Button
              ref={menuButtonRef}
              variant="outline"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4" ref={menuRef}>
            {/* Close Button */}
            <div className="flex justify-end px-4 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
            
            {/* Create Task Button (Mobile) */}
            <div className="px-4 mb-4">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIsCreateTaskModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Task</span>
              </Button>
            </div>

            {/* Task Selector (Mobile) */}
            <div className="px-4 mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                CURRENT TASK
              </label>
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

            {/* Navigation Links (Mobile) */}
            <div className="px-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-2">
                3-Step Workflow
              </p>
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-start rounded-md px-3 py-3 text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className={cn(
                        'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full mr-3 text-xs font-bold',
                        isActive
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {item.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 flex-shrink-0" />
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
            </div>
          </div>
        )}
      </div>
      
      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
      />
    </nav>
  );
}

