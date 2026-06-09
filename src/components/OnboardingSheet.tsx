'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/types';

interface OnboardingSheetProps {
  onSave: (profile: UserProfile) => void;
}

export default function OnboardingSheet({ onSave }: OnboardingSheetProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [type, setType] = useState<'student' | 'professional' | 'curious' | ''>('');
  const [interests, setInterests] = useState<('exams' | 'tech' | 'sports' | 'politics')[]>([]);

  const handleInterestToggle = (interest: 'exams' | 'tech' | 'sports' | 'politics') => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSave = () => {
    if (!type) {
      alert('Please select what best describes you.');
      return;
    }
    const profile: UserProfile = { type, interests };
    localStorage.setItem('eventline_onboarding', JSON.stringify(profile));
    setIsOpen(false);
    onSave(profile);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Sliding Sheet */}
      <div className="w-full max-w-md bg-[#0f0f0f] border-t border-[#2a2a2a] rounded-t-3xl p-6 shadow-2xl transition-transform duration-300 panel-active-mobile">
        {/* Decorative Drag Handle */}
        <div className="w-12 h-1 bg-[#333] rounded-full mx-auto mb-6" />

        <h2 className="text-2xl font-bold mb-1 text-center">
          Personalize <span className="gradient-text">EventLine</span>
        </h2>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Tell us about yourself to tailor your event timeline.
        </p>

        {/* Question 1 */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            1. What best describes you?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'student' as const, label: 'Student' },
              { id: 'professional' as const, label: 'Professional' },
              { id: 'curious' as const, label: 'Curious' },
            ].map(item => {
              const active = type === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id)}
                  className={`py-3 px-1 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    active
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question 2 */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            2. What topics interest you most?
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'exams' as const, label: '📚 Exams & Education' },
              { id: 'tech' as const, label: '💻 Tech & Science' },
              { id: 'sports' as const, label: '🏆 Sports' },
              { id: 'politics' as const, label: '🌍 Politics & World' },
            ].map(item => {
              const active = interests.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleInterestToggle(item.id)}
                  className={`py-3 px-3 rounded-xl border text-xs font-semibold text-left transition-all duration-200 cursor-pointer ${
                    active
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                      : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 cursor-pointer text-sm"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
