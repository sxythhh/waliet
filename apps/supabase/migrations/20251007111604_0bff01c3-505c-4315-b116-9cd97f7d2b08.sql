-- Create roadmap phases table
CREATE TABLE public.roadmap_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roadmap tasks table
CREATE TABLE public.roadmap_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.roadmap_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  is_section_header BOOLEAN NOT NULL DEFAULT false,
  link_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task completions table
CREATE TABLE public.roadmap_task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.roadmap_tasks(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, brand_id)
);

-- Enable RLS
ALTER TABLE public.roadmap_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roadmap_phases
CREATE POLICY "Brand members can view their brand's phases"
  ON public.roadmap_phases FOR SELECT
  USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all phases"
  ON public.roadmap_phases FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for roadmap_tasks
CREATE POLICY "Users can view tasks for their brand's phases"
  ON public.roadmap_tasks FOR SELECT
  USING (
    phase_id IN (
      SELECT id FROM public.roadmap_phases 
      WHERE is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Admins can manage all tasks"
  ON public.roadmap_tasks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for roadmap_task_completions
CREATE POLICY "Users can view completions for their brand"
  ON public.roadmap_task_completions FOR SELECT
  USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand members can complete tasks"
  ON public.roadmap_task_completions FOR INSERT
  WITH CHECK (is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand members can uncomplete tasks"
  ON public.roadmap_task_completions FOR DELETE
  USING (is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Admins can manage all completions"
  ON public.roadmap_task_completions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_roadmap_phases_updated_at
  BEFORE UPDATE ON public.roadmap_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_roadmap_tasks_updated_at
  BEFORE UPDATE ON public.roadmap_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();