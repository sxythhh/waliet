-- Contract Templates for reusable agreement structures
-- Brands can create templates with variables that get filled in when creating contracts

-- Contract templates table
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Template content with variables like {{creator_name}}, {{monthly_rate}}, etc.
  content TEXT NOT NULL,
  -- Default values that can be overridden per contract
  default_monthly_rate DECIMAL(10,2),
  default_videos_per_month INTEGER,
  default_duration_months INTEGER DEFAULT 12,
  -- Template metadata
  is_default BOOLEAN DEFAULT FALSE, -- One default template per brand
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Template sections for more structured templates
CREATE TABLE IF NOT EXISTS contract_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE, -- If false, can be excluded from contract
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom variables for templates
CREATE TABLE IF NOT EXISTS contract_template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL, -- e.g., "exclusivity_period", "platform_restrictions"
  variable_label TEXT NOT NULL, -- e.g., "Exclusivity Period", "Platform Restrictions"
  variable_type TEXT DEFAULT 'text' CHECK (variable_type IN ('text', 'number', 'date', 'select', 'boolean')),
  default_value TEXT,
  options TEXT[], -- For select type, list of options
  is_required BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contract_templates_brand ON contract_templates(brand_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_default ON contract_templates(brand_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_contract_template_sections_template ON contract_template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_contract_template_variables_template ON contract_template_variables(template_id);

-- RLS Policies
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_template_variables ENABLE ROW LEVEL SECURITY;

-- Templates: Brand members can manage
CREATE POLICY "Brand members can manage templates" ON contract_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = contract_templates.brand_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Template sections: Same as templates
CREATE POLICY "Brand members can manage template sections" ON contract_template_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contract_templates
      JOIN brand_members ON brand_members.brand_id = contract_templates.brand_id
      WHERE contract_templates.id = contract_template_sections.template_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Template variables: Same as templates
CREATE POLICY "Brand members can manage template variables" ON contract_template_variables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contract_templates
      JOIN brand_members ON brand_members.brand_id = contract_templates.brand_id
      WHERE contract_templates.id = contract_template_variables.template_id
      AND brand_members.user_id = auth.uid()
    )
  );

-- Function to ensure only one default template per brand
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE contract_templates
    SET is_default = FALSE
    WHERE brand_id = NEW.brand_id
    AND id != NEW.id
    AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_template
BEFORE INSERT OR UPDATE ON contract_templates
FOR EACH ROW
WHEN (NEW.is_default = TRUE)
EXECUTE FUNCTION ensure_single_default_template();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE contract_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add template_id column to creator_contracts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_contracts' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE creator_contracts ADD COLUMN template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Insert a default template for existing brands
INSERT INTO contract_templates (brand_id, name, description, content, default_monthly_rate, default_videos_per_month, default_duration_months, is_default, is_active)
SELECT
  id as brand_id,
  'Standard Creator Agreement' as name,
  'Default template for creator content partnerships' as description,
  'CREATOR CONTENT AGREEMENT

This Creator Content Agreement ("Agreement") is entered into between {{brand_name}} ("Brand") and {{creator_name}} ("Creator").

TERMS AND CONDITIONS

1. CONTENT DELIVERABLES
Creator agrees to produce and deliver {{videos_per_month}} videos per month for the duration of this agreement.

2. COMPENSATION
Brand agrees to pay Creator ${{monthly_rate}} per month for the content deliverables specified above.

3. TERM
This Agreement shall commence on {{start_date}} and continue for {{duration_months}} months, unless terminated earlier in accordance with the terms herein.

4. CONTENT RIGHTS
Creator grants Brand a non-exclusive, worldwide license to use, reproduce, and distribute the content created under this Agreement for marketing and promotional purposes.

5. CONTENT GUIDELINES
Creator agrees to follow all brand guidelines provided and ensure all content is original and does not infringe upon any third-party rights.

6. TERMINATION
Either party may terminate this Agreement with 30 days written notice. In the event of termination, Creator shall be compensated for all content delivered up to the termination date.

7. CONFIDENTIALITY
Creator agrees to keep confidential all non-public information about Brand and its products.

{{additional_terms}}

By signing below, both parties agree to the terms and conditions outlined in this Agreement.

____________________
Brand Representative
Date: {{signature_date}}

____________________
Creator: {{creator_name}}
Date: {{signature_date}}' as content,
  1000.00 as default_monthly_rate,
  4 as default_videos_per_month,
  12 as default_duration_months,
  true as is_default,
  true as is_active
FROM brands
ON CONFLICT DO NOTHING;
