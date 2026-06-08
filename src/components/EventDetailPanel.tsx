'use client';

import React, { useEffect, useState } from 'react';
import { TimelineEvent } from '@/types';

interface EventDetailPanelProps {
  event: TimelineEvent;
  isActive: boolean;
  onBack: () => void;
  onDigDeeper: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (event: TimelineEvent) => void;
}

// Global client-side cache to survive detail panel unmounting
const insightsCache: Record<string, string[]> = {};

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
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Fetch AI insights
  useEffect(() => {
    if (!event) return;

    // Check local cache first
    if (insightsCache[event.id]) {
      setInsights(insightsCache[event.id]);
      setLoadingInsights(false);
      return;
    }

    let active = true;
    async function fetchInsights() {
      setLoadingInsights(true);
      setInsights([]);
      try {
        const res = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: event.title, date: event.date }),
        });
        if (res.ok) {
          const data = await res.json();
          if (active && data.insights) {
            insightsCache[event.id] = data.insights;
            setInsights(data.insights);
          }
        }
      } catch (err) {
        console.error('Failed to fetch insights:', err);
      } finally {
        if (active) {
          setLoadingInsights(false);
        }
      }
    }

    fetchInsights();

    return () => {
      active = false;
    };
  }, [event]);

  // Helper to generate Google Calendar URL
  const getGoogleCalendarUrl = (ev: TimelineEvent) => {
    const startDateStr = ev.date.replace(/-/g, '');
    const startDate = new Date(ev.date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');

    const title = encodeURIComponent(ev.title);
    const details = encodeURIComponent(ev.description);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}`;
  };

  // Helper to generate and download ICS file
  const downloadIcsFile = (ev: TimelineEvent) => {
    const startDateStr = ev.date.replace(/-/g, '');
    const startDate = new Date(ev.date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');

    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `eventline-${ev.id}@eventline.app`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventLine//Calendar Event//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowStr}`,
      `DTSTART;VALUE=DATE:${startDateStr}`,
      `DTEND;VALUE=DATE:${endDateStr}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${ev.title.replace(/[^a-z0-9]/gi, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
          className="text-gray-400 hover:text-white transition-colors mb-4 flex items-center gap-2 cursor-pointer"
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

        {/* AI insights panel */}
        <div className="mt-6 p-4 bg-[#161616] rounded-xl border border-[#2a2a2a]">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <span className="text-blue-400">✨</span> AI Insights
          </h4>
          
          {loadingInsights && (
            <div className="space-y-3 py-2">
              <div className="h-4 w-full bg-[#2a2a2a] rounded animate-shimmer" />
              <div className="h-4 w-5/6 bg-[#2a2a2a] rounded animate-shimmer" />
              <div className="h-4 w-4/5 bg-[#2a2a2a] rounded animate-shimmer" />
            </div>
          )}

          {!loadingInsights && insights.length > 0 && (
            <ul className="space-y-3">
              {insights.map((insight, idx) => (
                <li key={idx} className="text-sm text-gray-300 flex items-start gap-2.5 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          )}

          {!loadingInsights && insights.length === 0 && (
            <p className="text-gray-500 text-sm italic">
              No additional insights available for this milestone.
            </p>
          )}
        </div>

        {/* Bookmark button */}
        <button
          onClick={() => onToggleBookmark(event)}
          className={`
            w-full mt-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer
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

        {/* Add to Device Calendar */}
        <div className="mt-6 border-t border-[#2a2a2a] pt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Add to Device Calendar</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Google Calendar Link */}
            <a
              href={getGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 hover:border-emerald-500/30 hover:text-white transition-all duration-200 text-sm font-medium"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.905 0-5.64-.5-8.157-1.418M18.683 7.582A11.954 11.954 0 0012 9c-2.612 0-5.087-.53-7.317-1.482" />
              </svg>
              Google Calendar
            </a>

            {/* Download ICS Button */}
            <button
              onClick={() => downloadIcsFile(event)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 hover:border-blue-500/30 hover:text-white transition-all duration-200 text-sm font-medium cursor-pointer"
            >
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              </svg>
              iCal / Outlook (.ics)
            </button>
          </div>
        </div>

        {/* Dig Deeper button */}
        <button
          onClick={onDigDeeper}
          className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-lg py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 cursor-pointer"
        >
          Dig Deeper 🔍
        </button>
      </div>
    </div>
  );
}
