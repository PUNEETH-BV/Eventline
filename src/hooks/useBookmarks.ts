'use client';

import { useState, useEffect, useCallback } from 'react';
import { TimelineEvent } from '@/types';

const STORAGE_KEY = 'eventline-bookmarks';

function getStoredBookmarks(): TimelineEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStoredBookmarks(events: TimelineEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // localStorage full or unavailable
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    setBookmarks(getStoredBookmarks());
  }, []);

  const addBookmark = useCallback((event: TimelineEvent) => {
    setBookmarks(prev => {
      if (prev.some(e => e.id === event.id)) return prev;
      const next = [...prev, { ...event, bookmarked: true }];
      setStoredBookmarks(next);
      return next;
    });
  }, []);

  const removeBookmark = useCallback((eventId: string) => {
    setBookmarks(prev => {
      const next = prev.filter(e => e.id !== eventId);
      setStoredBookmarks(next);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((event: TimelineEvent) => {
    setBookmarks(prev => {
      const exists = prev.some(e => e.id === event.id);
      const next = exists
        ? prev.filter(e => e.id !== event.id)
        : [...prev, { ...event, bookmarked: true }];
      setStoredBookmarks(next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback((eventId: string) => {
    return bookmarks.some(e => e.id === eventId);
  }, [bookmarks]);

  const clearAll = useCallback(() => {
    setBookmarks([]);
    setStoredBookmarks([]);
  }, []);

  return { bookmarks, addBookmark, removeBookmark, toggleBookmark, isBookmarked, clearAll };
}
