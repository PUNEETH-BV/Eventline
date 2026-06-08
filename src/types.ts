export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  status: 'past' | 'present' | 'future';
  category: 'exam' | 'deadline' | 'result' | 'announcement' | 'event';
  bookmarked?: boolean;
  sourceUrl?: string;
}

export type ActiveLayer = 0 | 1 | 2;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ActiveTab = 'home' | 'search' | 'saved';
