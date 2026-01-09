-- Create unified video_submissions table
CREATE TABLE public.video_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source reference (unified)
  source_type text NOT NULL CHECK (source_type IN ('campaign', 'boost')),
  source_id uuid NOT NULL,
  brand_id uuid REFERENCES public.brands(id),
  
  -- Creator
  creator_id uuid NOT NULL,
  
  -- Video details
  video_url text NOT NULL,
  platform text,
  shortimize_video_id text,
  
  -- Submission content
  submission_notes text,
  
  -- Status & Review
  status text DEFAULT 'pending',
  is_flagged boolean DEFAULT false,
  flag_deadline timestamptz,
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  
  -- Payout
  payout_amount numeric DEFAULT 0,
  
  -- Quality scoring
  bot_score integer,
  
  -- Shortimize Metrics (synced every 8 hours)
  views bigint DEFAULT 0,
  likes bigint DEFAULT 0,
  comments bigint DEFAULT 0,
  shares bigint DEFAULT 0,
  bookmarks bigint DEFAULT 0,
  metrics_updated_at timestamptz,
  
  -- Timestamps
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_video_submissions_source ON public.video_submissions(source_type, source_id);
CREATE INDEX idx_video_submissions_creator ON public.video_submissions(creator_id);
CREATE INDEX idx_video_submissions_brand ON public.video_submissions(brand_id);
CREATE INDEX idx_video_submissions_shortimize ON public.video_submissions(shortimize_video_id);
CREATE INDEX idx_video_submissions_status ON public.video_submissions(status);

-- Enable RLS
ALTER TABLE public.video_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Creators can view their own submissions"
ON public.video_submissions FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own submissions"
ON public.video_submissions FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own submissions"
ON public.video_submissions FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Brand members can view submissions for their programs"
ON public.video_submissions FOR SELECT
USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand members can update submissions for their programs"
ON public.video_submissions FOR UPDATE
USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all submissions"
ON public.video_submissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create program_video_metrics table for aggregated metrics
CREATE TABLE public.program_video_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('campaign', 'boost')),
  source_id uuid NOT NULL,
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  
  total_views bigint DEFAULT 0,
  total_likes bigint DEFAULT 0,
  total_comments bigint DEFAULT 0,
  total_shares bigint DEFAULT 0,
  total_bookmarks bigint DEFAULT 0,
  total_videos integer DEFAULT 0,
  
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_program_video_metrics_source ON public.program_video_metrics(source_type, source_id);
CREATE INDEX idx_program_video_metrics_brand ON public.program_video_metrics(brand_id);
CREATE INDEX idx_program_video_metrics_recorded ON public.program_video_metrics(recorded_at);

-- Enable RLS
ALTER TABLE public.program_video_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program_video_metrics
CREATE POLICY "Brand members can view their program metrics"
ON public.program_video_metrics FOR SELECT
USING (is_brand_member(auth.uid(), brand_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all program metrics"
ON public.program_video_metrics FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger for video_submissions
CREATE TRIGGER update_video_submissions_updated_at
BEFORE UPDATE ON public.video_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing campaign_videos data to the new unified table
INSERT INTO public.video_submissions (
  source_type, source_id, brand_id, creator_id, video_url, platform,
  shortimize_video_id, submission_notes, status, is_flagged, flag_deadline,
  payout_amount, bot_score, submitted_at, created_at, updated_at
)
SELECT 
  'campaign', 
  cv.campaign_id, 
  c.brand_id, 
  cv.creator_id, 
  cv.video_url, 
  cv.platform,
  cv.shortimize_video_id, 
  cv.submission_text, 
  cv.status, 
  COALESCE(cv.is_flagged, false), 
  cv.flag_deadline,
  COALESCE(cv.estimated_payout, 0), 
  cv.bot_score, 
  cv.created_at, 
  cv.created_at, 
  cv.updated_at
FROM public.campaign_videos cv
JOIN public.campaigns c ON c.id = cv.campaign_id;

-- Migrate existing boost_video_submissions data to the new unified table
INSERT INTO public.video_submissions (
  source_type, source_id, brand_id, creator_id, video_url, platform,
  shortimize_video_id, submission_notes, status, is_flagged,
  payout_amount, rejection_reason, reviewed_at, reviewed_by,
  submitted_at, created_at, updated_at
)
SELECT 
  'boost', 
  bvs.bounty_campaign_id, 
  bc.brand_id, 
  bvs.user_id, 
  bvs.video_url, 
  bvs.platform,
  bvs.shortimize_video_id, 
  bvs.submission_notes, 
  bvs.status, 
  COALESCE(bvs.is_flagged, false),
  COALESCE(bvs.payout_amount, 0), 
  bvs.rejection_reason,
  bvs.reviewed_at,
  bvs.reviewed_by,
  bvs.submitted_at, 
  bvs.created_at, 
  bvs.updated_at
FROM public.boost_video_submissions bvs
JOIN public.bounty_campaigns bc ON bc.id = bvs.bounty_campaign_id;