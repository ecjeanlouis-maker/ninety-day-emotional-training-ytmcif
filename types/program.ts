
export interface Technique {
  id: number;
  title: string;
  description: string;
  practiceSteps: string[];
  goal: string;
  icon: string;
  category: 'emotional' | 'confidence' | 'anger' | 'stress' | 'social-anxiety' | 'thoughts' | 'organization' | 'communication';
  practiceFrequency: string;
  week: number;
}

export interface DayProgress {
  day: number;
  completed: boolean;
  date: string;
  notes?: string;
}

export type ProgramType = 'emotional' | 'confidence' | 'anger' | 'stress' | 'social-anxiety' | 'thoughts' | 'organization' | 'communication' | null;
