export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  status: 'past' | 'present' | 'future';
  category: 'exam' | 'deadline' | 'result' | 'announcement' | 'sports' | 'tech' | 'general';
  bookmarked?: boolean;
  sourceUrl?: string;
  source?: string;
  confidence?: 'high' | 'medium' | 'low';
  isPersonal?: boolean;
}

export interface UserProfile {
  type: 'student' | 'professional' | 'curious' | '';
  interests: ('exams' | 'tech' | 'sports' | 'politics')[];
}

export type ActiveLayer = 0 | 1 | 2;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ActiveTab = 'home' | 'search' | 'saved';
