-- Content Calendar & Deliverables System Migration
-- Part of Retainer Campaign Lifecycle Management

-- ============================================================================
-- DELIVERABLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS boost_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID NOT NULL REFERENCES bounty_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Deliverable details
  title TEXT NOT NULL,
  description TEXT,
  content_brief TEXT, -- Detailed instructions for the creator

  -- Scheduling
  due_date DATE NOT NULL,
  due_time TIME, -- Optional specific time
  reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1], -- Days before to send reminders

  -- Content requirements
  content_type TEXT NOT NULL DEFAULT 'video' CHECK (content_type IN (
    'video', 'short', 'reel', 'story', 'post', 'carousel', 'live', 'other'
  )),
  platform TEXT CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'twitter', 'other')),
  min_duration_seconds INTEGER, -- For video content
  max_duration_seconds INTEGER,
  required_hashtags TEXT[],
  required_mentions TEXT[],

  -- Status tracking
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',      -- Upcoming deliverable
    'in_progress',    -- Creator is working on it
    'submitted',      -- Creator submitted, awaiting review
    'revision_requested', -- Needs changes
    'approved',       -- Approved by brand
    'late',           -- Past due date, not submitted
    'missed',         -- Marked as missed (will not be submitted)
    'cancelled'       -- Cancelled by brand
  )),

  -- Submission tracking
  submission_id UUID REFERENCES video_submissions(id),
  submitted_at TIMESTAMPTZ,
  revision_notes TEXT,
  revision_count INTEGER DEFAULT 0,

  -- Review tracking
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  -- Priority and ordering
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  sort_order INTEGER DEFAULT 0,

  -- Recurring info (if generated from template)
  template_id UUID REFERENCES deliverable_templates(id),
  recurrence_instance INTEGER, -- Which instance of the recurrence (1, 2, 3...)

  -- Reminder tracking
  reminder_7d_sent_at TIMESTAMPTZ,
  reminder_3d_sent_at TIMESTAMPTZ,
  reminder_1d_sent_at TIMESTAMPTZ,
  overdue_reminder_sent_at TIMESTAMPTZ,

  -- Notes
  brand_notes TEXT, -- Internal notes from brand
  creator_notes TEXT, -- Notes from creator

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_boost_deliverables_campaign ON boost_deliverables(bounty_campaign_id);
CREATE INDEX idx_boost_deliverables_user ON boost_deliverables(user_id);
CREATE INDEX idx_boost_deliverables_due_date ON boost_deliverables(due_date);
CREATE INDEX idx_boost_deliverables_status ON boost_deliverables(status);
CREATE INDEX idx_boost_deliverables_campaign_user ON boost_deliverables(bounty_campaign_id, user_id);

-- ============================================================================
-- DELIVERABLE TEMPLATES (For recurring deliverables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS deliverable_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_campaign_id UUID NOT NULL REFERENCES bounty_campaigns(id) ON DELETE CASCADE,

  -- Template details
  title TEXT NOT NULL,
  description TEXT,
  content_brief TEXT,

  -- Content requirements
  content_type TEXT NOT NULL DEFAULT 'video',
  platform TEXT,
  min_duration_seconds INTEGER,
  max_duration_seconds INTEGER,
  required_hashtags TEXT[],
  required_mentions TEXT[],

  -- Recurrence settings
  recurrence TEXT NOT NULL CHECK (recurrence IN ('weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, for weekly/biweekly
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 28), -- For monthly
  week_of_month INTEGER CHECK (week_of_month BETWEEN 1 AND 4), -- For biweekly

  -- Assignment
  apply_to_all_creators BOOLEAN DEFAULT true,
  specific_tier_ids UUID[], -- Only apply to certain tiers
  specific_user_ids UUID[], -- Only apply to specific users

  -- Auto-generation
  auto_create BOOLEAN DEFAULT true, -- Automatically create deliverables
  advance_days INTEGER DEFAULT 14, -- How many days in advance to create

  -- Priority
  default_priority TEXT DEFAULT 'normal',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_deliverable_templates_campaign ON deliverable_templates(bounty_campaign_id);
CREATE INDEX idx_deliverable_templates_active ON deliverable_templates(is_active);

-- ============================================================================
-- DELIVERABLE COMMENTS (For communication on specific deliverables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS deliverable_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES boost_deliverables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('creator', 'brand', 'system')),

  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of {url, filename, type}

  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_deliverable_comments_deliverable ON deliverable_comments(deliverable_id);
CREATE INDEX idx_deliverable_comments_created ON deliverable_comments(created_at DESC);

-- ============================================================================
-- ADD DELIVERABLES SUPPORT TO BOUNTY_CAMPAIGNS
-- ============================================================================

ALTER TABLE bounty_campaigns
ADD COLUMN IF NOT EXISTS deliverables_enabled BOOLEAN DEFAULT false;

ALTER TABLE bounty_campaigns
ADD COLUMN IF NOT EXISTS auto_create_deliverables BOOLEAN DEFAULT true;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get upcoming deliverables for a creator
CREATE OR REPLACE FUNCTION get_creator_deliverables(
  p_campaign_id UUID,
  p_user_id UUID,
  p_status TEXT[] DEFAULT ARRAY['scheduled', 'in_progress', 'revision_requested'],
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  due_date DATE,
  content_type TEXT,
  platform TEXT,
  status TEXT,
  priority TEXT,
  days_until_due INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.description,
    d.due_date,
    d.content_type,
    d.platform,
    d.status,
    d.priority,
    (d.due_date - CURRENT_DATE)::INTEGER as days_until_due
  FROM boost_deliverables d
  WHERE d.bounty_campaign_id = p_campaign_id
    AND d.user_id = p_user_id
    AND d.status = ANY(p_status)
  ORDER BY d.due_date ASC, d.priority DESC
  LIMIT p_limit;
END;
$$;

-- Function to auto-create deliverables from templates
CREATE OR REPLACE FUNCTION create_deliverables_from_template(
  p_template_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days')::DATE
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_template RECORD;
  v_user RECORD;
  v_current_date DATE;
  v_due_date DATE;
  v_created_count INTEGER := 0;
  v_instance INTEGER;
BEGIN
  -- Get template
  SELECT * INTO v_template FROM deliverable_templates WHERE id = p_template_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Get users to create deliverables for
  FOR v_user IN
    SELECT DISTINCT a.user_id
    FROM bounty_applications a
    WHERE a.bounty_campaign_id = v_template.bounty_campaign_id
      AND a.status = 'accepted'
      AND (
        v_template.apply_to_all_creators = true
        OR a.user_id = ANY(v_template.specific_user_ids)
        OR EXISTS (
          SELECT 1 FROM creator_tier_assignments cta
          WHERE cta.user_id = a.user_id
            AND cta.bounty_campaign_id = v_template.bounty_campaign_id
            AND cta.tier_id = ANY(v_template.specific_tier_ids)
        )
      )
  LOOP
    -- Calculate due dates based on recurrence
    v_current_date := p_start_date;
    v_instance := 1;

    WHILE v_current_date <= p_end_date LOOP
      -- Calculate next due date based on recurrence type
      IF v_template.recurrence = 'weekly' THEN
        -- Find next occurrence of day_of_week
        v_due_date := v_current_date + ((v_template.day_of_week - EXTRACT(DOW FROM v_current_date)::INTEGER + 7) % 7);
        IF v_due_date < v_current_date THEN
          v_due_date := v_due_date + 7;
        END IF;
        v_current_date := v_due_date + 7;
      ELSIF v_template.recurrence = 'biweekly' THEN
        v_due_date := v_current_date + ((v_template.day_of_week - EXTRACT(DOW FROM v_current_date)::INTEGER + 7) % 7);
        IF v_due_date < v_current_date THEN
          v_due_date := v_due_date + 7;
        END IF;
        v_current_date := v_due_date + 14;
      ELSIF v_template.recurrence = 'monthly' THEN
        v_due_date := DATE_TRUNC('month', v_current_date)::DATE + (v_template.day_of_month - 1);
        IF v_due_date < v_current_date THEN
          v_due_date := DATE_TRUNC('month', v_current_date + INTERVAL '1 month')::DATE + (v_template.day_of_month - 1);
        END IF;
        v_current_date := v_due_date + 1;
      END IF;

      -- Skip if due date is outside range
      IF v_due_date < p_start_date OR v_due_date > p_end_date THEN
        CONTINUE;
      END IF;

      -- Check if deliverable already exists
      IF NOT EXISTS (
        SELECT 1 FROM boost_deliverables
        WHERE template_id = p_template_id
          AND user_id = v_user.user_id
          AND due_date = v_due_date
      ) THEN
        -- Create deliverable
        INSERT INTO boost_deliverables (
          bounty_campaign_id,
          user_id,
          title,
          description,
          content_brief,
          due_date,
          content_type,
          platform,
          min_duration_seconds,
          max_duration_seconds,
          required_hashtags,
          required_mentions,
          priority,
          template_id,
          recurrence_instance
        ) VALUES (
          v_template.bounty_campaign_id,
          v_user.user_id,
          v_template.title,
          v_template.description,
          v_template.content_brief,
          v_due_date,
          v_template.content_type,
          v_template.platform,
          v_template.min_duration_seconds,
          v_template.max_duration_seconds,
          v_template.required_hashtags,
          v_template.required_mentions,
          v_template.default_priority,
          p_template_id,
          v_instance
        );

        v_created_count := v_created_count + 1;
      END IF;

      v_instance := v_instance + 1;
    END LOOP;
  END LOOP;

  RETURN v_created_count;
END;
$$;

-- Trigger to auto-update status to 'late' when due date passes
CREATE OR REPLACE FUNCTION update_deliverable_late_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Update any scheduled/in_progress deliverables that are now late
  UPDATE boost_deliverables
  SET status = 'late', updated_at = now()
  WHERE status IN ('scheduled', 'in_progress')
    AND due_date < CURRENT_DATE;

  RETURN NULL;
END;
$$;

-- This could be a cron job instead, but we'll check on each insert/update
-- CREATE TRIGGER trg_check_late_deliverables
--   AFTER INSERT OR UPDATE ON boost_deliverables
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION update_deliverable_late_status();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE boost_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_comments ENABLE ROW LEVEL SECURITY;

-- boost_deliverables policies
CREATE POLICY "Users can view their own deliverables"
  ON boost_deliverables FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own deliverables"
  ON boost_deliverables FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Brand members can view deliverables for their boosts"
  ON boost_deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brand_members bm ON bm.brand_id = bc.brand_id
      WHERE bc.id = bounty_campaign_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members can manage deliverables for their boosts"
  ON boost_deliverables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brand_members bm ON bm.brand_id = bc.brand_id
      WHERE bc.id = bounty_campaign_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all deliverables"
  ON boost_deliverables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- deliverable_templates policies
CREATE POLICY "Brand members can manage templates for their boosts"
  ON deliverable_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bounty_campaigns bc
      JOIN brand_members bm ON bm.brand_id = bc.brand_id
      WHERE bc.id = bounty_campaign_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can view templates for their boosts"
  ON deliverable_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bounty_applications ba
      WHERE ba.bounty_campaign_id = bounty_campaign_id
      AND ba.user_id = auth.uid()
      AND ba.status = 'accepted'
    )
  );

CREATE POLICY "Admins can manage all templates"
  ON deliverable_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- deliverable_comments policies
CREATE POLICY "Users can view comments on their deliverables"
  ON deliverable_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boost_deliverables d
      WHERE d.id = deliverable_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on their deliverables"
  ON deliverable_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM boost_deliverables d
      WHERE d.id = deliverable_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members can view/create comments on their boost deliverables"
  ON deliverable_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM boost_deliverables d
      JOIN bounty_campaigns bc ON bc.id = d.bounty_campaign_id
      JOIN brand_members bm ON bm.brand_id = bc.brand_id
      WHERE d.id = deliverable_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all comments"
  ON deliverable_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_boost_deliverables_updated_at ON boost_deliverables;
CREATE TRIGGER update_boost_deliverables_updated_at
  BEFORE UPDATE ON boost_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deliverable_templates_updated_at ON deliverable_templates;
CREATE TRIGGER update_deliverable_templates_updated_at
  BEFORE UPDATE ON deliverable_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
