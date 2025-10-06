-- Drop the old check constraint
ALTER TABLE work_tasks DROP CONSTRAINT IF EXISTS work_tasks_assigned_to_check;

-- Add new check constraint that includes 'team'
ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_assigned_to_check 
  CHECK (assigned_to IN ('team', 'ivelin', 'matt', 'alex'));