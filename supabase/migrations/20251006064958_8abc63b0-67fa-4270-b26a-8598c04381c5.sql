-- Create brand members table
CREATE TABLE public.brand_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, user_id)
);

-- Create brand invitations table
CREATE TABLE public.brand_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(brand_id, email, status) DEFERRABLE INITIALLY DEFERRED
);

-- Enable RLS
ALTER TABLE public.brand_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_members
CREATE POLICY "Users can view members of their brands"
ON public.brand_members
FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM public.brand_members WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand admins and owners can insert members"
ON public.brand_members
FOR INSERT
WITH CHECK (
  brand_id IN (
    SELECT brand_id FROM public.brand_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand admins and owners can update members"
ON public.brand_members
FOR UPDATE
USING (
  brand_id IN (
    SELECT brand_id FROM public.brand_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand admins and owners can delete members"
ON public.brand_members
FOR DELETE
USING (
  brand_id IN (
    SELECT brand_id FROM public.brand_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for brand_invitations
CREATE POLICY "Users can view invitations for their brands"
ON public.brand_invitations
FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id FROM public.brand_members WHERE user_id = auth.uid()
  )
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand admins and owners can create invitations"
ON public.brand_invitations
FOR INSERT
WITH CHECK (
  brand_id IN (
    SELECT brand_id FROM public.brand_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Brand admins and owners can update invitations"
ON public.brand_invitations
FOR UPDATE
USING (
  brand_id IN (
    SELECT brand_id FROM public.brand_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can accept their own invitations"
ON public.brand_invitations
FOR UPDATE
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_brand_members_updated_at
BEFORE UPDATE ON public.brand_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_invitations_updated_at
BEFORE UPDATE ON public.brand_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();