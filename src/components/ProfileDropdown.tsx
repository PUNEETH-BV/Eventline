'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ProfileDropdownProps {
  user: { name: string; email: string; history?: string[] };
  onLogout: () => void;
  onHistoryClick: (query: string) => void;
  onHistoryUpdate: (history: string[]) => void;
}

export default function ProfileDropdown({ user, onLogout, onHistoryClick, onHistoryUpdate }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const history = user.history || [];

  // Delete single history item
  const handleDeleteItem = (e: React.MouseEvent, indexToDelete: number) => {
    e.stopPropagation(); // Prevent search click
    const updatedHistory = history.filter((_, idx) => idx !== indexToDelete);
    updateStorage(updatedHistory);
  };

  // Clear all history
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateStorage([]);
  };

  // Helper to sync updated history back to local storage and parent state
  const updateStorage = (newHistory: string[]) => {
    // Update active session
    const savedSession = localStorage.getItem('eventline_session');
    if (savedSession) {
      try {
        const sessionObj = JSON.parse(savedSession);
        localStorage.setItem('eventline_session', JSON.stringify({ ...sessionObj, history: newHistory }));
      } catch (err) {
        console.error(err);
      }
    }

    // Update in users database
    const usersStr = localStorage.getItem('eventline_users') || '[]';
    try {
      const users = JSON.parse(usersStr);
      const userIndex = users.findIndex((u: any) => u.email === user.email);
      if (userIndex !== -1) {
        users[userIndex].history = newHistory;
        localStorage.setItem('eventline_users', JSON.stringify(users));
      }
    } catch (err) {
      console.error(err);
    }

    onHistoryUpdate(newHistory);
  };

  // Get user initials for avatar fallback
  const initials = user.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Avatar Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white flex items-center justify-center font-bold text-sm border border-blue-500/20 hover:scale-105 transition-all duration-200 cursor-pointer shadow-lg shadow-black/20"
      >
        {initials}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-[#0c0c0c] border border-[#2a2a2a] shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* User Details */}
          <div className="p-4 border-b border-[#1f1f1f] bg-[#070707]">
            <p className="text-xs font-bold text-white tracking-tight">{user.name}</p>
            <p className="text-[10px] text-gray-500 font-semibold mt-0.5 truncate">{user.email}</p>
          </div>

          {/* Search History Area */}
          <div className="p-4 border-b border-[#1f1f1f]">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Search History</span>
              {history.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] font-semibold text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-[11px] text-gray-600 font-semibold text-center py-4">No search history yet.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
                {history.map((queryText, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      onHistoryClick(queryText);
                      setIsOpen(false);
                    }}
                    className="flex justify-between items-center text-xs text-gray-300 hover:text-white bg-[#121212] hover:bg-[#161616] border border-[#1c1c1c] rounded-lg px-2.5 py-1.5 transition-all cursor-pointer group"
                  >
                    <span className="truncate flex-1 font-medium mr-2">{queryText}</span>
                    <button
                      onClick={(e) => handleDeleteItem(e, index)}
                      className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-all md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                      title="Delete history item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logout Button */}
          <div className="p-2 bg-[#070707]">
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-400 hover:text-red-400 rounded-xl hover:bg-[#121212] transition-all cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
