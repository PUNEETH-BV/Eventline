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
  onAddPersonalMilestone?: (milestone: { title: string; date: string; description: string }) => void;
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
    <span className="bg-blue-500/20 text-blue-400 text-xs px-2.5 py-1 rounded-full uppercase tracking-wide font-medium">
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
  onAddPersonalMilestone,
}: EventDetailPanelProps) {
  const [baseDescription, setBaseDescription] = useState('');
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Personal Milestone form state
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneGoal, setMilestoneGoal] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');

  // Reminder options states
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [reminderToast, setReminderToast] = useState('');

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Fetch AI base description fresh when card is clicked
  useEffect(() => {
    if (!event || !isActive) return;

    let active = true;
    async function fetchBaseDescription() {
      setLoadingDescription(true);
      setBaseDescription('');
      try {
        const res = await fetch('/api/description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: event.title,
            date: event.date,
            description: event.description,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (active && data.description) {
            setBaseDescription(data.description);
          }
        } else {
          setBaseDescription(event.description);
        }
      } catch (err) {
        console.error('Failed to fetch description:', err);
        setBaseDescription(event.description);
      } finally {
        if (active) {
          setLoadingDescription(false);
        }
      }
    }

    fetchBaseDescription();

    // Reset forms
    setShowMilestoneForm(false);
    setMilestoneGoal('');
    setMilestoneDate(event.date);

    return () => {
      active = false;
    };
  }, [event, isActive]);

  // Google Calendar URL generator
  const getGoogleCalendarUrl = () => {
    const startDateStr = event.date.replace(/-/g, '');
    const startDate = new Date(event.date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');

    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}`;
  };

  const handleReminderSelect = async (daysBefore: number) => {
    setShowReminderOptions(false);
    if (typeof window === 'undefined') return;

    if (!('Notification' in window)) {
      setShowCalendarModal(true);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const msg = `Reminder scheduled ${daysBefore} day${daysBefore > 1 ? 's' : ''} before ${event.title}!`;
        
        // Save reminder in local storage
        const reminders = JSON.parse(localStorage.getItem('eventline_reminders') || '[]');
        reminders.push({
          id: `${event.id}-${Date.now()}`,
          title: event.title,
          date: event.date,
          daysBefore,
        });
        localStorage.setItem('eventline_reminders', JSON.stringify(reminders));

        setReminderToast(msg);
        setTimeout(() => setReminderToast(''), 3000);
      } else {
        setShowCalendarModal(true);
      }
    } catch {
      setShowCalendarModal(true);
    }
  };

  const handleMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneGoal.trim() || !milestoneDate) return;

    if (onAddPersonalMilestone) {
      onAddPersonalMilestone({
        title: milestoneGoal.trim(),
        date: milestoneDate,
        description: `Goal set near: ${event.title}`,
      });
      setMilestoneGoal('');
      setShowMilestoneForm(false);
      
      setReminderToast('Personal milestone added to timeline!');
      setTimeout(() => setReminderToast(''), 3000);
    }
  };

  return (
    <div
      className={`
        fixed z-50
        inset-x-0 bottom-0 h-[90vh] rounded-t-3xl border-t
        md:inset-y-0 md:right-0 md:left-auto md:w-full md:max-w-[60vw] md:h-auto md:rounded-t-none md:border-t-0 md:border-l
        bg-[#111] border-[#2a2a2a] shadow-2xl
        transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${
          isActive
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full'
        }
      `}
    >
      <div className="overflow-y-auto h-full p-6 relative">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 cursor-pointer font-semibold text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider max-w-[50%] truncate">
            {event.title}
          </span>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: event.title,
                  text: event.description,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                setReminderToast('Link copied to clipboard!');
                setTimeout(() => setReminderToast(''), 2000);
              }
            }}
            className="text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
            </svg>
          </button>
        </div>

        {/* Status + Date */}
        <div className="mb-4">
          <StatusBadge event={event} />
          <h2 className="text-2xl font-bold text-white mt-3 leading-tight">{event.title}</h2>
          <p className="text-gray-400 text-sm mt-1">{formattedDate}</p>
        </div>

        <div className="h-[1px] bg-[#222] my-4" />

        {/* AI-Generated Base Description */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1">
            <span className="text-blue-500">✨</span> AI Overview
          </h3>

          {loadingDescription ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-[#202020] rounded w-full" />
              <div className="h-4 bg-[#202020] rounded w-5/6" />
              <div className="h-4 bg-[#202020] rounded w-4/5" />
              <div className="h-4 bg-[#202020] rounded w-2/3" />
            </div>
          ) : (
            <p className="text-gray-300 leading-relaxed text-sm bg-[#161616]/50 p-4 rounded-2xl border border-[#222]">
              {baseDescription}
            </p>
          )}
        </div>

        {/* Credibility section with Tooltip */}
        {!event.isPersonal && event.source && (
          <div className="mb-6 flex items-center justify-between text-xs bg-[#161616] border border-[#2a2a2a] p-3.5 rounded-2xl relative">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-medium">📌 Source:</span>
              <span className="text-white font-semibold">{event.source}</span>
            </div>
            <div className="flex items-center gap-1.5 relative">
              <span className="text-gray-500 font-medium">Confidence:</span>
              <span className={`font-bold uppercase tracking-wider ${
                event.confidence === 'high' ? 'text-emerald-400' : 'text-amber-400'
              }`}>{event.confidence || 'medium'}</span>
              
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className="w-4.5 h-4.5 rounded-full bg-[#2a2a2a] text-gray-400 flex items-center justify-center text-[10px] font-bold cursor-help hover:text-white transition-all"
              >
                ?
              </button>

              {showTooltip && (
                <div className="absolute right-0 bottom-7 bg-[#252525] border border-[#3a3a3a] text-gray-300 text-[10px] p-2.5 rounded-xl shadow-2xl w-48 z-40 leading-relaxed animate-fadeIn">
                  Confidence rating represents the reliability of the source links and alignment across multiple event platforms.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Set Reminder Button */}
        {!event.isPersonal && (
          <div className="mb-4 relative">
            <button
              onClick={() => setShowReminderOptions(!showReminderOptions)}
              className="w-full bg-[#181818] hover:bg-[#202020] text-gray-300 hover:text-white border border-[#2a2a2a] hover:border-blue-500/30 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 text-xs"
            >
              🔔 Remind Me
            </button>
            {showReminderOptions && (
              <div className="absolute top-12 left-0 right-0 bg-[#161616] border border-[#2a2a2a] rounded-xl shadow-2xl z-40 overflow-hidden animate-fadeIn">
                {[
                  { label: '1 Day Before', val: 1 },
                  { label: '3 Days Before', val: 3 },
                  { label: '1 Week Before', val: 7 },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => handleReminderSelect(opt.val)}
                    className="w-full py-3 px-4 text-xs font-semibold text-gray-400 hover:text-white text-left hover:bg-[#202020] border-b border-[#222] last:border-0 cursor-pointer"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Personal Milestone Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowMilestoneForm(!showMilestoneForm)}
            className="w-full bg-[#181818] hover:bg-[#202020] text-amber-500 border border-[#2a2a2a] hover:border-amber-500/30 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 text-xs"
          >
            ➕ Add My Own Milestone Near This Date
          </button>
          
          {showMilestoneForm && (
            <form onSubmit={handleMilestoneSubmit} className="mt-3 bg-[#161616] border border-[#2a2a2a] p-4 rounded-xl space-y-3 animate-fadeIn">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">What's your goal?</label>
                <input
                  type="text"
                  required
                  value={milestoneGoal}
                  onChange={(e) => setMilestoneGoal(e.target.value)}
                  placeholder="e.g. Finish syllabus review, Register, etc."
                  className="w-full bg-[#121212] border border-[#222] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                  className="w-full bg-[#121212] border border-[#222] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs py-3 rounded-xl cursor-pointer transition-all"
              >
                Save Milestone
              </button>
            </form>
          )}
        </div>

        {/* Bookmarks Toggle button */}
        <button
          onClick={() => onToggleBookmark(event)}
          className={`
            w-full mb-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-xs border
            ${
              isBookmarked
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'bg-[#1a1a1a] text-gray-300 border-[#2a2a2a] hover:border-blue-500/30'
            }
          `}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-4 h-4 ${isBookmarked ? 'fill-blue-500' : 'fill-none'}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
            />
          </svg>
          {isBookmarked ? 'Bookmarked' : 'Bookmark this event'}
        </button>

        {/* Big Glowing CTA Button */}
        <button
          onClick={onDigDeeper}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 cursor-pointer"
        >
          Dig Deeper 🔍
        </button>
      </div>

      {/* Reminder Fallback Modal (Calendar link) */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-3xl p-6 max-w-sm w-full text-center relative shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">🔔 Set Calendar Reminder</h3>
            <p className="text-gray-400 text-xs leading-relaxed mb-6">
              Push notifications are blocked or unsupported on this device. Click below to add this date directly to your Google Calendar.
            </p>
            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowCalendarModal(false)}
              className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-center text-xs transition-all mb-3"
            >
              Add to Google Calendar
            </a>
            <button
              onClick={() => setShowCalendarModal(false)}
              className="w-full bg-[#202020] hover:bg-[#252525] text-gray-300 font-semibold py-3 rounded-xl text-xs cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {reminderToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-60 bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl animate-fadeSlideUp">
          {reminderToast}
        </div>
      )}
    </div>
  );
}
