'use client';

import React from 'react';
import { TimelineEvent } from '@/types';

interface EventDetailPanelProps {
  event: TimelineEvent;
  isActive: boolean;
  onBack: () => void;
  onDigDeeper: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (event: TimelineEvent) => void;
}

function StatusBadge({ status }: { status: TimelineEvent['status'] }) {
  if (status === 'past') {
    return (
      <span className="bg-gray-700/50 text-gray-400 text-xs px-2.5 py-1 rounded-full uppercase tracking-wide">
        Past
      </span>
    );
  }
  if (status === 'present') {
    return (
      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full uppercase tracking-wide inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Today
      </span>
    );
  }
  return (
    <span className="bg-blue-500/20 text-blue-400 text-xs px-2.5 py-1 rounded-full uppercase tracking-wide">
      Upcoming
    </span>
  );
}

export default function EventDetailPanel({
  event,
  isActive,
  onBack,
  onDigDeeper,
  isBookmarked,
  onToggleBookmark,
}: EventDetailPanelProps) {
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={`
        fixed z-50
        inset-x-0 bottom-0 h-[90vh] rounded-t-3xl border-t
        md:inset-y-0 md:right-0 md:left-auto md:w-full md:max-w-lg md:h-auto md:rounded-t-none md:border-t-0 md:border-l
        bg-[#111] border-[#2a2a2a]
        transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${
          isActive
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full'
        }
      `}
    >
      <div className="overflow-y-auto h-full p-6">
        {/* Back button */}
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors mb-4 flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          <span className="text-sm">Back</span>
        </button>

        {/* Status badge */}
        <StatusBadge status={event.status} />

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mt-4">{event.title}</h2>

        {/* Date */}
        <p className="text-gray-400 mt-2">{formattedDate}</p>

        {/* Category badge */}
        <span className="inline-block bg-[#252525] text-gray-400 text-xs px-3 py-1 rounded-full uppercase mt-3">
          {event.category}
        </span>

        {/* Description */}
        <div className="mt-6">
          <p className="text-gray-300 leading-relaxed">{event.description}</p>
        </div>

        {/* AI insights placeholder */}
        <div className="mt-6 p-4 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
          <p className="text-gray-500 text-sm italic">
            AI-generated insights about this event will appear here based on the
            latest information available.
          </p>
        </div>

        {/* Bookmark button */}
        <button
          onClick={() => onToggleBookmark(event)}
          className={`
            w-full mt-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
            ${
              isBookmarked
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-[#1a1a1a] text-gray-300 border border-[#2a2a2a] hover:border-blue-500/30'
            }
          `}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-5 h-5 ${isBookmarked ? 'fill-blue-500' : 'fill-none'}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
            />
          </svg>
          {isBookmarked ? 'Bookmarked' : 'Bookmark this event'}
        </button>

        {/* Dig Deeper button */}
        <button
          onClick={onDigDeeper}
          className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 cursor-pointer"
        >
          Dig Deeper 🔍
        </button>
      </div>
    </div>
  );
}
