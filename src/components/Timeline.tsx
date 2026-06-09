'use client';

import React, { useState, useEffect } from 'react';
import { TimelineEvent } from '@/types';
import EventCard from './EventCard';

interface TimelineProps {
  events: TimelineEvent[];
  onEventClick: (event: TimelineEvent) => void;
  onDigDeeper: () => void;
  diggingDeeper: boolean;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (event: TimelineEvent) => void;
  onEditEvent?: (event: TimelineEvent) => void;
}

type FilterType = 'all' | 'past' | 'upcoming' | 'deadline' | 'exam' | 'sports' | 'tech';

function SectionDivider({ id, label, colorClass }: { id?: string; label: string; colorClass: string }) {
  return (
    <div id={id} className="relative my-8 flex items-center justify-center z-10 w-full">
      <span className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#0a0a0a] border border-[#1f1f1f] ${colorClass}`}>
        ── {label} ──
      </span>
    </div>
  );
}

export default function Timeline({
  events,
  onEventClick,
  onDigDeeper,
  diggingDeeper,
  isBookmarked,
  onToggleBookmark,
  onEditEvent,
}: TimelineProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const getEventSection = (event: TimelineEvent) => {
    if (event.isPersonal) {
      const date = new Date(event.date);
      const now = new Date();
      if (date < now) return 'past';
      return 'upcoming';
    }

    if (event.status === 'past') return 'past';
    if (event.status === 'present') return 'present';

    const date = new Date(event.date);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 60) {
      return 'upcoming';
    }
    return 'future';
  };

  // Filter events client-side
  const filteredEvents = events.filter((e) => {
    const sec = getEventSection(e);
    if (activeFilter === 'all') return true;
    if (activeFilter === 'past') return sec === 'past';
    if (activeFilter === 'upcoming') return sec === 'upcoming' || sec === 'present';
    if (activeFilter === 'deadline') return e.category === 'deadline';
    if (activeFilter === 'exam') return e.category === 'exam' || e.category === 'result';
    
    if (activeFilter === 'sports') {
      return e.category === 'sports' || (e.title + ' ' + e.description).toLowerCase().includes('ipl') || (e.title + ' ' + e.description).toLowerCase().includes('cup');
    }
    if (activeFilter === 'tech') {
      return e.category === 'tech' || (e.title + ' ' + e.description).toLowerCase().includes('launch') || (e.title + ' ' + e.description).toLowerCase().includes('tech');
    }
    return true;
  });

  // Highlight closest upcoming event
  const closestUpcomingIndex = filteredEvents.findIndex(
    (e) => getEventSection(e) === 'present' || getEventSection(e) === 'upcoming'
  );

  // Group events
  const pastEvents = filteredEvents.filter((e) => getEventSection(e) === 'past');
  const presentEvents = filteredEvents.filter((e) => getEventSection(e) === 'present');
  const upcomingEvents = filteredEvents.filter((e) => getEventSection(e) === 'upcoming');
  const futureEvents = filteredEvents.filter((e) => getEventSection(e) === 'future');

  // Auto-scroll to PRESENT or UPCOMING on load
  useEffect(() => {
    if (events.length > 0) {
      const target = document.getElementById('timeline-present-section') || document.getElementById('timeline-upcoming-section');
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
      }
    }
  }, [events]);

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'past', label: 'Past' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'deadline', label: 'Deadlines' },
    { value: 'exam', label: 'Exams' },
    { value: 'sports', label: 'Sports' },
    { value: 'tech', label: 'Tech' },
  ];

  // Helper to render event list with alternate left/right alignments
  const renderEventList = (list: TimelineEvent[], startIndex: number) => {
    return list.map((event, idx) => {
      const globalIdx = startIndex + idx;
      const isEven = globalIdx % 2 === 0;

      return (
        <div key={event.id} className="relative mb-8 w-full">
          {/* Glowing dot on timeline */}
          <div
            className={`
              absolute left-[28px] md:left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full border-2 z-10 top-6
              ${
                event.isPersonal
                  ? 'border-amber-400 bg-amber-400 shadow-md shadow-amber-400/50'
                  : event.status === 'past'
                  ? 'border-gray-600 bg-gray-700'
                  : event.status === 'present'
                  ? 'border-emerald-400 bg-emerald-400 shadow-lg shadow-emerald-400/50'
                  : 'border-blue-500 bg-blue-500 shadow-lg shadow-blue-500/50'
              }
            `}
          />

          {/* Event card alignment */}
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
              index={globalIdx}
              isClosestUpcoming={globalIdx === closestUpcomingIndex}
              isBookmarked={isBookmarked(event.id)}
              onToggleBookmark={onToggleBookmark}
              onClick={onEventClick}
              onEdit={onEditEvent}
            />
          </div>
        </div>
      );
    });
  };

  return (
    <div className="max-w-[700px] mx-auto px-4 py-8 relative">
      {/* Filter bar */}
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
        <div className="relative flex flex-col items-center">
          {/* Vertical timeline line */}
          <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gray-700 via-blue-500/50 to-purple-500/50" />

          {/* Past Events Section */}
          {pastEvents.length > 0 && (
            <>
              <SectionDivider id="timeline-past-section" label="Past Events" colorClass="text-gray-500" />
              {renderEventList(pastEvents, 0)}
            </>
          )}

          {/* Present Events Section */}
          {presentEvents.length > 0 && (
            <>
              <SectionDivider id="timeline-present-section" label="Present" colorClass="text-emerald-400 border-emerald-500/20" />
              {renderEventList(presentEvents, pastEvents.length)}
            </>
          )}

          {/* Upcoming Events Section */}
          {upcomingEvents.length > 0 && (
            <>
              <SectionDivider id="timeline-upcoming-section" label="Upcoming" colorClass="text-blue-400 border-blue-500/20" />
              {renderEventList(upcomingEvents, pastEvents.length + presentEvents.length)}
            </>
          )}

          {/* Future Events Section */}
          {futureEvents.length > 0 && (
            <>
              <SectionDivider id="timeline-future-section" label="Future" colorClass="text-purple-400 border-purple-500/20" />
              {renderEventList(futureEvents, pastEvents.length + presentEvents.length + upcomingEvents.length)}
            </>
          )}
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
          'Load More Events 🔍'
        )}
      </button>
    </div>
  );
}
