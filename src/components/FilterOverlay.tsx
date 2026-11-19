import { Heart } from 'lucide-react';
import {
  ATTRIBUTE_SEQUENCE,
  FilterPhase,
  PredictionResult,
} from '../data/predictions';

interface FilterOverlayProps {
  phase: FilterPhase;
  displayValues: PredictionResult;
  lockedCount: number;
}

export function FilterOverlay({
  phase,
  displayValues,
  lockedCount,
}: FilterOverlayProps) {
  if (phase === 'idle') {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-16 sm:top-20 z-20 px-4 sm:px-8 flex flex-col items-start"
      aria-live="polite"
    >
      {/* Floating Filter Title Banner */}
      <div className="mb-3 sm:mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500/95 to-purple-600/95 px-4 py-1.5 shadow-[0_0_24px_rgba(236,72,153,0.55)] backdrop-blur-md border border-white/25">
        <Heart className="w-3.5 h-3.5 text-white fill-white shrink-0" />
        <span className="font-display text-xs sm:text-sm font-bold tracking-wide text-white whitespace-nowrap">
          My Next Relationship
        </span>
      </div>

      {/* Vertical Connected Prediction Chain */}
      <div className="relative pl-1.5 w-full max-w-[260px] sm:max-w-[310px]">
        {/* Vertical glowing connecting line */}
        <div
          className="absolute left-[13px] top-4 bottom-4 w-[3px] rounded-full bg-gradient-to-b from-pink-400 via-pink-500 to-purple-500 shadow-[0_0_14px_rgba(236,72,153,0.9)]"
          aria-hidden="true"
        />

        <ul className="relative flex flex-col gap-2 sm:gap-2.5">
          {ATTRIBUTE_SEQUENCE.map((attr, index) => {
            const isLocked = phase === 'revealed' || index < lockedCount;
            const isRolling = phase === 'rolling' && index >= lockedCount;
            const value = displayValues[attr.key];

            return (
              <li
                key={attr.key}
                className="relative flex items-center gap-3 sm:gap-3.5"
              >
                {/* Pink Circular Marker */}
                <div className="relative z-10 flex items-center justify-center w-4 h-4 shrink-0">
                  <span
                    className={`absolute inset-0 rounded-full transition-transform duration-200 ${
                      isLocked
                        ? 'bg-pink-500 shadow-[0_0_14px_rgba(236,72,153,1)] scale-100'
                        : 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.9)] scale-90'
                    }`}
                  />
                  <span
                    className={`relative w-1.5 h-1.5 rounded-full bg-white transition-opacity duration-200 ${
                      isLocked ? 'opacity-100' : 'opacity-70'
                    }`}
                  />
                </div>

                {/* Attribute Card */}
                <div
                  className={`flex-1 min-w-0 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 backdrop-blur-md transition-all duration-200 ${
                    isLocked
                      ? 'bg-black/75 border border-pink-400/60 shadow-[0_4px_20px_rgba(236,72,153,0.28)] animate-lock-pop'
                      : 'bg-black/55 border border-purple-400/35 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-pink-300 leading-none">
                      {attr.label}
                    </span>
                  </div>

                  <div className="mt-0.5 h-5 sm:h-6 overflow-hidden flex items-center">
                    <span
                      key={isLocked ? `locked-${attr.key}` : undefined}
                      className={`font-display text-sm sm:text-base font-bold leading-tight truncate tabular-nums ${
                        isRolling
                          ? 'text-purple-100/90 animate-slot-roll'
                          : 'text-white glow-text-white'
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
