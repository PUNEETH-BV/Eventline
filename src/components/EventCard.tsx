'use client';

import React from 'react';
import { TimelineEvent } from '@/types';

interface EventCardProps {
  event: TimelineEvent;
  index: number;
  isClosestUpcoming: boolean;
  isBookmarked: boolean;
  onToggleBookmark: (event: TimelineEvent) => void;
  onClick: (event: TimelineEvent) => void;
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

export default function EventCard({
  event,
  index,
  isClosestUpcoming,
  isBookmarked,
  onToggleBookmark,
  onClick,
}: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: event.title,
      text: `${event.title} — ${formattedDate}`,
      url: event.sourceUrl || window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(
        event.sourceUrl || window.location.href
      );
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleBookmark(event);
  };

  return (
    <div
      onClick={() => onClick(event)}
      className={`
        bg-[#1a1a1a] rounded-2xl p-5 border cursor-pointer
        animate-fadeSlideUp
        hover:border-[#3a3a3a] transition-all duration-300
        ${
          isClosestUpcoming
            ? 'border-blue-500/50 shadow-lg shadow-blue-500/20 animate-glowPulse'
            : 'border-[#2a2a2a]'
        }
        ${event.status === 'past' ? 'border-[#222]' : ''}
      `}
      style={{
        animationDelay: `${index * 80}ms`,
        ...(event.status === 'past' ? { filter: 'brightness(0.6)' } : {}),
      }}
    >
      {/* Top row: status + category */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={event.status} />
        <span className="bg-[#252525] text-gray-500 text-xs px-2 py-0.5 rounded-full uppercase">
          {event.category}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-lg mt-3">{event.title}</h3>

      {/* Date */}
      <p className="text-gray-400 text-sm mt-1">{formattedDate}</p>

      {/* Description */}
      <p className="text-gray-400 text-sm mt-2 line-clamp-2">
        {event.description}
      </p>

      {/* Bottom row: bookmark + share */}
      <div className="flex justify-end gap-3 mt-3">
        <button
          onClick={handleBookmark}
          className="transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-5 h-5 ${
              isBookmarked
                ? 'fill-blue-500 text-blue-500'
                : 'fill-none text-gray-500 hover:text-blue-400'
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
            />
          </svg>
        </button>
        <button
          onClick={handleShare}
          className="text-gray-500 hover:text-white transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
