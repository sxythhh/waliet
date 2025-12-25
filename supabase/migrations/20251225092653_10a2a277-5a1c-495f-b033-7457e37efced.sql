-- Create brand_creator_relationships table
-- Core table linking brands to creators (both platform users and external)
CREATE TABLE public.brand_creator_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_name TEXT,
  external_email TEXT,
  external_platform TEXT,
  external_handle TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual_add',
  source_id UUID,
  first_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_brand_user UNIQUE (brand_id, user_id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT unique_brand_external UNIQUE (brand_id, external_email) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT check_creator_type CHECK (
    (user_id IS NOT NULL) OR 
    (external_name IS NOT NULL AND (external_email IS NOT NULL OR external_handle IS NOT NULL))
  )
);

-- Create creator_tags table
CREATE TABLE public.creator_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_brand_tag_name UNIQUE (brand_id, name)
);

-- Create brand_creator_tags junction table
CREATE TABLE public.brand_creator_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id UUID NOT NULL REFERENCES public.brand_creator_relationships(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.creator_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_relationship_tag UNIQUE (relationship_id, tag_id)
);

-- Create creator_notes table
CREATE TABLE public.creator_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id UUID NOT NULL REFERENCES public.brand_creator_relationships(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_brand_creator_relationships_brand_id ON public.brand_creator_relationships(brand_id);
CREATE INDEX idx_brand_creator_relationships_user_id ON public.brand_creator_relationships(user_id);
CREATE INDEX idx_brand_creator_relationships_external_email ON public.brand_creator_relationships(external_email);
CREATE INDEX idx_brand_creator_relationships_external_handle ON public.brand_creator_relationships(external_handle, external_platform);
CREATE INDEX idx_creator_tags_brand_id ON public.creator_tags(brand_id);
CREATE INDEX idx_brand_creator_tags_relationship_id ON public.brand_creator_tags(relationship_id);
CREATE INDEX idx_creator_notes_relationship_id ON public.creator_notes(relationship_id);

-- Enable RLS
ALTER TABLE public.brand_creator_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_creator_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_creator_relationships
CREATE POLICY "Brand members can view their brand relationships"
  ON public.brand_creator_relationships FOR SELECT
  USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand members can insert relationships"
  ON public.brand_creator_relationships FOR INSERT
  WITH CHECK (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand members can update their brand relationships"
  ON public.brand_creator_relationships FOR UPDATE
  USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand members can delete their brand relationships"
  ON public.brand_creator_relationships FOR DELETE
  USING (public.is_brand_member(auth.uid(), brand_id));

-- RLS policies for creator_tags
CREATE POLICY "Brand members can view their brand tags"
  ON public.creator_tags FOR SELECT
  USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand members can insert tags"
  ON public.creator_tags FOR INSERT
  WITH CHECK (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand members can update their brand tags"
  ON public.creator_tags FOR UPDATE
  USING (public.is_brand_member(auth.uid(), brand_id));

CREATE POLICY "Brand members can delete their brand tags"
  ON public.creator_tags FOR DELETE
  USING (public.is_brand_member(auth.uid(), brand_id));

-- RLS policies for brand_creator_tags
CREATE POLICY "Brand members can view relationship tags"
  ON public.brand_creator_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.brand_creator_relationships bcr
    WHERE bcr.id = relationship_id
    AND public.is_brand_member(auth.uid(), bcr.brand_id)
  ));

CREATE POLICY "Brand members can insert relationship tags"
  ON public.brand_creator_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brand_creator_relationships bcr
    WHERE bcr.id = relationship_id
    AND public.is_brand_member(auth.uid(), bcr.brand_id)
  ));

CREATE POLICY "Brand members can delete relationship tags"
  ON public.brand_creator_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.brand_creator_relationships bcr
    WHERE bcr.id = relationship_id
    AND public.is_brand_member(auth.uid(), bcr.brand_id)
  ));

-- RLS policies for creator_notes
CREATE POLICY "Brand members can view relationship notes"
  ON public.creator_notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.brand_creator_relationships bcr
    WHERE bcr.id = relationship_id
    AND public.is_brand_member(auth.uid(), bcr.brand_id)
  ));

CREATE POLICY "Brand members can insert notes"
  ON public.creator_notes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brand_creator_relationships bcr
    WHERE bcr.id = relationship_id
    AND public.is_brand_member(auth.uid(), bcr.brand_id)
  ));

CREATE POLICY "Brand members can delete their own notes"
  ON public.creator_notes FOR DELETE
  USING (created_by = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_brand_creator_relationships_updated_at
  BEFORE UPDATE ON public.brand_creator_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();