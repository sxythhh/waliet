export type ApplicationQuestionType = 'text' | 'dropdown' | 'video' | 'image';

export interface ApplicationQuestion {
  id: string;
  type: ApplicationQuestionType;
  label: string;
  required: boolean;
  options?: string[]; // For dropdown type
  placeholder?: string;
}

export interface ApplicationAnswer {
  questionId: string;
  value: string | string[]; // string for text/video/image, string[] for multi-select dropdown
  fileUrl?: string; // For uploaded video/image
}

// Helper to check if legacy format (string[])
export function isLegacyQuestionFormat(questions: unknown): questions is string[] {
  return Array.isArray(questions) && questions.every(q => typeof q === 'string');
}

// Convert legacy format to new format
export function convertLegacyQuestions(questions: string[]): ApplicationQuestion[] {
  return questions.map((q, idx) => ({
    id: `legacy-${idx}`,
    type: 'text' as const,
    label: q,
    required: true,
  }));
}

// Parse questions from JSON, handling both formats
export function parseApplicationQuestions(questions: unknown): ApplicationQuestion[] {
  if (!questions) return [];
  
  if (isLegacyQuestionFormat(questions)) {
    return convertLegacyQuestions(questions);
  }
  
  if (Array.isArray(questions)) {
    return questions as ApplicationQuestion[];
  }
  
  return [];
}
