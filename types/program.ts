
export interface Technique {
  id: number;
  title: string;
  description: string;
  icon: string;
  category: 'emotional' | 'confidence';
  practiceFrequency: string;
  week: number;
}

export interface DayProgress {
  day: number;
  completed: boolean;
  date: string;
  notes?: string;
}

export type ProgramType = 'emotional' | 'confidence' | null;
