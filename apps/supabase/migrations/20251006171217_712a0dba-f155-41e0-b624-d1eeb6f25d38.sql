-- Add reminder_at column to work_tasks table
ALTER TABLE public.work_tasks 
ADD COLUMN reminder_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of pending reminders
CREATE INDEX idx_work_tasks_reminder 
ON public.work_tasks(reminder_at) 
WHERE reminder_at IS NOT NULL AND status != 'done';