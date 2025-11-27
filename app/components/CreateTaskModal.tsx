'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useTask } from '../contexts/TaskContext';
import { useRouter } from 'next/navigation';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  const [taskName, setTaskName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const { addLocalTask } = useTask();
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!taskName.trim()) {
      setError('Task name is required');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: taskName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.details || 'Failed to create task');
      }

      const data = await response.json();
      
      // Add task to local storage
      addLocalTask(data.taskName);
      
      // Navigate to try page with task name
      router.push(`/try?task=${encodeURIComponent(data.taskName)}`);
      
      // Close modal and reset
      setTaskName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-background border rounded-lg shadow-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="taskName" className="block text-sm font-medium mb-2">
              Task Name
            </label>
            <Input
              id="taskName"
              type="text"
              value={taskName}
              onChange={(e) => {
                setTaskName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Cabin Filter Replacement"
              disabled={isCreating}
              className="w-full"
            />
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !taskName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

