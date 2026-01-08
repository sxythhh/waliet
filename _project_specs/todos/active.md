# Active Todos

Current work in progress. Each todo follows the atomic todo format from base.md skill.

---

## [FEAT-001] Public Boost Application Form (Google Forms-like)

**Status:** in-progress
**Priority:** high
**Estimate:** L

### Description
Create a whitelabeled public application page for boost campaigns that allows external users (non-logged-in viewers) to apply. The form should feel like Google Forms - simple, clean, and focused. Brands can configure requirements like email (required), Discord verification, phone number, and custom questions. The page uses the brand's workspace color for whitelabeling.

### Feature Requirements
1. **Public Access**: No auth required to view the form
2. **Email Required**: Always collect email as the primary identifier
3. **Configurable Requirements**: Brands can toggle:
   - Discord account verification
   - Phone number collection
   - Social account connection (TikTok/Instagram/YouTube)
   - Custom application questions (using existing ApplicationQuestion system)
4. **Whitelabel Theming**: Apply brand's `brand_color` to buttons, accents, headers
5. **Simplistic UX**: Google Forms-like aesthetic - clean, minimal, focused
6. **Integration**: Works alongside existing ApplyToBountySheet for logged-in users

### Technical Design

#### Database Changes
New columns on `bounty_campaigns` table:
```sql
ALTER TABLE bounty_campaigns ADD COLUMN public_application_enabled boolean DEFAULT false;
ALTER TABLE bounty_campaigns ADD COLUMN public_form_settings jsonb DEFAULT '{}';
-- public_form_settings structure:
-- {
--   "require_discord": boolean,
--   "require_phone": boolean,
--   "require_social_account": boolean,
--   "social_platforms": ["tiktok", "instagram", "youtube"],
--   "custom_intro_text": string,
--   "success_message": string
-- }
```

#### New Components
1. `src/pages/PublicBoostApplication.tsx` - Main public form page
2. `src/components/public-form/PublicFormHeader.tsx` - Brand header with logo/color
3. `src/components/public-form/PublicFormFields.tsx` - Form field renderer
4. `src/components/public-form/PublicFormSuccess.tsx` - Success state
5. `src/components/brand/PublicFormSettingsTab.tsx` - Brand config UI

#### Route
- `/apply/{slug}` - Public application form for boost with slug

### Acceptance Criteria
- [ ] Public form accessible without authentication
- [ ] Email is always required and collected
- [ ] Brand color applied to form UI (buttons, accents, progress)
- [ ] Form shows brand logo and name in header
- [ ] Discord verification works via OAuth redirect
- [ ] Phone number validation and collection works
- [ ] Custom application questions render correctly
- [ ] Successful submission creates bounty_application record
- [ ] Brand can enable/disable public form via settings
- [ ] Brand can configure which requirements are mandatory
- [ ] Form is mobile-responsive
- [ ] Loading and error states handled gracefully

### Test Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Visit /apply/{slug} without auth | Form loads, shows brand header |
| Submit with valid email only | Application created if no other reqs |
| Submit without email | Validation error shown |
| Brand has require_discord: true | Discord OAuth button appears |
| Brand has require_phone: true | Phone input field appears |
| Brand color is #FF5733 | Buttons/accents use that color |
| Boost is paused | Show "Applications Paused" message |
| Boost is full | Show waitlist option |

### Dependencies
- Existing: `ApplicationQuestionsRenderer`, `validateApplicationAnswers`
- Existing: `bounty_campaigns` table, `bounty_applications` table
- Existing: Discord OAuth flow in `/connect-discord`

---

## Sub-Tasks

### [FEAT-001a] Database Migration for Public Form Settings
**Status:** pending
**Priority:** high
**Estimate:** XS

Create migration to add public form columns to bounty_campaigns.

### [FEAT-001b] PublicBoostApplication Page Component
**Status:** pending
**Priority:** high
**Estimate:** M

Build the main page component with:
- Brand header with logo, name, and accent color
- Form fields based on settings
- Email input (always required)
- Conditional Discord/Phone/Social fields
- Application questions renderer
- Submit button with loading state
- Success/error states

### [FEAT-001c] Public Form Settings UI for Brands
**Status:** pending
**Priority:** medium
**Estimate:** S

Add settings tab/section in brand's boost management to:
- Toggle public form enabled
- Configure required fields
- Set custom intro/success text
- Preview the public form

### [FEAT-001d] Route Configuration
**Status:** pending
**Priority:** high
**Estimate:** XS

Add `/apply/{slug}` route to App.tsx routing configuration.

---
