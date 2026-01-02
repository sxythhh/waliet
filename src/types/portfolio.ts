// Creator Portfolio Types

export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  description: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  highlights: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface FeaturedVideo {
  id: string;
  submissionId?: string;
  externalUrl?: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  views?: number;
  platform?: string;
}

export interface ShowcaseItem {
  id: string;
  type: 'image' | 'link' | 'document';
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface PlatformInfo {
  platform: string;
  handle: string;
  url: string;
  followers?: number;
  verified?: boolean;
}

export interface CustomSection {
  id: string;
  title: string;
  type: 'text' | 'list' | 'gallery' | 'links';
  content: string | string[];
  order: number;
}

export interface RateRange {
  min: number;
  max: number;
  currency: string;
  type: 'hourly' | 'project' | 'monthly';
}

export interface CreatorPortfolio {
  id: string;
  user_id: string;
  work_experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  featured_videos: FeaturedVideo[];
  showcase_items: ShowcaseItem[];
  content_niches: string[];
  platforms: PlatformInfo[];
  equipment: string[];
  languages: string[];
  availability: string | null;
  rate_range: RateRange | null;
  custom_sections: CustomSection[];
  section_order: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Section types for the builder
export type PortfolioSectionType =
  | 'resume'
  | 'skills'
  | 'media'
  | 'platforms'
  | 'creator_info'
  | 'custom';

export interface PortfolioSectionDefinition {
  id: PortfolioSectionType;
  title: string;
  description: string;
  icon: string;
}

export const PORTFOLIO_SECTIONS: PortfolioSectionDefinition[] = [
  {
    id: 'resume',
    title: 'Experience & Education',
    description: 'Work history, education, and certifications',
    icon: 'Briefcase',
  },
  {
    id: 'skills',
    title: 'Skills',
    description: 'Your skills and expertise',
    icon: 'Wrench',
  },
  {
    id: 'media',
    title: 'Media Showcase',
    description: 'Featured videos and portfolio items',
    icon: 'Video',
  },
  {
    id: 'platforms',
    title: 'Social Platforms',
    description: 'Your social media presence',
    icon: 'Share2',
  },
  {
    id: 'creator_info',
    title: 'Creator Info',
    description: 'Niches, equipment, availability, and rates',
    icon: 'User',
  },
  {
    id: 'custom',
    title: 'Custom Section',
    description: 'Add your own section',
    icon: 'Plus',
  },
];

// Available platforms for selection
export const AVAILABLE_PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: 'tiktok' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram' },
  { id: 'twitter', name: 'X (Twitter)', icon: 'twitter' },
  { id: 'twitch', name: 'Twitch', icon: 'twitch' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin' },
  { id: 'facebook', name: 'Facebook', icon: 'facebook' },
  { id: 'snapchat', name: 'Snapchat', icon: 'snapchat' },
  { id: 'pinterest', name: 'Pinterest', icon: 'pinterest' },
  { id: 'threads', name: 'Threads', icon: 'threads' },
];

// Content niches for selection
export const CONTENT_NICHES = [
  'Gaming',
  'Beauty & Fashion',
  'Fitness & Health',
  'Food & Cooking',
  'Travel',
  'Tech & Reviews',
  'Lifestyle',
  'Comedy & Entertainment',
  'Music',
  'Education',
  'Business & Finance',
  'Sports',
  'Art & Design',
  'Photography',
  'Parenting & Family',
  'DIY & Crafts',
  'Automotive',
  'Pets & Animals',
  'Science',
  'News & Politics',
];

// Equipment options for selection
export const EQUIPMENT_OPTIONS = [
  'Professional Camera',
  'DSLR/Mirrorless',
  'Smartphone',
  'Ring Light',
  'Softbox Lighting',
  'LED Panels',
  'Lavalier Microphone',
  'Shotgun Microphone',
  'USB Microphone',
  'Green Screen',
  'Teleprompter',
  'Gimbal/Stabilizer',
  'Drone',
  'Editing Software (Adobe)',
  'Editing Software (Final Cut)',
  'Editing Software (DaVinci)',
  'Home Studio',
  'Professional Studio Access',
];

// Language options
export const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Chinese (Mandarin)',
  'Chinese (Cantonese)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Russian',
  'Dutch',
  'Polish',
  'Turkish',
  'Vietnamese',
  'Thai',
  'Indonesian',
  'Filipino',
];

// Availability options
export const AVAILABILITY_OPTIONS = [
  { id: 'full-time', label: 'Full-time' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'project-based', label: 'Project-based' },
  { id: 'not-available', label: 'Not available' },
];

// Currency options for rates
export const CURRENCY_OPTIONS = [
  { id: 'USD', symbol: '$', name: 'US Dollar' },
  { id: 'EUR', symbol: '\u20ac', name: 'Euro' },
  { id: 'GBP', symbol: '\u00a3', name: 'British Pound' },
  { id: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { id: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

// Rate type options
export const RATE_TYPE_OPTIONS = [
  { id: 'hourly', label: 'Per hour' },
  { id: 'project', label: 'Per project' },
  { id: 'monthly', label: 'Per month' },
];
