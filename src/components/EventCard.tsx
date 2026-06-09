'use client';

import React, { useState, useEffect } from 'react';
import { TimelineEvent } from '@/types';

interface EventCardProps {
  event: TimelineEvent;
  index: number;
  isClosestUpcoming: boolean;
  isBookmarked: boolean;
  onToggleBookmark: (event: TimelineEvent) => void;
  onClick: (event: TimelineEvent) => void;
  onEdit?: (event: TimelineEvent) => void;
}

function StatusBadge({ event }: { event: TimelineEvent }) {
  if (event.isPersonal) {
    return (
      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full uppercase tracking-wide inline-flex items-center gap-1 font-semibold">
        Personal
      </span>
    );
  }

  if (event.status === 'past') {
    return (
      <span className="bg-gray-700/50 text-gray-400 text-xs px-2.5 py-1 rounded-full uppercase tracking-wide">
        Past
      </span>
    );
  }
  if (event.status === 'present') {
    return (
      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full uppercase tracking-wide inline-flex items-center gap-1.5 font-semibold">
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
  onEdit,
}: EventCardProps) {
  const [countdownText, setCountdownText] = useState('');

  // Date formatting: "May 4, 2026 • Sunday"
  const dateObj = new Date(event.date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const mdYear = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const formattedDate = `${mdYear} • ${dayName}`;

  // Live ticking countdown for upcoming events
  useEffect(() => {
    if (event.status === 'past' || event.status === 'present') {
      setCountdownText('');
      return;
    }

    const updateCountdown = () => {
      const target = new Date(event.date);
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdownText('Event is occurring today!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownText(`${days} days  ${hours} hrs  ${minutes} mins  ${seconds} secs remaining`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [event.date, event.status]);

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
          event.isPersonal
            ? 'border-amber-500/40 hover:border-amber-500 shadow-md shadow-amber-500/5'
            : isClosestUpcoming
            ? 'border-blue-500/50 shadow-lg shadow-blue-500/20 animate-glowPulse'
            : 'border-[#2a2a2a]'
        }
      `}
      style={{
        animationDelay: `${index * 80}ms`,
        ...(event.status === 'past' && !event.isPersonal ? { opacity: 0.5 } : {}),
      }}
    >
      {/* Top row: status + category */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge event={event} />
          <span className="bg-[#252525] text-gray-500 text-xs px-2 py-0.5 rounded-full uppercase">
            {event.category}
          </span>
        </div>
        
        {/* Source Badges */}
        {!event.isPersonal && event.source && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            event.confidence === 'high' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {event.confidence === 'high' ? '✓ Official Source' : '~ News - verify'}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-lg mt-3">{event.title}</h3>

      {/* Date */}
      <p className="text-gray-400 text-sm mt-1">{formattedDate}</p>

      {/* Live ticking countdown banner */}
      {countdownText && (
        <div className="mt-2 text-xs font-semibold text-blue-400 bg-blue-500/5 py-1 px-2.5 rounded-lg border border-blue-500/10 inline-block">
          ⏳ {countdownText}
        </div>
      )}

      {/* Description */}
      <p className="text-gray-400 text-sm mt-2 line-clamp-2">
        {event.description}
      </p>

      {/* Bottom row: action buttons */}
      <div className="flex justify-end gap-3 mt-3">
        {/* Edit personal milestone button */}
        {event.isPersonal && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(event);
            }}
            className="text-amber-500 hover:text-amber-400 p-1 rounded transition-all cursor-pointer"
            title="Edit Milestone"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 20.062a4.5 4.5 0 0 1-1.697 1.096l-3.3 1.185a.75.75 0 0 1-.95-.95l1.185-3.3a4.5 4.5 0 0 1 1.096-1.697L16.863 4.487Zm0 0L19.5 7.125" />
            </svg>
          </button>
        )}

        <button
          onClick={handleBookmark}
          className="transition-colors duration-200 cursor-pointer"
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
          className="text-gray-500 hover:text-white transition-colors duration-200 cursor-pointer"
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
