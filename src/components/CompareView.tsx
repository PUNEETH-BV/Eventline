'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TimelineEvent, UserProfile } from '@/types';
import EventCard from './EventCard';

interface CompareViewProps {
  onEventClick: (event: TimelineEvent) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (event: TimelineEvent) => void;
  userProfile: UserProfile | null;
  onBack: () => void;
}

export default function CompareView({
  onEventClick,
  isBookmarked,
  onToggleBookmark,
  userProfile,
  onBack,
}: CompareViewProps) {
  // Left Search
  const [queryLeft, setQueryLeft] = useState('');
  const [searchedLeft, setSearchedLeft] = useState('');
  const [eventsLeft, setEventsLeft] = useState<TimelineEvent[]>([]);
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [errorLeft, setErrorLeft] = useState('');

  // Right Search
  const [queryRight, setQueryRight] = useState('');
  const [searchedRight, setSearchedRight] = useState('');
  const [eventsRight, setEventsRight] = useState<TimelineEvent[]>([]);
  const [loadingRight, setLoadingRight] = useState(false);
  const [errorRight, setErrorRight] = useState('');

  // SVG drawing state
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ id1: string; id2: string; x1: number; y1: number; x2: number; y2: number }[]>([]);

  // Relevance scoring for profile sorting
  const getEventRelevanceScore = useCallback((event: TimelineEvent, profile: UserProfile) => {
    let score = 0;
    if (profile.type === 'student') {
      if (event.category === 'exam' || event.category === 'deadline' || event.category === 'result') {
        score += 3;
      }
    } else if (profile.type === 'professional') {
      if (event.category === 'tech' || event.category === 'announcement' || event.category === 'deadline') {
        score += 2;
      }
    }

    profile.interests.forEach(interest => {
      if (interest === 'exams' && (event.category === 'exam' || event.category === 'deadline' || event.category === 'result')) {
        score += 5;
      }
      if (interest === 'tech' && event.category === 'tech') {
        score += 5;
      }
      if (interest === 'sports' && event.category === 'sports') {
        score += 5;
      }
      if (interest === 'politics' && event.category === 'general') {
        score += 4;
      }
    });

    return score;
  }, []);

  const sortEvents = useCallback((eventsList: TimelineEvent[]) => {
    if (!userProfile) {
      return [...eventsList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return [...eventsList].sort((a, b) => {
      const scoreA = getEventRelevanceScore(a, userProfile);
      const scoreB = getEventRelevanceScore(b, userProfile);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [userProfile, getEventRelevanceScore]);

  // Search logic for left column
  const handleSearchLeft = async () => {
    if (!queryLeft.trim()) return;
    setLoadingLeft(true);
    setErrorLeft('');
    setEventsLeft([]);
    setSearchedLeft(queryLeft);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryLeft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Search failed');
      
      if (data.events && data.events.length > 0) {
        setEventsLeft(sortEvents(data.events));
      } else {
        setErrorLeft('No events found.');
      }
    } catch {
      setErrorLeft('Something went wrong. Try again.');
    } finally {
      setLoadingLeft(false);
    }
  };

  // Search logic for right column
  const handleSearchRight = async () => {
    if (!queryRight.trim()) return;
    setLoadingRight(true);
    setErrorRight('');
    setEventsRight([]);
    setSearchedRight(queryRight);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryRight }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Search failed');
      
      if (data.events && data.events.length > 0) {
        setEventsRight(sortEvents(data.events));
      } else {
        setErrorRight('No events found.');
      }
    } catch {
      setErrorRight('Something went wrong. Try again.');
    } finally {
      setLoadingRight(false);
    }
  };

  // Identify matching events
  const findMatches = useCallback(() => {
    const list: { leftEvent: TimelineEvent; rightEvent: TimelineEvent }[] = [];
    eventsLeft.forEach(left => {
      eventsRight.forEach(right => {
        if (left.date === right.date) {
          list.push({ leftEvent: left, rightEvent: right });
        }
      });
    });
    return list;
  }, [eventsLeft, eventsRight]);

  const matches = findMatches();

  // Draw connecting SVG lines
  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: typeof lines = [];

    matches.forEach(match => {
      const dotLeft = document.getElementById(`compare-dot-left-${match.leftEvent.id}`);
      const dotRight = document.getElementById(`compare-dot-right-${match.rightEvent.id}`);

      if (dotLeft && dotRight) {
        const rectLeft = dotLeft.getBoundingClientRect();
        const rectRight = dotRight.getBoundingClientRect();

        newLines.push({
          id1: match.leftEvent.id,
          id2: match.rightEvent.id,
          x1: rectLeft.left + rectLeft.width / 2 - containerRect.left,
          y1: rectLeft.top + rectLeft.height / 2 - containerRect.top,
          x2: rectRight.left + rectRight.width / 2 - containerRect.left,
          y2: rectRight.top + rectRight.height / 2 - containerRect.top,
        });
      }
    });

    setLines(newLines);
  }, [matches]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateLines();
    }, 150);

    window.addEventListener('resize', updateLines);
    window.addEventListener('scroll', updateLines, true);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateLines);
      window.removeEventListener('scroll', updateLines, true);
    };
  }, [eventsLeft, eventsRight, updateLines]);

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a] text-white px-4 py-6" ref={containerRef}>
      {/* Top Header Controls */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-8 border-b border-[#1f1f1f] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              Compare Two Timelines <span className="gradient-text">⚡</span>
            </h1>
            <p className="text-xs text-gray-500">Overlay schedules and find intersection points.</p>
          </div>
        </div>

        {matches.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs md:text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span>Found {matches.length} intersecting dates!</span>
          </div>
        )}
      </div>

      {/* Inputs Section */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Left Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search first timeline... (e.g. NEET 2026)"
            value={queryLeft}
            onChange={e => setQueryLeft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchLeft()}
            className="w-full bg-[#161616] border border-[#2a2a2a] text-white text-sm px-5 py-3.5 rounded-xl pr-12 placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
          <button
            onClick={handleSearchLeft}
            disabled={loadingLeft}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loadingLeft ? (
              <svg className="w-4.5 h-4.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            )}
          </button>
        </div>

        {/* Right Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search second timeline... (e.g. JEE Mains 2026)"
            value={queryRight}
            onChange={e => setQueryRight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchRight()}
            className="w-full bg-[#161616] border border-[#2a2a2a] text-white text-sm px-5 py-3.5 rounded-xl pr-12 placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
          />
          <button
            onClick={handleSearchRight}
            disabled={loadingRight}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loadingRight ? (
              <svg className="w-4.5 h-4.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Timelines Columns Section */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 relative">
        {/* SVG Drawing Layer (Desktop only) */}
        {lines.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none hidden md:block w-full h-full z-20">
            <defs>
              <linearGradient id="overlapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {lines.map((line, idx) => (
              <g key={idx}>
                {/* Curved bezier connecting path */}
                <path
                  d={`M ${line.x1} ${line.y1} C ${(line.x1 + line.x2) / 2} ${line.y1}, ${(line.x1 + line.x2) / 2} ${line.y2}, ${line.x2} ${line.y2}`}
                  fill="none"
                  stroke="url(#overlapGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  className="animate-[dash_20s_linear_infinite]"
                />
                <circle cx={line.x1} cy={line.y1} r="5" fill="#3b82f6" className="animate-ping" />
                <circle cx={line.x2} cy={line.y2} r="5" fill="#8b5cf6" className="animate-ping" />
              </g>
            ))}
          </svg>
        )}

        {/* Left Column Content */}
        <div className="relative flex flex-col gap-6">
          <div className="absolute top-0 bottom-0 left-[21px] w-[2px] bg-gradient-to-b from-blue-500/50 to-transparent" />
          
          <h2 className="text-md font-bold text-blue-400 bg-blue-500/5 px-4 py-2 border border-blue-500/10 rounded-xl inline-block max-w-max relative z-10">
            {searchedLeft ? `Timeline: ${searchedLeft}` : 'Timeline A'}
          </h2>

          {loadingLeft && (
            <div className="flex justify-center py-12">
              <svg className="w-8 h-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {errorLeft && <p className="text-gray-500 text-sm py-4 pl-8">{errorLeft}</p>}

          {!loadingLeft && !errorLeft && eventsLeft.length === 0 && (
            <p className="text-gray-600 text-sm py-8 pl-8">Search a topic above to populate this timeline.</p>
          )}

          {!loadingLeft && !errorLeft && eventsLeft.map((ev, index) => {
            const hasMatch = matches.some(m => m.leftEvent.id === ev.id);
            return (
              <div key={ev.id} className="relative pl-8">
                {/* Connecting Dot anchor */}
                <div
                  id={`compare-dot-left-${ev.id}`}
                  className={`absolute left-[17px] top-6 w-2.5 h-2.5 rounded-full border-2 z-10 transition-all duration-300 ${
                    hasMatch
                      ? 'border-amber-400 bg-amber-400 shadow-md shadow-amber-400/50 scale-125'
                      : 'border-blue-500 bg-[#0a0a0a]'
                  }`}
                />
                
                {/* Visual Intersect tag inside the card if there's a match */}
                {hasMatch && (
                  <div className="mb-2 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 border border-amber-500/20 rounded-md inline-block">
                    ⚡ Date Overlap Found
                  </div>
                )}

                <EventCard
                  event={ev}
                  index={index}
                  isClosestUpcoming={false}
                  isBookmarked={isBookmarked(ev.id)}
                  onToggleBookmark={onToggleBookmark}
                  onClick={onEventClick}
                />
              </div>
            );
          })}
        </div>

        {/* Right Column Content */}
        <div className="relative flex flex-col gap-6">
          <div className="absolute top-0 bottom-0 left-[21px] w-[2px] bg-gradient-to-b from-purple-500/50 to-transparent" />

          <h2 className="text-md font-bold text-purple-400 bg-purple-500/5 px-4 py-2 border border-purple-500/10 rounded-xl inline-block max-w-max relative z-10">
            {searchedRight ? `Timeline: ${searchedRight}` : 'Timeline B'}
          </h2>

          {loadingRight && (
            <div className="flex justify-center py-12">
              <svg className="w-8 h-8 animate-spin text-purple-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {errorRight && <p className="text-gray-500 text-sm py-4 pl-8">{errorRight}</p>}

          {!loadingRight && !errorRight && eventsRight.length === 0 && (
            <p className="text-gray-600 text-sm py-8 pl-8">Search a topic above to populate this timeline.</p>
          )}

          {!loadingRight && !errorRight && eventsRight.map((ev, index) => {
            const hasMatch = matches.some(m => m.rightEvent.id === ev.id);
            return (
              <div key={ev.id} className="relative pl-8">
                {/* Connecting Dot anchor */}
                <div
                  id={`compare-dot-right-${ev.id}`}
                  className={`absolute left-[17px] top-6 w-2.5 h-2.5 rounded-full border-2 z-10 transition-all duration-300 ${
                    hasMatch
                      ? 'border-amber-400 bg-amber-400 shadow-md shadow-amber-400/50 scale-125'
                      : 'border-purple-500 bg-[#0a0a0a]'
                  }`}
                />

                {/* Visual Intersect tag inside the card if there's a match */}
                {hasMatch && (
                  <div className="mb-2 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 border border-amber-500/20 rounded-md inline-block">
                    ⚡ Date Overlap Found
                  </div>
                )}

                <EventCard
                  event={ev}
                  index={index}
                  isClosestUpcoming={false}
                  isBookmarked={isBookmarked(ev.id)}
                  onToggleBookmark={onToggleBookmark}
                  onClick={onEventClick}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Styles for SVG dashed line animation */}
      <style jsx global>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
      `}</style>
    </div>
  );
}
