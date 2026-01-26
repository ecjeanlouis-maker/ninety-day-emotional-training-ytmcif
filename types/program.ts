
export interface Technique {
  id: number;
  title: string;
  description: string;
  practiceSteps: string[];
  goal: string;
  icon: string;
  category: 'emotional' | 'confidence' | 'anger' | 'stress' | 'social-anxiety' | 'thoughts';
  practiceFrequency: string;
  week: number;
}

export interface DayProgress {
  day: number;
  completed: boolean;
  date: string;
  notes?: string;
}

export type ProgramType = 'emotional' | 'confidence' | 'anger' | 'stress' | 'social-anxiety' | 'thoughts' | null;
