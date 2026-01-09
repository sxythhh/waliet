-- Add order_index column to work_tasks table
ALTER TABLE public.work_tasks 
ADD COLUMN order_index INTEGER DEFAULT 0;

-- Update existing tasks with sequential order_index based on created_at
WITH ordered_tasks AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY assigned_to ORDER BY created_at) - 1 as new_order
  FROM public.work_tasks
)
UPDATE public.work_tasks
SET order_index = ordered_tasks.new_order
FROM ordered_tasks
WHERE work_tasks.id = ordered_tasks.id;