'use client';

import React from 'react';
import { TimelineEvent } from '@/types';

interface SavedEventsProps {
  bookmarks: TimelineEvent[];
  onRemoveBookmark: (id: string) => void;
  onClearAll: () => void;
  onEventClick: (event: TimelineEvent) => void;
}

export default function SavedEvents({
  bookmarks,
  onRemoveBookmark,
  onClearAll,
  onEventClick,
}: SavedEventsProps) {
  return (
    <div className="max-w-[700px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Saved Events</h2>
        {bookmarks.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Empty state */}
      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="w-16 h-16 text-gray-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
            />
          </svg>
          <p className="text-gray-400 mt-4 text-lg">No saved events yet</p>
          <p className="text-gray-500 text-sm mt-2 text-center">
            Bookmark events from the timeline to see them here
          </p>
        </div>
      ) : (
        /* Bookmarks list */
        <div className="space-y-3">
          {bookmarks.map((event) => {
            const formattedDate = new Date(event.date).toLocaleDateString(
              'en-US',
              { month: 'short', day: 'numeric', year: 'numeric' }
            );

            return (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className="relative bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] cursor-pointer hover:border-[#3a3a3a] transition-all duration-200"
              >
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBookmark(event.id);
                  }}
                  className="absolute top-3 right-3 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                <h3 className="text-white font-medium pr-8">{event.title}</h3>
                <p className="text-gray-400 text-sm mt-1">{formattedDate}</p>
                <p className="text-gray-500 text-sm mt-1 line-clamp-1">
                  {event.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
