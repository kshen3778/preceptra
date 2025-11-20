'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TaskContextType {
  selectedTask: string;
  setSelectedTask: (task: string) => void;
  tasks: string[];
  setTasks: (tasks: string[]) => void;
  loadTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [tasks, setTasks] = useState<string[]>([]);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <TaskContext.Provider value={{ selectedTask, setSelectedTask, tasks, setTasks, loadTasks }}>
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
