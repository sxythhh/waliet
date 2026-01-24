import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToolsWorkspace } from './ToolsWorkspaceContext';

export interface Task {
  id: string;
  workspace_id: string | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  assignee_id: string | null;
  partner_id: string | null;
  event_id: string | null;
  parent_task_id: string | null;
  category: string | null;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  reminder_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ToolsTaskContextType {
  tasks: Task[];
  isLoading: boolean;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  addTask: (task: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  getTasksByStatus: (status: Task['status']) => Task[];
  getTasksForEvent: (eventId: string) => Task[];
}

const ToolsTaskContext = createContext<ToolsTaskContextType | undefined>(undefined);

export function ToolsTaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { currentWorkspace } = useToolsWorkspace();

  const fetchTasks = useCallback(async () => {
    if (!currentWorkspace) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tools_tasks')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (task: Partial<Task>): Promise<Task | null> => {
    if (!currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from('tools_tasks')
        .insert({
          ...task,
          workspace_id: currentWorkspace.id,
          status: task.status || 'todo',
          priority: task.priority || 'medium',
        })
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error adding task:', error);
      return null;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      // If marking as done, set completed_at
      const finalUpdates = { ...updates };
      if (updates.status === 'done' && !updates.completed_at) {
        finalUpdates.completed_at = new Date().toISOString();
      } else if (updates.status && updates.status !== 'done') {
        finalUpdates.completed_at = null;
      }

      const { error } = await supabase
        .from('tools_tasks')
        .update({ ...finalUpdates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setTasks(prev =>
        prev.map(t => t.id === id ? { ...t, ...finalUpdates } : t)
      );
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tools_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const refreshTasks = async () => {
    await fetchTasks();
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(t => t.status === status);
  };

  const getTasksForEvent = (eventId: string) => {
    return tasks.filter(t => t.event_id === eventId);
  };

  return (
    <ToolsTaskContext.Provider
      value={{
        tasks,
        isLoading,
        isDialogOpen,
        setIsDialogOpen,
        addTask,
        updateTask,
        deleteTask,
        refreshTasks,
        getTasksByStatus,
        getTasksForEvent,
      }}
    >
      {children}
    </ToolsTaskContext.Provider>
  );
}

export function useToolsTasks() {
  const context = useContext(ToolsTaskContext);
  if (context === undefined) {
    throw new Error('useToolsTasks must be used within a ToolsTaskProvider');
  }
  return context;
}
