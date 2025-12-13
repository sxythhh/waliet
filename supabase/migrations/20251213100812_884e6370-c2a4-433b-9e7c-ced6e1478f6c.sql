-- Add DELETE policy for conversations - creators can delete their own conversations
CREATE POLICY "Creators can delete their own conversations" 
ON public.conversations 
FOR DELETE 
USING (auth.uid() = creator_id);

-- Brand members can delete their brand's conversations
CREATE POLICY "Brand members can delete their conversations" 
ON public.conversations 
FOR DELETE 
USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Also need DELETE policy for messages when conversation is deleted
CREATE POLICY "Creators can delete messages in their conversations" 
ON public.messages 
FOR DELETE 
USING (conversation_id IN (
  SELECT id FROM conversations WHERE creator_id = auth.uid()
));

CREATE POLICY "Brand members can delete messages in their conversations" 
ON public.messages 
FOR DELETE 
USING (conversation_id IN (
  SELECT id FROM conversations WHERE is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role)
));