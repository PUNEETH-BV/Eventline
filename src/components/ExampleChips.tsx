'use client';

import React from 'react';

interface ExampleChipsProps {
  onChipClick: (query: string) => void;
}

const chips = ['NEET 2026', 'JEE Mains', 'IPL 2026', 'Google I/O'];

export default function ExampleChips({ onChipClick }: ExampleChipsProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => onChipClick(chip)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-5 py-2.5 text-sm text-gray-300 hover:bg-[#252525] hover:border-blue-500/50 hover:text-white hover:scale-105 transition-all duration-200 cursor-pointer"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
