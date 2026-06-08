'use client';

import React from 'react';

export default function SkeletonTimeline() {
  return (
    <div className="max-w-[700px] mx-auto px-4 py-8 relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900" />

      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="relative mb-8">
          {/* Skeleton dot */}
          <div className="absolute left-[24px] md:left-1/2 transform md:-translate-x-1/2 w-3 h-3 rounded-full bg-[#252525] z-10 top-6" />

          {/* Skeleton card */}
          <div
            className={`
              ml-14 md:ml-0
              ${
                index % 2 === 0
                  ? 'md:w-[calc(50%-32px)] md:mr-auto'
                  : 'md:w-[calc(50%-32px)] md:ml-auto'
              }
            `}
            style={{ opacity: 1 - index * 0.12 }}
          >
            <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a] animate-pulse">
              {/* Status badge placeholder */}
              <div className="w-20 h-5 bg-[#252525] rounded-full" />

              {/* Title placeholder */}
              <div className="w-3/4 h-6 bg-[#252525] rounded mt-3" />

              {/* Date placeholder */}
              <div className="w-1/3 h-4 bg-[#252525] rounded mt-2" />

              {/* Description placeholders */}
              <div className="w-full h-4 bg-[#252525] rounded mt-2" />
              <div className="w-2/3 h-4 bg-[#252525] rounded mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
