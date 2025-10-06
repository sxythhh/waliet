-- Create table for warmap events
CREATE TABLE public.warmap_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for work tasks
CREATE TABLE public.work_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT CHECK (assigned_to IN ('matt', 'ivelin', 'alex')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.warmap_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for warmap_events (admin only)
CREATE POLICY "Admins can manage warmap events"
ON public.warmap_events
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for work_tasks (admin only)
CREATE POLICY "Admins can manage work tasks"
ON public.work_tasks
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_warmap_events_updated_at
  BEFORE UPDATE ON public.warmap_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_work_tasks_updated_at
  BEFORE UPDATE ON public.work_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();