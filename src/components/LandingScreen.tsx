import { Camera, Heart, Lock, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import {
  ATTRIBUTE_SEQUENCE,
  generateFinalPrediction,
  PredictionResult,
  SAMPLE_PREVIEW_PREDICTION,
} from '../data/predictions';

interface LandingScreenProps {
  onStartCamera: () => void;
}

export function LandingScreen({ onStartCamera }: LandingScreenProps) {
  const [sampleCard, setSampleCard] = useState<PredictionResult>(
    SAMPLE_PREVIEW_PREDICTION
  );

  const handleShufflePreview = () => {
    setSampleCard(generateFinalPrediction());
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#07050c] text-white flex flex-col justify-between">
      {/* Ambient pink/purple gradient backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute -top-28 -left-24 h-[420px] w-[420px] rounded-full bg-pink-600/30 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[460px] w-[460px] rounded-full bg-purple-700/30 blur-[130px]" />
        <div className="absolute -bottom-32 left-1/3 h-[380px] w-[380px] rounded-full bg-fuchsia-600/20 blur-[120px]" />
      </div>

      {/* Minimal Top Brand Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 pt-5 sm:pt-7 flex items-center justify-between">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/25">
            <Heart className="h-4.5 w-4.5 text-white fill-white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            My Next Relationship
          </span>
        </div>

        <span className="text-xs sm:text-sm font-medium text-white/65 whitespace-nowrap shrink-0">
          Live AR Filter
        </span>
      </header>

      {/* Main Responsive Content */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Hero Copy & Primary CTA */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-white [text-wrap:balance]">
              My Next{' '}
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                Relationship
              </span>{' '}
              <span role="img" aria-label="heart">
                ❤️
              </span>
            </h1>

            <p className="mt-4 sm:mt-5 max-w-xl text-base sm:text-lg text-white/80 leading-relaxed">
              Discover who your next relationship might be! Turn on your live
              camera, roll the 7-part prediction filter, and snap a photo to
              share with friends.
            </p>

            {/* Primary Start Camera CTA */}
            <div className="mt-8 sm:mt-9 w-full sm:w-auto flex flex-col items-center lg:items-start gap-4">
              <button
                type="button"
                onClick={onStartCamera}
                className="group relative inline-flex w-full sm:w-auto min-h-[56px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 px-8 py-4 font-display text-lg font-bold text-white transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07050c] animate-cta-glow cursor-pointer whitespace-nowrap"
              >
                <Camera className="h-5 w-5 transition-transform duration-200 group-hover:rotate-[-6deg]" />
                <span>Start Camera</span>
              </button>

              {/* Privacy Notice */}
              <p className="flex items-start sm:items-center gap-2 text-xs sm:text-sm text-white/65 max-w-md text-left">
                <Lock className="h-4 w-4 text-pink-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  Camera access is required for the live preview. Everything runs
                  locally in your browser — no video is ever uploaded or saved.
                </span>
              </p>
            </div>
          </div>

          {/* Interactive Filter Chain Preview Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-sm rounded-3xl bg-white/[0.05] border border-white/12 p-5 sm:p-6 backdrop-blur-xl shadow-2xl shadow-purple-950/50">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="font-display text-base font-bold text-white">
                    Filter Preview
                  </p>
                  <p className="text-xs text-white/60">
                    7 attributes revealed one by one
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleShufflePreview}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-2 text-xs font-semibold text-white transition-colors min-h-[38px] cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-pink-400" />
                  <span>Shuffle</span>
                </button>
              </div>

              <div className="relative pl-1.5">
                <div
                  className="absolute left-[13px] top-3 bottom-3 w-[2.5px] rounded-full bg-gradient-to-b from-pink-400 via-pink-500 to-purple-500"
                  aria-hidden="true"
                />
                <ul className="space-y-2.5">
                  {ATTRIBUTE_SEQUENCE.map((attr) => (
                    <li
                      key={attr.key}
                      className="relative flex items-center gap-3"
                    >
                      <span className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.9)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-3 rounded-xl bg-black/45 border border-pink-400/25 px-3.5 py-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-pink-300 shrink-0">
                          {attr.label}
                        </span>
                        <span className="font-display text-sm font-bold text-white truncate tabular-nums">
                          {sampleCard[attr.key]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 pb-5 text-center sm:text-left text-xs text-white/45">
        <span>Works on mobile &amp; desktop browsers</span>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        <span>Instant photo capture &amp; PNG download</span>
      </footer>
    </div>
  );
}
