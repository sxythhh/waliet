import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToolsWorkspace } from './ToolsWorkspaceContext';

export interface TimeEntry {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  task_id: string | null;
  partner_id: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_billable: boolean;
  hourly_rate: number | null;
  created_at: string;
}

interface ToolsTimeTrackingContextType {
  entries: TimeEntry[];
  activeEntry: TimeEntry | null;
  isLoading: boolean;
  isTracking: boolean;
  elapsedTime: number; // seconds
  startTracking: (description?: string, taskId?: string, partnerId?: string) => Promise<TimeEntry | null>;
  stopTracking: () => Promise<void>;
  addManualEntry: (entry: Partial<TimeEntry>) => Promise<TimeEntry | null>;
  updateEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refreshEntries: () => Promise<void>;
  getEntriesForDate: (date: Date) => TimeEntry[];
  getEntriesForTask: (taskId: string) => TimeEntry[];
  getTotalTimeToday: () => number; // minutes
  getTotalTimeThisWeek: () => number; // minutes
}

const ToolsTimeTrackingContext = createContext<ToolsTimeTrackingContextType | undefined>(undefined);

export function ToolsTimeTrackingProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { currentWorkspace } = useToolsWorkspace();

  const fetchEntries = useCallback(async () => {
    if (!currentWorkspace) {
      setEntries([]);
      setActiveEntry(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tools_time_entries')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      const allEntries = data || [];
      setEntries(allEntries);

      // Check for active (running) entry
      const running = allEntries.find(e => e.end_time === null);
      if (running) {
        setActiveEntry(running);
        const startTime = new Date(running.start_time).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Timer for active tracking
  useEffect(() => {
    if (activeEntry && !activeEntry.end_time) {
      timerRef.current = setInterval(() => {
        const startTime = new Date(activeEntry.start_time).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeEntry]);

  const startTracking = async (
    description?: string,
    taskId?: string,
    partnerId?: string
  ): Promise<TimeEntry | null> => {
    if (!currentWorkspace) return null;

    // Stop any active tracking first
    if (activeEntry) {
      await stopTracking();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('tools_time_entries')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          description,
          task_id: taskId,
          partner_id: partnerId,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setActiveEntry(data);
      setEntries(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error starting time tracking:', error);
      return null;
    }
  };

  const stopTracking = async () => {
    if (!activeEntry) return;

    try {
      const endTime = new Date();
      const startTime = new Date(activeEntry.start_time);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const { error } = await supabase
        .from('tools_time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', activeEntry.id);

      if (error) throw error;

      setEntries(prev =>
        prev.map(e =>
          e.id === activeEntry.id
            ? { ...e, end_time: endTime.toISOString(), duration_minutes: durationMinutes }
            : e
        )
      );
      setActiveEntry(null);
      setElapsedTime(0);
    } catch (error) {
      console.error('Error stopping time tracking:', error);
    }
  };

  const addManualEntry = async (entry: Partial<TimeEntry>): Promise<TimeEntry | null> => {
    if (!currentWorkspace) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('tools_time_entries')
        .insert({
          ...entry,
          workspace_id: currentWorkspace.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setEntries(prev => [data, ...prev].sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      ));
      return data;
    } catch (error) {
      console.error('Error adding manual time entry:', error);
      return null;
    }
  };

  const updateEntry = async (id: string, updates: Partial<TimeEntry>) => {
    try {
      const { error } = await supabase
        .from('tools_time_entries')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    } catch (error) {
      console.error('Error updating time entry:', error);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tools_time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(prev => prev.filter(e => e.id !== id));
      if (activeEntry?.id === id) {
        setActiveEntry(null);
        setElapsedTime(0);
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
    }
  };

  const refreshEntries = async () => {
    await fetchEntries();
  };

  const getEntriesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return entries.filter(e => {
      const entryDate = new Date(e.start_time).toISOString().split('T')[0];
      return entryDate === dateStr;
    });
  };

  const getEntriesForTask = (taskId: string) => {
    return entries.filter(e => e.task_id === taskId);
  };

  const getTotalTimeToday = (): number => {
    const today = new Date().toISOString().split('T')[0];
    return entries
      .filter(e => {
        const entryDate = new Date(e.start_time).toISOString().split('T')[0];
        return entryDate === today && e.duration_minutes;
      })
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  };

  const getTotalTimeThisWeek = (): number => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return entries
      .filter(e => {
        const entryDate = new Date(e.start_time);
        return entryDate >= weekStart && e.duration_minutes;
      })
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  };

  return (
    <ToolsTimeTrackingContext.Provider
      value={{
        entries,
        activeEntry,
        isLoading,
        isTracking: !!activeEntry,
        elapsedTime,
        startTracking,
        stopTracking,
        addManualEntry,
        updateEntry,
        deleteEntry,
        refreshEntries,
        getEntriesForDate,
        getEntriesForTask,
        getTotalTimeToday,
        getTotalTimeThisWeek,
      }}
    >
      {children}
    </ToolsTimeTrackingContext.Provider>
  );
}

export function useToolsTimeTracking() {
  const context = useContext(ToolsTimeTrackingContext);
  if (context === undefined) {
    throw new Error('useToolsTimeTracking must be used within a ToolsTimeTrackingProvider');
  }
  return context;
}
