'use client';

import { useState, useCallback, useRef } from 'react';
import { ActiveLayer, TimelineEvent } from '@/types';

export function useLayerNavigation() {
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>(0);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const scrollPositionRef = useRef(0);

  const openDetail = useCallback((event: TimelineEvent) => {
    // Save scroll position before transitioning
    const scrollContainer = document.querySelector('[data-timeline-scroll]');
    if (scrollContainer) {
      scrollPositionRef.current = scrollContainer.scrollTop;
    } else {
      scrollPositionRef.current = window.scrollY;
    }
    setSelectedEvent(event);
    setActiveLayer(1);
  }, []);

  const openChat = useCallback(() => {
    setActiveLayer(2);
  }, []);

  const goBack = useCallback(() => {
    setActiveLayer(prev => {
      const next = Math.max(0, prev - 1) as ActiveLayer;
      if (next === 0) {
        // Restore scroll position when returning to timeline
        requestAnimationFrame(() => {
          const scrollContainer = document.querySelector('[data-timeline-scroll]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollPositionRef.current;
          } else {
            window.scrollTo(0, scrollPositionRef.current);
          }
        });
      }
      return next;
    });
  }, []);

  return {
    activeLayer,
    selectedEvent,
    openDetail,
    openChat,
    goBack,
  };
}
