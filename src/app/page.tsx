'use client';

import { useState, useCallback, useEffect } from 'react';
import { TimelineEvent, ChatMessage, ActiveTab } from '@/types';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useLayerNavigation } from '@/hooks/useLayerNavigation';
import SearchBar from '@/components/SearchBar';
import ExampleChips from '@/components/ExampleChips';
import Timeline from '@/components/Timeline';
import SkeletonTimeline from '@/components/SkeletonTimeline';
import EventDetailPanel from '@/components/EventDetailPanel';
import DigDeeperChat from '@/components/DigDeeperChat';
import BottomNav from '@/components/BottomNav';
import SavedEvents from '@/components/SavedEvents';
import GeneralChatPanel from '@/components/GeneralChatPanel';
import AuthModal from '@/components/AuthModal';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function Home() {
  // Search state
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Dig deeper (timeline expansion)
  const [diggingDeeper, setDiggingDeeper] = useState(false);

  // Layer navigation
  const { activeLayer, selectedEvent, openDetail, openChat, goBack } = useLayerNavigation();

  // Bookmarks
  const { bookmarks, toggleBookmark, isBookmarked, clearAll } = useBookmarks();

  // Chat state (per event)
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [chatTyping, setChatTyping] = useState(false);

  // Active tab (mobile nav)
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // New states for v2/v3: auth, chatbot, & toast notifications
  const [showGeneralChat, setShowGeneralChat] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; history?: string[] } | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2000);
  }, []);

  // Restore user session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem('eventline_session');
      if (savedSession) {
        try {
          setCurrentUser(JSON.parse(savedSession));
        } catch (err) {
          console.error(err);
        }
      }
    }
  }, []);

  // Search handler
  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setQuery(q);
    setSearchedQuery(q);
    setLoading(true);
    setError('');
    setHasSearched(true);
    setEvents([]);
    setActiveTab('search');

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `?q=${encodeURIComponent(q)}`);
      
      // Save search query to logged-in user history
      const savedSession = localStorage.getItem('eventline_session');
      if (savedSession) {
        try {
          const userObj = JSON.parse(savedSession);
          const usersListStr = localStorage.getItem('eventline_users') || '[]';
          const users = JSON.parse(usersListStr);
          const activeUserIndex = users.findIndex((u: any) => u.email === userObj.email);
          
          if (activeUserIndex !== -1) {
            const history = users[activeUserIndex].history || [];
            // Remove duplicate if it already exists, so it jumps to top
            const filteredHistory = history.filter((h: string) => h !== q);
            filteredHistory.unshift(q);
            if (filteredHistory.length > 20) filteredHistory.pop(); // limit to 20
            
            users[activeUserIndex].history = filteredHistory;
            localStorage.setItem('eventline_users', JSON.stringify(users));
            
            const updatedUser = { ...userObj, history: filteredHistory };
            localStorage.setItem('eventline_session', JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
          }
        } catch (err) {
          console.error('Failed to save search history:', err);
        }
      }
    }

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Search failed');
      }

      if (data.events && data.events.length > 0) {
        setEvents(data.events);
      } else {
        setError('No events found. Try a different search query.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again after some time.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Read URL search query on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        setQuery(q);
        setTimeout(() => {
          handleSearch(q);
        }, 100);
      }
    }
  }, [handleSearch]);

  // Chip click handler
  const handleChipClick = useCallback((chipQuery: string) => {
    setQuery(chipQuery);
    handleSearch(chipQuery);
  }, [handleSearch]);

  // Dig deeper (expand timeline)
  const handleDigDeeperTimeline = useCallback(async () => {
    if (!searchedQuery || diggingDeeper) return;

    setDiggingDeeper(true);
    try {
      const res = await fetch('/api/dig-deeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchedQuery,
          existingTitles: events.map(e => e.title),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          setEvents(prev => {
            const all = [...prev, ...data.events];
            all.sort((a: TimelineEvent, b: TimelineEvent) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            return all;
          });
        }
      }
    } catch {
      // Silently fail
    } finally {
      setDiggingDeeper(false);
    }
  }, [searchedQuery, events, diggingDeeper]);

  // Event card click → open detail
  const handleEventClick = useCallback((event: TimelineEvent) => {
    openDetail(event);
  }, [openDetail]);

  // Dig deeper from detail panel → open chat
  const handleDigDeeperChat = useCallback(() => {
    if (!selectedEvent) return;

    const eventId = selectedEvent.id;
    if (!chatHistories[eventId] || chatHistories[eventId].length === 0) {
      const firstMessage = `Tell me everything important about: ${selectedEvent.title} on ${selectedEvent.date}. Context: ${selectedEvent.description}`;
      setChatHistories(prev => ({
        ...prev,
        [eventId]: [{ role: 'user', content: firstMessage }],
      }));

      openChat();
      sendChatMessage(eventId, firstMessage, []);
    } else {
      openChat();
    }
  }, [selectedEvent, chatHistories, openChat]);

  // Send chat message
  const sendChatMessage = useCallback(async (
    eventId: string,
    message: string,
    existingMessages: ChatMessage[]
  ) => {
    if (!selectedEvent) return;

    setChatTyping(true);

    const messages: ChatMessage[] = [
      ...existingMessages,
      { role: 'user' as const, content: message },
    ];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: selectedEvent.title,
          eventDate: selectedEvent.date,
          eventDescription: selectedEvent.description,
          messages,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Chat request failed');
      }

      setChatHistories(prev => ({
        ...prev,
        [eventId]: [
          ...messages,
          { role: 'assistant', content: data.message },
        ],
      }));
    } catch (err) {
      setChatHistories(prev => ({
        ...prev,
        [eventId]: [
          ...messages,
          { role: 'assistant', content: 'Something went wrong. Please try again after some time.' },
        ],
      }));
    } finally {
      setChatTyping(false);
    }
  }, [selectedEvent]);

  // Handle user sending a chat message
  const handleSendChatMessage = useCallback((message: string) => {
    if (!selectedEvent) return;
    const eventId = selectedEvent.id;
    const existing = chatHistories[eventId] || [];

    setChatHistories(prev => ({
      ...prev,
      [eventId]: [...existing, { role: 'user', content: message }],
    }));

    sendChatMessage(eventId, message, existing);
  }, [selectedEvent, chatHistories, sendChatMessage]);

  // Share timeline link
  const handleShareTimeline = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined') return;

    const shareUrl = `${window.location.origin}/?q=${encodeURIComponent(searchedQuery)}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => triggerToast('Link copied!'))
      .catch(() => triggerToast('Failed to copy link.'));
  }, [searchedQuery, triggerToast]);

  // Go back to Home / search new topic
  const handleGoHome = useCallback(() => {
    setHasSearched(false);
    setEvents([]);
    setSearchedQuery('');
    setQuery('');
    setError('');
    setActiveTab('home');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
  }, []);

  // Update user history in states & localStorage
  const updateUserHistory = useCallback((newHistory: string[]) => {
    if (!currentUser) return;
    
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
    const usersListStr = localStorage.getItem('eventline_users') || '[]';
    try {
      const users = JSON.parse(usersListStr);
      const userIndex = users.findIndex((u: any) => u.email === currentUser.email);
      if (userIndex !== -1) {
        users[userIndex].history = newHistory;
        localStorage.setItem('eventline_users', JSON.stringify(users));
      }
    } catch (err) {
      console.error(err);
    }

    setCurrentUser(prev => prev ? { ...prev, history: newHistory } : null);
  }, [currentUser]);



  // Layer CSS classes
  const getLayerClass = (layer: number) => {
    if (layer === activeLayer) return 'layer-base layer-active';
    if (layer === activeLayer - 1) return 'layer-base layer-behind-1';
    if (layer === activeLayer - 2) return 'layer-base layer-behind-2';
    return 'layer-base layer-active';
  };

  const showSaved = activeTab === 'saved';
  const showHome = !hasSearched && activeTab !== 'saved';
  const showTimeline = hasSearched && !showSaved;

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20 md:pb-0 relative">
      {/* ===== LAYER 0: HOME + TIMELINE ===== */}
      <div className={`${getLayerClass(0)} ${showSaved ? 'hidden' : ''}`}>
        {/* Search Bar - Sticky */}
        <div className={`sticky top-0 z-45 ${hasSearched ? 'glass border-b border-[#2a2a2a]' : ''}`}>
          <div className={`${hasSearched ? 'py-3 px-4' : 'pt-[25vh] px-4'} transition-all duration-500`}>
            {/* Logo / Title */}
            {!hasSearched && (
              <div className="text-center mb-8 animate-fadeSlideUp">
                <h1 className="text-5xl md:text-6xl font-bold mb-3">
                  <span className="gradient-text">EventLine</span>
                </h1>
                <p className="text-gray-400 text-lg">Search any event. See the full timeline.</p>
              </div>
            )}

            <SearchBar
              query={query}
              setQuery={setQuery}
              onSearch={() => handleSearch()}
              loading={loading}
            />

            {/* Example Chips */}
            {!hasSearched && (
              <div className="mt-6 animate-fadeSlideUp" style={{ animationDelay: '200ms' }}>
                <ExampleChips onChipClick={handleChipClick} />
              </div>
            )}

            {/* Recent Searches / History in the home page */}
            {!hasSearched && currentUser && currentUser.history && currentUser.history.length > 0 && (
              <div className="mt-8 max-w-2xl mx-auto px-4 animate-fadeSlideUp text-center" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center justify-between max-w-md mx-auto mb-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-blue-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Recent Searches
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateUserHistory([]);
                    }}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap justify-center gap-2.5 max-w-lg mx-auto">
                  {currentUser.history.slice(0, 6).map((queryText, index) => (
                    <div
                      key={index}
                      onClick={() => handleChipClick(queryText)}
                      className="text-xs text-gray-300 bg-[#121212]/80 hover:bg-[#181818] border border-[#222] hover:border-blue-500/30 rounded-xl px-3.5 py-2 transition-all cursor-pointer flex items-center gap-1.5 group hover:scale-105"
                    >
                      <span className="truncate max-w-[150px] font-medium">{queryText}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = (currentUser.history || []).filter((_, idx) => idx !== index);
                          updateUserHistory(updated);
                        }}
                        className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-all opacity-60 hover:opacity-100 cursor-pointer"
                        title="Delete search"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Results */}
        {showTimeline && (
          <div data-timeline-scroll className="min-h-screen">
            {/* Query heading with Home & Share option */}
            <div className="max-w-[700px] mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-white truncate max-w-[55%]">
                Timeline for: <span className="gradient-text">{searchedQuery}</span>
              </h2>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleGoHome}
                  className="text-gray-400 hover:text-white bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all hover:border-blue-500/30 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-emerald-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  Home
                </button>
                <button
                  onClick={handleShareTimeline}
                  className="text-gray-400 hover:text-white bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-all hover:border-blue-500/30 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-blue-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                  </svg>
                  Share
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && <SkeletonTimeline />}

            {/* Error */}
            {error && !loading && (
              <div className="max-w-[700px] mx-auto px-4 py-16 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-400 text-lg leading-relaxed mb-6">{error}</p>
                <button
                  onClick={handleGoHome}
                  className="text-gray-400 hover:text-white bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2 flex items-center gap-1.5 text-xs font-semibold transition-all hover:border-blue-500/30 cursor-pointer mx-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-emerald-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  Go Home
                </button>
              </div>
            )}

            {/* Timeline */}
            {!loading && !error && events.length > 0 && (
              <Timeline
                events={events}
                onEventClick={handleEventClick}
                onDigDeeper={handleDigDeeperTimeline}
                diggingDeeper={diggingDeeper}
                isBookmarked={isBookmarked}
                onToggleBookmark={toggleBookmark}
              />
            )}
          </div>
        )}

        {/* Home empty state decoration */}
        {showHome && (
          <div className="fixed bottom-32 md:bottom-20 left-0 right-0 text-center text-gray-600 text-sm animate-float" style={{ animationDelay: '500ms' }}>
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500/30"></span>
              <span>Powered by AI & Gemini</span>
              <span className="w-2 h-2 rounded-full bg-purple-500/30"></span>
            </div>
          </div>
        )}
      </div>

      {/* ===== SAVED EVENTS VIEW ===== */}
      {showSaved && (
        <div className="min-h-screen pt-4">
          <SavedEvents
            bookmarks={bookmarks}
            onRemoveBookmark={(id) => toggleBookmark({ id } as TimelineEvent)}
            onClearAll={clearAll}
            onEventClick={handleEventClick}
          />
        </div>
      )}

      {/* ===== LAYER 1: EVENT DETAIL PANEL ===== */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          isActive={activeLayer >= 1}
          onBack={goBack}
          onDigDeeper={handleDigDeeperChat}
          isBookmarked={isBookmarked(selectedEvent.id)}
          onToggleBookmark={toggleBookmark}
        />
      )}

      {/* ===== LAYER 2: DIG DEEPER CHAT ===== */}
      {selectedEvent && activeLayer >= 1 && (
        <DigDeeperChat
          event={selectedEvent}
          isActive={activeLayer === 2}
          onBack={goBack}
          chatHistory={chatHistories[selectedEvent.id] || []}
          onSendMessage={handleSendChatMessage}
          isTyping={chatTyping}
        />
      )}

      {/* ===== BOTTOM NAVIGATION (Mobile) ===== */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'home') {
            setHasSearched(false);
            setEvents([]);
            setSearchedQuery('');
            setQuery('');
            setError('');
          } else if (tab === 'search' && searchedQuery) {
            setHasSearched(true);
          }
        }}
      />

      {/* ===== AUTH / USER PROFILE CONTROLS ===== */}
      <div className="absolute top-4 right-4 z-40">
        {currentUser ? (
          <ProfileDropdown 
            user={currentUser} 
            onLogout={() => {
              localStorage.removeItem('eventline_session');
              setCurrentUser(null);
              triggerToast('Signed out successfully');
            }} 
            onHistoryClick={(historyQuery) => {
              setQuery(historyQuery);
              handleSearch(historyQuery);
            }}
            onHistoryUpdate={(updatedHistory) => {
              setCurrentUser(prev => prev ? { ...prev, history: updatedHistory } : null);
            }}
          />
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-[#111]/80 hover:bg-[#161616] text-gray-300 hover:text-white border border-[#2a2a2a] rounded-xl px-4 py-2 text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer shadow-lg shadow-black/20 flex items-center gap-1.5 backdrop-blur-md animate-fadeIn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-blue-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Sign In
          </button>
        )}
      </div>

      {/* ===== FLOATING GENERAL CHAT BOT BUTTON ===== */}
      <button
        onClick={() => setShowGeneralChat(true)}
        className="fixed bottom-24 left-6 md:bottom-8 md:left-8 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 hover:scale-105 transition-all duration-200 cursor-pointer group"
        title="EventLine AI Assistant"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping group-hover:hidden" />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6 relative z-10"
        >
          <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.75.75 0 0 1-.643-.353l-3.854-5.836A.75.75 0 0 0 10.74 15H9.75a.75.75 0 0 0-.75.75v3.475a.75.75 0 0 1-1.28.53l-3.32-3.32c-.087-.087-.191-.157-.307-.206A48.567 48.567 0 0 1 2.25 12V6.741c0-1.946 1.37-3.678 3.348-3.97ZM6.75 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* ===== GENERAL CHAT PANEL OVERLAY ===== */}
      <GeneralChatPanel
        isOpen={showGeneralChat}
        onClose={() => setShowGeneralChat(false)}
        onSuggestionClick={(q) => {
          setShowGeneralChat(false);
          setQuery(q);
          handleSearch(q);
        }}
      />

      {/* ===== AUTH MODAL ===== */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
        triggerToast={triggerToast}
      />

      {/* ===== GLOBAL TOAST NOTIFICATION ===== */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#161616] border border-blue-500/30 text-white px-5 py-2.5 rounded-full shadow-xl text-sm font-semibold animate-fadeSlideUp">
          {toastMessage}
        </div>
      )}
    </main>
  );
}
