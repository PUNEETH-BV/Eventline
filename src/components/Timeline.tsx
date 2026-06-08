'use client';

import React from 'react';
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

export default function Timeline({
  events,
  onEventClick,
  onDigDeeper,
  diggingDeeper,
  isBookmarked,
  onToggleBookmark,
}: TimelineProps) {
  const closestUpcomingIndex = events.findIndex(
    (e) => e.status === 'present' || e.status === 'future'
  );

  return (
    <div className="max-w-[700px] mx-auto px-4 py-8 relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gray-700 via-blue-500/50 to-purple-500/50" />

      {events.map((event, index) => {
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
