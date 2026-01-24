import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToolsWorkspace } from './ToolsWorkspaceContext';

// Helper to sync a single event to Google Calendar
async function syncEventToGoogle(
  workspaceId: string,
  eventId: string,
  eventData: {
    title: string;
    description?: string | null;
    start_time: string;
    end_time: string;
    all_day?: boolean;
    location?: string | null;
  },
  googleEventId?: string | null,
  action: 'push' | 'delete' = 'push'
): Promise<string | null> {
  try {
    if (action === 'delete' && googleEventId) {
      await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'delete_event',
          workspace_id: workspaceId,
          google_event_id: googleEventId,
        },
      });
      return null;
    }

    if (action === 'push') {
      const { data } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'push_event',
          workspace_id: workspaceId,
          event_id: eventId,
          event_data: {
            title: eventData.title,
            description: eventData.description || '',
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            all_day: eventData.all_day || false,
            location: eventData.location || '',
          },
          google_event_id: googleEventId || undefined,
        },
      });
      return data?.google_event_id || null;
    }

    return null;
  } catch (error) {
    console.error('Failed to sync event to Google:', error);
    return null;
  }
}

export interface CalendarEvent {
  id: string;
  workspace_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string | null;
  color: string | null;
  created_by: string | null;
  partner_id: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventNote {
  id: string;
  event_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
}

interface ToolsEventContextType {
  events: CalendarEvent[];
  isLoading: boolean;
  addEvent: (event: Partial<CalendarEvent>) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
  getEventById: (id: string) => CalendarEvent | undefined;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getEventsForRange: (start: Date, end: Date) => CalendarEvent[];
}

const ToolsEventContext = createContext<ToolsEventContextType | undefined>(undefined);

export function ToolsEventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentWorkspace, isGoogleCalendarConnected } = useToolsWorkspace();

  const fetchEvents = useCallback(async () => {
    if (!currentWorkspace) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tools_events')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (event: Partial<CalendarEvent>): Promise<CalendarEvent | null> => {
    if (!currentWorkspace) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('tools_events')
        .insert({
          ...event,
          workspace_id: currentWorkspace.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Sync to Google Calendar if connected
      if (isGoogleCalendarConnected && data && event.title && event.start_time && event.end_time) {
        const googleEventId = await syncEventToGoogle(
          currentWorkspace.id,
          data.id,
          {
            title: event.title,
            description: event.description,
            start_time: event.start_time,
            end_time: event.end_time,
            all_day: event.all_day,
            location: event.location,
          }
        );
        // Update local state with google_event_id
        if (googleEventId) {
          data.google_event_id = googleEventId;
        }
      }

      setEvents(prev => [...prev, data].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ));
      return data;
    } catch (error) {
      console.error('Error adding event:', error);
      return null;
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      const { error } = await supabase
        .from('tools_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Sync to Google Calendar if connected
      if (isGoogleCalendarConnected && currentWorkspace) {
        const existingEvent = events.find(e => e.id === id);
        if (existingEvent) {
          const updatedEvent = { ...existingEvent, ...updates };
          await syncEventToGoogle(
            currentWorkspace.id,
            id,
            {
              title: updatedEvent.title,
              description: updatedEvent.description,
              start_time: updatedEvent.start_time,
              end_time: updatedEvent.end_time,
              all_day: updatedEvent.all_day,
              location: updatedEvent.location,
            },
            existingEvent.google_event_id
          );
        }
      }

      setEvents(prev =>
        prev.map(e => e.id === id ? { ...e, ...updates } : e)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      );
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      // Get the event before deleting to sync with Google
      const eventToDelete = events.find(e => e.id === id);

      const { error } = await supabase
        .from('tools_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Sync deletion to Google Calendar if connected
      if (isGoogleCalendarConnected && currentWorkspace && eventToDelete?.google_event_id) {
        await syncEventToGoogle(
          currentWorkspace.id,
          id,
          {
            title: eventToDelete.title,
            start_time: eventToDelete.start_time,
            end_time: eventToDelete.end_time,
          },
          eventToDelete.google_event_id,
          'delete'
        );
      }

      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const refreshEvents = async () => {
    await fetchEvents();
  };

  const getEventById = (id: string) => {
    return events.find(e => e.id === id);
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => {
      const eventDate = new Date(e.start_time).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getEventsForRange = (start: Date, end: Date) => {
    return events.filter(e => {
      const eventStart = new Date(e.start_time);
      return eventStart >= start && eventStart <= end;
    });
  };

  return (
    <ToolsEventContext.Provider
      value={{
        events,
        isLoading,
        addEvent,
        updateEvent,
        deleteEvent,
        refreshEvents,
        getEventById,
        getEventsForDate,
        getEventsForRange,
      }}
    >
      {children}
    </ToolsEventContext.Provider>
  );
}

export function useToolsEvents() {
  const context = useContext(ToolsEventContext);
  if (context === undefined) {
    throw new Error('useToolsEvents must be used within a ToolsEventProvider');
  }
  return context;
}
