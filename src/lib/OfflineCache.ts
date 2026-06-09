import { TimelineEvent } from '@/types';

export interface CachedTimeline {
  events: TimelineEvent[];
  timestamp: number;
}

export const getCachedQuery = (query: string): CachedTimeline | null => {
  if (typeof window === 'undefined') return null;
  const key = `eventline_cache_${query.toLowerCase().trim()}`;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.error('Failed to retrieve cache', err);
    return null;
  }
};

export const setCachedQuery = (query: string, events: TimelineEvent[]): void => {
  if (typeof window === 'undefined') return;
  const key = `eventline_cache_${query.toLowerCase().trim()}`;
  try {
    const data: CachedTimeline = {
      events,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
    
    // Save to list of cached queries
    const listKey = 'eventline_cached_queries';
    const listStr = localStorage.getItem(listKey) || '[]';
    const list: string[] = JSON.parse(listStr);
    const cleanedQuery = query.trim();
    if (!list.includes(cleanedQuery)) {
      list.push(cleanedQuery);
      localStorage.setItem(listKey, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Failed to set cache', err);
  }
};

export const getCachedQueriesList = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const listStr = localStorage.getItem('eventline_cached_queries') || '[]';
    return JSON.parse(listStr);
  } catch {
    return [];
  }
};
