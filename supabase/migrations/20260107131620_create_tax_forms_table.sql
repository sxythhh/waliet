-- Create tax_forms table to store W-9 and W-8BEN forms submitted by creators
-- This supports the payout flow requirement for tax compliance

CREATE TABLE IF NOT EXISTS tax_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Form type
  form_type TEXT NOT NULL CHECK (form_type IN ('w9', 'w8ben', 'w8bene')),

  -- Form data (stored as JSONB for flexibility)
  -- W-9: name, businessName, federalTaxClassification, address, city, state, zipCode, tinType, tin
  -- W-8BEN: name, countryOfCitizenship, permanentAddress, city, country, foreignTIN, dateOfBirth, etc.
  form_data JSONB NOT NULL,

  -- Signature
  signature_name TEXT NOT NULL,
  signature_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  electronic_signature_consent BOOLEAN NOT NULL DEFAULT true,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),

  -- Verification
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,

  -- Expiry (W-8 forms expire after 3 years from end of calendar year)
  expires_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Version tracking for form updates
  version INTEGER NOT NULL DEFAULT 1,
  replaced_by UUID REFERENCES tax_forms(id)
);

-- Indexes for performance
CREATE INDEX idx_tax_forms_user_id ON tax_forms(user_id);
CREATE INDEX idx_tax_forms_status ON tax_forms(status);
CREATE INDEX idx_tax_forms_expires_at ON tax_forms(expires_at) WHERE status = 'verified';
CREATE INDEX idx_tax_forms_form_type ON tax_forms(form_type);
CREATE INDEX idx_tax_forms_user_form_status ON tax_forms(user_id, form_type, status);

-- RLS Policies
ALTER TABLE tax_forms ENABLE ROW LEVEL SECURITY;

-- Users can view their own tax forms
DROP POLICY IF EXISTS "Users can view own tax forms" ON tax_forms;
CREATE POLICY "Users can view own tax forms" ON tax_forms
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tax forms
DROP POLICY IF EXISTS "Users can insert own tax forms" ON tax_forms;
CREATE POLICY "Users can insert own tax forms" ON tax_forms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all tax forms
DROP POLICY IF EXISTS "Admins can view all tax forms" ON tax_forms;
CREATE POLICY "Admins can view all tax forms" ON tax_forms
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can update tax forms (for verification)
DROP POLICY IF EXISTS "Admins can update tax forms" ON tax_forms;
CREATE POLICY "Admins can update tax forms" ON tax_forms
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tax_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tax_forms_updated_at ON tax_forms;
CREATE TRIGGER tax_forms_updated_at
  BEFORE UPDATE ON tax_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_tax_forms_updated_at();

-- Function to set expiry for W-8 forms (3 years from end of current calendar year)
CREATE OR REPLACE FUNCTION set_w8_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.form_type IN ('w8ben', 'w8bene') AND NEW.expires_at IS NULL THEN
    -- W-8 forms expire on December 31st, 3 years from the signing year
    NEW.expires_at := (DATE_TRUNC('year', NEW.signature_date) + INTERVAL '3 years' + INTERVAL '1 year' - INTERVAL '1 day')::TIMESTAMPTZ;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tax_forms_set_expiry ON tax_forms;
CREATE TRIGGER tax_forms_set_expiry
  BEFORE INSERT ON tax_forms
  FOR EACH ROW
  EXECUTE FUNCTION set_w8_expiry();

-- Comments
COMMENT ON TABLE tax_forms IS 'Stores W-9 and W-8BEN tax forms submitted by creators for IRS compliance';
COMMENT ON COLUMN tax_forms.form_data IS 'JSON containing form field values (name, address, TIN, etc.) - TIN is stored encrypted at rest';
COMMENT ON COLUMN tax_forms.expires_at IS 'W-8 forms expire 3 years from end of signing year; W-9 forms do not expire';
COMMENT ON COLUMN tax_forms.version IS 'Incremented when form is updated/replaced';
COMMENT ON COLUMN tax_forms.replaced_by IS 'References newer version of form if this one was replaced';
