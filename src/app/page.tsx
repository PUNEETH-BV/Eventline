'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query]);

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

    // Auto-send first message if no history exists
    const eventId = selectedEvent.id;
    if (!chatHistories[eventId] || chatHistories[eventId].length === 0) {
      const firstMessage = `Tell me everything important about: ${selectedEvent.title} on ${selectedEvent.date}. Context: ${selectedEvent.description}`;
      setChatHistories(prev => ({
        ...prev,
        [eventId]: [{ role: 'user', content: firstMessage }],
      }));

      // Send to API
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
      const errMsg = err instanceof Error ? err.message : 'Sorry, I encountered an error. Please try again.';
      setChatHistories(prev => ({
        ...prev,
        [eventId]: [
          ...messages,
          { role: 'assistant', content: `Error: ${errMsg}` },
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

  // Layer CSS classes
  const getLayerClass = (layer: number) => {
    if (layer === activeLayer) return 'layer-base layer-active';
    if (layer === activeLayer - 1) return 'layer-base layer-behind-1';
    if (layer === activeLayer - 2) return 'layer-base layer-behind-2';
    return 'layer-base layer-active';
  };

  // Show saved view
  const showSaved = activeTab === 'saved';
  const showHome = !hasSearched && activeTab !== 'saved';
  const showTimeline = hasSearched && !showSaved;

  return (
    <main className="min-h-screen bg-[#0f0f0f] pb-20 md:pb-0">
      {/* ===== LAYER 0: HOME + TIMELINE ===== */}
      <div className={`${getLayerClass(0)} ${showSaved ? 'hidden' : ''}`}>
        {/* Search Bar - Sticky */}
        <div className={`sticky top-0 z-40 ${hasSearched ? 'glass border-b border-[#2a2a2a]' : ''}`}>
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
          </div>
        </div>

        {/* Timeline Results */}
        {showTimeline && (
          <div data-timeline-scroll className="min-h-screen">
            {/* Query heading */}
            <div className="max-w-[700px] mx-auto px-4 pt-6 pb-2">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Timeline for: <span className="gradient-text">{searchedQuery}</span>
              </h2>
            </div>

            {/* Loading */}
            {loading && <SkeletonTimeline />}

            {/* Error */}
            {error && !loading && (
              <div className="max-w-[700px] mx-auto px-4 py-16 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-400 text-lg">{error}</p>
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
              <span>Powered by AI</span>
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
    </main>
  );
}
