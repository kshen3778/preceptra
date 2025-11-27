'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TaskContextType {
  selectedTask: string;
  setSelectedTask: (task: string) => void;
  tasks: string[];
  setTasks: (tasks: string[]) => void;
  loadTasks: () => Promise<void>;
  addLocalTask: (taskName: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const LOCAL_TASKS_KEY = 'preceptra-local-tasks';

function getLocalTasks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LOCAL_TASKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalTasks(tasks: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Failed to save local tasks:', error);
  }
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [tasks, setTasks] = useState<string[]>([]);

  const loadTasks = async () => {
    try {
      // Load filesystem tasks from API
      const response = await fetch('/api/tasks');
      const filesystemTasks = response.ok ? (await response.json()).tasks || [] : [];
      
      // Load local tasks from localStorage
      const localTasks = getLocalTasks();
      
      // Filter out test tasks
      const filteredLocalTasks = localTasks.filter(
        task => task.toLowerCase() !== 'test task' && task.toLowerCase() !== 'test2 task' && task.toLowerCase() !== 'test2'
      );
      
      // If we filtered out tasks, update localStorage
      if (filteredLocalTasks.length !== localTasks.length) {
        saveLocalTasks(filteredLocalTasks);
      }
      
      // Merge and deduplicate tasks
      const allTasks = Array.from(new Set([...filesystemTasks, ...filteredLocalTasks]));
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      // Fallback to just local tasks if API fails
      const localTasks = getLocalTasks();
      const filteredLocalTasks = localTasks.filter(
        task => task.toLowerCase() !== 'test task' && task.toLowerCase() !== 'test2 task' && task.toLowerCase() !== 'test2'
      );
      if (filteredLocalTasks.length !== localTasks.length) {
        saveLocalTasks(filteredLocalTasks);
      }
      setTasks(filteredLocalTasks);
    }
  };

  const addLocalTask = (taskName: string) => {
    // Don't allow adding test tasks
    const lowerTaskName = taskName.toLowerCase();
    if (lowerTaskName === 'test task' || lowerTaskName === 'test2 task' || lowerTaskName === 'test2') {
      return;
    }
    
    const localTasks = getLocalTasks();
    if (!localTasks.includes(taskName)) {
      const updated = [...localTasks, taskName];
      saveLocalTasks(updated);
      // Update tasks list immediately
      setTasks(prev => {
        const merged = Array.from(new Set([...prev, taskName]));
        return merged;
      });
    }
  };

  useEffect(() => {
    // Clean up test tasks from localStorage on mount
    const localTasks = getLocalTasks();
    const filteredLocalTasks = localTasks.filter(
      task => task.toLowerCase() !== 'test task' && task.toLowerCase() !== 'test2 task' && task.toLowerCase() !== 'test2'
    );
    if (filteredLocalTasks.length !== localTasks.length) {
      saveLocalTasks(filteredLocalTasks);
    }
    
    loadTasks();
  }, []);

  return (
    <TaskContext.Provider value={{ selectedTask, setSelectedTask, tasks, setTasks, loadTasks, addLocalTask }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTask() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
}
