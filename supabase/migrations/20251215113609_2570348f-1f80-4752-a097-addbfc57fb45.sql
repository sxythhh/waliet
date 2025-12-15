-- Create feedback submissions table
CREATE TABLE public.feedback_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feature', 'bug')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Users can create their own feedback
CREATE POLICY "Users can create own feedback"
ON public.feedback_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.feedback_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.feedback_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update feedback status
CREATE POLICY "Admins can update feedback"
ON public.feedback_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_feedback_submissions_updated_at
BEFORE UPDATE ON public.feedback_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();