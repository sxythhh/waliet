// Tax Form Types for W-9 and W-8BEN compliance

export type TaxFormType = 'w9' | 'w8ben' | 'w8bene';
export type TaxFormStatus = 'pending' | 'verified' | 'rejected' | 'expired';
export type TaxClassification = 'us_citizen' | 'us_resident' | 'non_resident_alien' | 'foreign_entity';

// Federal tax classification options for W-9
export type FederalTaxClassification =
  | 'individual'
  | 'c_corporation'
  | 's_corporation'
  | 'partnership'
  | 'trust_estate'
  | 'llc'
  | 'other';

export type LLCTaxClassification = 'c' | 's' | 'p';
export type TINType = 'ssn' | 'ein';

// W-9 Form Data Structure (US persons)
export interface W9FormData {
  // Line 1: Name
  name: string;

  // Line 2: Business name (optional)
  businessName?: string;

  // Line 3: Federal tax classification
  federalTaxClassification: FederalTaxClassification;
  llcTaxClassification?: LLCTaxClassification;
  otherClassification?: string;

  // Line 4: Exemptions (optional, for entities)
  exemptPayeeCode?: string;
  fatcaExemptionCode?: string;

  // Lines 5-6: Address
  address: string;
  city: string;
  state: string;
  zipCode: string;

  // Line 7: Account numbers (optional)
  accountNumbers?: string;

  // Part I: TIN
  tinType: TINType;
  tin: string; // Stored masked: XXX-XX-1234 or XX-XXX1234
}

// W-8BEN Form Data Structure (Non-US individuals)
export interface W8BENFormData {
  // Part I: Identification
  name: string;
  countryOfCitizenship: string;

  // Permanent residence address
  permanentAddress: string;
  city: string;
  country: string;
  postalCode?: string;

  // Mailing address (if different)
  mailingAddressDifferent: boolean;
  mailingAddress?: string;
  mailingCity?: string;
  mailingCountry?: string;
  mailingPostalCode?: string;

  // Tax ID
  foreignTIN?: string;
  foreignTINNotRequired?: boolean;
  usTIN?: string;

  // Reference numbers (optional)
  referenceNumbers?: string;

  // Date of birth (YYYY-MM-DD)
  dateOfBirth: string;

  // Part II: Claim of Tax Treaty Benefits
  claimTreatyBenefits: boolean;
  treatyCountry?: string;
  treatyArticle?: string;
  treatyRate?: number;
  treatyConditions?: string;
}

// Tax Form Record (from database)
export interface TaxForm {
  id: string;
  user_id: string;
  form_type: TaxFormType;
  form_data: W9FormData | W8BENFormData;
  signature_name: string;
  signature_date: string;
  electronic_signature_consent: boolean;
  status: TaxFormStatus;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  ip_address?: string;
  user_agent?: string;
  version: number;
  replaced_by?: string;
}

// Tax form with user profile data (for admin views)
export interface TaxFormWithUser extends TaxForm {
  user?: {
    id: string;
    username: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  verifier?: {
    id: string;
    username: string;
  };
}

// Tax status check result (from check_tax_form_required function)
export interface TaxFormRequirement {
  required: boolean;
  form_type: TaxFormType | null;
  reason: TaxFormRequirementReason;
  existing_form_id?: string;
  existing_form_status?: TaxFormStatus;
  cumulative_payouts?: number;
  threshold?: number;
}

export type TaxFormRequirementReason =
  | 'not_required'
  | 'under_threshold'
  | 'threshold_reached'
  | 'non_us_no_form'
  | 'form_expired'
  | 'wrong_form_type'
  | 'no_tax_country';

// Wizard step types
export type TaxFormWizardStep = 'country' | 'form' | 'review' | 'signature' | 'complete';

// Form submission payload
export interface TaxFormSubmission {
  form_type: TaxFormType;
  form_data: W9FormData | W8BENFormData;
  signature_name: string;
  electronic_signature_consent: boolean;
}

// Admin verification payload
export interface TaxFormVerification {
  tax_form_id: string;
  action: 'verify' | 'reject';
  rejection_reason?: string;
}

// US States for W-9 form
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const;

// Countries with US tax treaties (common ones)
export const TAX_TREATY_COUNTRIES = [
  { code: 'AU', name: 'Australia', servicesRate: 0 },
  { code: 'AT', name: 'Austria', servicesRate: 0 },
  { code: 'BE', name: 'Belgium', servicesRate: 0 },
  { code: 'CA', name: 'Canada', servicesRate: 0 },
  { code: 'DK', name: 'Denmark', servicesRate: 0 },
  { code: 'FI', name: 'Finland', servicesRate: 0 },
  { code: 'FR', name: 'France', servicesRate: 0 },
  { code: 'DE', name: 'Germany', servicesRate: 0 },
  { code: 'IE', name: 'Ireland', servicesRate: 0 },
  { code: 'IL', name: 'Israel', servicesRate: 0 },
  { code: 'IT', name: 'Italy', servicesRate: 0 },
  { code: 'JP', name: 'Japan', servicesRate: 0 },
  { code: 'KR', name: 'South Korea', servicesRate: 0 },
  { code: 'LU', name: 'Luxembourg', servicesRate: 0 },
  { code: 'MX', name: 'Mexico', servicesRate: 0 },
  { code: 'NL', name: 'Netherlands', servicesRate: 0 },
  { code: 'NZ', name: 'New Zealand', servicesRate: 0 },
  { code: 'NO', name: 'Norway', servicesRate: 0 },
  { code: 'PL', name: 'Poland', servicesRate: 0 },
  { code: 'PT', name: 'Portugal', servicesRate: 0 },
  { code: 'ES', name: 'Spain', servicesRate: 0 },
  { code: 'SE', name: 'Sweden', servicesRate: 0 },
  { code: 'CH', name: 'Switzerland', servicesRate: 0 },
  { code: 'GB', name: 'United Kingdom', servicesRate: 0 },
  { code: 'IN', name: 'India', servicesRate: 15 },
  { code: 'PH', name: 'Philippines', servicesRate: 15 },
  { code: 'TH', name: 'Thailand', servicesRate: 15 },
  { code: 'VN', name: 'Vietnam', servicesRate: 15 },
  { code: 'CN', name: 'China', servicesRate: 10 },
  { code: 'RU', name: 'Russia', servicesRate: 0 },
] as const;

// All countries (common list)
export const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MO', name: 'Macau' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
] as const;

// Federal tax classification options
export const FEDERAL_TAX_CLASSIFICATIONS = [
  { value: 'individual', label: 'Individual/sole proprietor or single-member LLC' },
  { value: 'c_corporation', label: 'C Corporation' },
  { value: 's_corporation', label: 'S Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust_estate', label: 'Trust/estate' },
  { value: 'llc', label: 'Limited liability company' },
  { value: 'other', label: 'Other' },
] as const;

// LLC tax classification options
export const LLC_TAX_CLASSIFICATIONS = [
  { value: 'c', label: 'C corporation' },
  { value: 's', label: 'S corporation' },
  { value: 'p', label: 'Partnership' },
] as const;

// W-9 threshold constant
export const W9_THRESHOLD = 600;

// Default withholding rate for non-treaty countries
export const DEFAULT_WITHHOLDING_RATE = 30;

// Helper function to check if a country has a tax treaty
export function hasTaxTreaty(countryCode: string): boolean {
  return TAX_TREATY_COUNTRIES.some((c) => c.code === countryCode.toUpperCase());
}

// Helper function to get treaty rate for a country
export function getTreatyRate(countryCode: string): number {
  const treaty = TAX_TREATY_COUNTRIES.find((c) => c.code === countryCode.toUpperCase());
  return treaty?.servicesRate ?? DEFAULT_WITHHOLDING_RATE;
}

// Helper function to format TIN for display (masked)
export function formatTINForDisplay(tin: string, tinType: TINType): string {
  if (!tin) return '';
  const digits = tin.replace(/\D/g, '');

  if (tinType === 'ssn') {
    // Show as XXX-XX-1234
    if (digits.length >= 4) {
      return `XXX-XX-${digits.slice(-4)}`;
    }
  } else {
    // EIN: Show as XX-XXX1234
    if (digits.length >= 4) {
      return `XX-XXX${digits.slice(-4)}`;
    }
  }

  return 'XXX-XX-XXXX';
}

// Helper function to validate SSN format
export function validateSSN(ssn: string): boolean {
  const digits = ssn.replace(/\D/g, '');
  return digits.length === 9;
}

// Helper function to validate EIN format
export function validateEIN(ein: string): boolean {
  const digits = ein.replace(/\D/g, '');
  return digits.length === 9;
}

// Helper function to format SSN input
export function formatSSNInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

// Helper function to format EIN input
export function formatEINInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

// Helper function to check if tax form is expiring soon (within 30 days)
export function isExpiringSoon(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return expiry <= thirtyDaysFromNow && expiry > new Date();
}

// Helper function to get days until expiry
export function getDaysUntilExpiry(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
