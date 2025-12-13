
-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('brand', 'creator')),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_conversations_brand_id ON public.conversations(brand_id);
CREATE INDEX idx_conversations_creator_id ON public.conversations(creator_id);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Brand members can view their brand conversations"
ON public.conversations FOR SELECT
USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand members can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand members can update their conversations"
ON public.conversations FOR UPDATE
USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can view their own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = creator_id);

-- RLS Policies for messages
CREATE POLICY "Brand members can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Creators can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.conversations WHERE creator_id = auth.uid()
  )
);

CREATE POLICY "Brand members can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Creators can send messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations WHERE creator_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (sender_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Trigger to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_conversation_last_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();
