'use client';

import React, { useState } from 'react';
import { TimelineEvent } from '@/types';
import EventCard from './EventCard';

interface TimelineProps {
  events: TimelineEvent[];
  onEventClick: (event: TimelineEvent) => void;
  onDigDeeper: () => void;
  diggingDeeper: boolean;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (event: TimelineEvent) => void;
}

type FilterType = 'all' | 'past' | 'upcoming' | 'deadline' | 'exam' | 'sports' | 'tech';

export default function Timeline({
  events,
  onEventClick,
  onDigDeeper,
  diggingDeeper,
  isBookmarked,
  onToggleBookmark,
}: TimelineProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Filter events client-side
  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'past') return e.status === 'past';
    if (activeFilter === 'upcoming') return e.status === 'future' || e.status === 'present';
    if (activeFilter === 'deadline') return e.category === 'deadline';
    if (activeFilter === 'exam') return e.category === 'exam';
    
    // Sports category filtering via event description/title keywords
    if (activeFilter === 'sports') {
      const text = (e.title + ' ' + e.description).toLowerCase();
      const sportsKeywords = [
        'ipl', 'cup', 'match', 'league', 'sports', 'world cup', 'tournament', 
        'olympics', 'cricket', 'football', 'fifa', 'nba', 'super bowl', 'stadium', 
        'race', 'player', 'championship', 'formula 1'
      ];
      return e.category === 'event' && sportsKeywords.some(k => text.includes(k));
    }
    
    // Tech category filtering via event description/title keywords
    if (activeFilter === 'tech') {
      const text = (e.title + ' ' + e.description).toLowerCase();
      const techKeywords = [
        'google', 'apple', 'i/o', 'wwdc', 'tech', 'launch', 'release', 'developer', 
        'microsoft', 'meta', 'tesla', 'nvidia', 'openai', 'chatgpt', 'software', 
        'silicon', 'hardware', 'semiconductor', 'ai', 'conference'
      ];
      return e.category === 'event' && techKeywords.some(k => text.includes(k));
    }
    
    return true;
  });

  const closestUpcomingIndex = filteredEvents.findIndex(
    (e) => e.status === 'present' || e.status === 'future'
  );

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'past', label: 'Past' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'deadline', label: 'Deadlines' },
    { value: 'exam', label: 'Exams' },
    { value: 'sports', label: 'Sports' },
    { value: 'tech', label: 'Tech' },
  ];

  return (
    <div className="max-w-[700px] mx-auto px-4 py-8 relative">
      {/* Client-side filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none justify-start md:justify-center border-b border-[#1f1f1f] sticky top-[57px] bg-[#0a0a0a]/95 backdrop-blur-md z-30 pt-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`
                px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 whitespace-nowrap cursor-pointer
                ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10 shadow-sm shadow-blue-500/10'
                    : 'border-[#2a2a2a] bg-[#111] text-gray-400 hover:text-white hover:border-[#3a3a3a]'
                }
              `}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm">No events found matching this filter.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gray-700 via-blue-500/50 to-purple-500/50" />

          {filteredEvents.map((event, index) => {
            const isEven = index % 2 === 0;

            return (
              <div key={event.id} className="relative mb-8">
                {/* Timeline dot */}
                <div
                  className={`
                    absolute left-[24px] md:left-1/2 transform md:-translate-x-1/2 w-3 h-3 rounded-full border-2 z-10 top-6
                    ${
                      event.status === 'past'
                        ? 'border-gray-600 bg-gray-700'
                        : event.status === 'present'
                        ? 'border-emerald-400 bg-emerald-400 shadow-lg shadow-emerald-400/50'
                        : 'border-blue-500 bg-blue-500 shadow-lg shadow-blue-500/50'
                    }
                  `}
                />

                {/* Event card */}
                <div
                  className={`
                    ml-14 md:ml-0
                    ${
                      isEven
                        ? 'md:w-[calc(50%-32px)] md:mr-auto'
                        : 'md:w-[calc(50%-32px)] md:ml-auto'
                    }
                  `}
                >
                  <EventCard
                    event={event}
                    index={index}
                    isClosestUpcoming={index === closestUpcomingIndex}
                    isBookmarked={isBookmarked(event.id)}
                    onToggleBookmark={onToggleBookmark}
                    onClick={onEventClick}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dig Deeper button */}
      <button
        onClick={onDigDeeper}
        disabled={diggingDeeper}
        className="mx-auto block mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-8 py-3 rounded-full transition-all duration-200 disabled:opacity-60 cursor-pointer"
      >
        {diggingDeeper ? (
          <span className="flex items-center gap-2">
            <svg
              className="w-5 h-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Digging...
          </span>
        ) : (
          'Dig Deeper 🔍'
        )}
      </button>
    </div>
  );
}
