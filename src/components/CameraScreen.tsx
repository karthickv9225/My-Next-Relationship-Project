import {
  AlertCircle,
  Camera,
  Download,
  Heart,
  Play,
  RotateCcw,
  Square,
  SwitchCamera,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ATTRIBUTE_SEQUENCE,
  FilterPhase,
  generateFinalPrediction,
  getRandomRollingValue,
  PredictionResult,
  SAMPLE_PREVIEW_PREDICTION,
} from '../data/predictions';
import { captureCameraWithOverlay, downloadDataUrl } from '../utils/canvasCapture';
import { FilterOverlay } from './FilterOverlay';

interface CameraScreenProps {
  onClose: () => void;
}

type CameraStatus = 'initializing' | 'ready' | 'denied' | 'unavailable' | 'error';

const LOCK_TIMESTAMPS_MS = [1800, 2500, 3200, 3900, 4600, 5300, 6000];

export function CameraScreen({ onClose }: CameraScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewfinderRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rollIntervalRef = useRef<number | null>(null);
  const lockTimeoutsRef = useRef<number[]>([]);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [switchNotice, setSwitchNotice] = useState<string | null>(null);

  const [filterPhase, setFilterPhase] = useState<FilterPhase>('idle');
  const [lockedCount, setLockedCount] = useState<number>(0);
  const [finalPrediction, setFinalPrediction] = useState<PredictionResult>(
    SAMPLE_PREVIEW_PREDICTION
  );
  const [displayValues, setDisplayValues] = useState<PredictionResult>(
    SAMPLE_PREVIEW_PREDICTION
  );

  const [shutterFlashing, setShutterFlashing] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  const clearFilterTimers = useCallback(() => {
    if (rollIntervalRef.current !== null) {
      window.clearInterval(rollIntervalRef.current);
      rollIntervalRef.current = null;
    }
    lockTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    lockTimeoutsRef.current = [];
  }, []);

  const stopMediaStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (requestedMode: 'user' | 'environment', isCancelled?: () => boolean) => {
      setCameraStatus('initializing');
      setErrorMessage('');
      setSwitchNotice(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus('unavailable');
        setErrorMessage(
          'Your browser does not support live camera access via MediaDevices API.'
        );
        return;
      }

      stopMediaStream();

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: requestedMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (firstErr) {
          // Fallback if device refuses facingMode constraints
          const errName = firstErr instanceof DOMException ? firstErr.name : '';
          if (errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError') {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } else {
            throw firstErr;
          }
        }

        if (isCancelled?.()) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
            // Autoplay with muted+playsInline succeeds on modern browsers
          });
        }

        if (isCancelled?.()) {
          stopMediaStream();
          return;
        }

        setCameraStatus('ready');
      } catch (err) {
        if (isCancelled?.()) return;

        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraStatus('denied');
          setErrorMessage(
            'Camera permission was denied. Please allow camera access in your browser settings and try again.'
          );
        } else if (
          name === 'NotFoundError' ||
          name === 'DevicesNotFoundError'
        ) {
          setCameraStatus('unavailable');
          setErrorMessage(
            'No camera was found on this device. Connect a webcam or try on a smartphone.'
          );
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setCameraStatus('unavailable');
          setErrorMessage(
            'Your camera is currently in use by another app or browser tab.'
          );
        } else {
          setCameraStatus('error');
          setErrorMessage(
            'Unable to start the camera. Check your browser permissions or HTTPS connection.'
          );
        }
      }
    },
    [stopMediaStream]
  );

  useEffect(() => {
    let cancelled = false;
    startCamera(facingMode, () => cancelled);

    return () => {
      cancelled = true;
      clearFilterTimers();
      stopMediaStream();
    };
  }, [facingMode, startCamera, clearFilterTimers, stopMediaStream]);

  const handleCloseCamera = () => {
    clearFilterTimers();
    stopMediaStream();
    onClose();
  };

  const handleSwitchCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';

    // Check available video inputs to provide helpful feedback on single-cam desktops
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        if (videoInputs.length <= 1) {
          setSwitchNotice('Only one camera detected on this device');
          window.setTimeout(() => setSwitchNotice(null), 2600);
          return;
        }
      }
    } catch {
      // Proceed with facingMode switch attempt
    }

    setFacingMode(nextMode);
  };

  const startFilterRoll = useCallback(() => {
    clearFilterTimers();

    const target = generateFinalPrediction();
    setFinalPrediction(target);
    setLockedCount(0);
    setFilterPhase('rolling');
    setCapturedPhotoUrl(null);

    // Seed initial rolling values immediately
    setDisplayValues({
      gender: getRandomRollingValue('gender'),
      age: getRandomRollingValue('age'),
      height: getRandomRollingValue('height'),
      name: getRandomRollingValue('name'),
      personality: getRandomRollingValue('personality'),
      hobby: getRandomRollingValue('hobby'),
      profession: getRandomRollingValue('profession'),
    });

    let currentLocked = 0;

    // Rapid slot-machine rolling loop (~13fps text updates, GPU-friendly)
    rollIntervalRef.current = window.setInterval(() => {
      setDisplayValues((prev) => {
        const next: PredictionResult = { ...prev };
        ATTRIBUTE_SEQUENCE.forEach((attr, idx) => {
          if (idx < currentLocked) {
            next[attr.key] = target[attr.key];
          } else {
            next[attr.key] = getRandomRollingValue(attr.key);
          }
        });
        return next;
      });
    }, 75);

    // Sequential lock-in from Gender -> Profession over 6 seconds
    LOCK_TIMESTAMPS_MS.forEach((delay, idx) => {
      const timeoutId = window.setTimeout(() => {
        currentLocked = idx + 1;
        setLockedCount(currentLocked);
        setDisplayValues((prev) => ({
          ...prev,
          [ATTRIBUTE_SEQUENCE[idx].key]: target[ATTRIBUTE_SEQUENCE[idx].key],
        }));

        if (idx === ATTRIBUTE_SEQUENCE.length - 1) {
          if (rollIntervalRef.current !== null) {
            window.clearInterval(rollIntervalRef.current);
            rollIntervalRef.current = null;
          }
          setFilterPhase('revealed');
        }
      }, delay);

      lockTimeoutsRef.current.push(timeoutId);
    });
  }, [clearFilterTimers]);

  const handleStopFilter = () => {
    clearFilterTimers();
    setFilterPhase('idle');
    setLockedCount(0);
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    const container = viewfinderRef.current;
    if (!video || !container || cameraStatus !== 'ready') return;

    setShutterFlashing(true);
    window.setTimeout(() => setShutterFlashing(false), 320);

    try {
      const rect = container.getBoundingClientRect();
      const dataUrl = captureCameraWithOverlay({
        video,
        containerWidth: rect.width,
        containerHeight: rect.height,
        isMirrored: facingMode === 'user',
        prediction:
          filterPhase === 'idle'
            ? null
            : filterPhase === 'revealed'
              ? finalPrediction
              : displayValues,
        showOverlay: filterPhase !== 'idle',
      });
      setCapturedPhotoUrl(dataUrl);
    } catch {
      setSwitchNotice('Could not capture photo from video stream');
      window.setTimeout(() => setSwitchNotice(null), 2600);
    }
  };

  const handleDownloadPhoto = () => {
    if (!capturedPhotoUrl) return;
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    downloadDataUrl(capturedPhotoUrl, `my-next-relationship-${timestamp}.png`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden select-none">
      {/* Live Camera Viewfinder */}
      <div
        ref={viewfinderRef}
        className="relative flex-1 w-full h-full overflow-hidden bg-[#0a0612]"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 ${
            facingMode === 'user' ? '-scale-x-100' : 'scale-x-100'
          } ${cameraStatus === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Subtle Top & Bottom Scrims for UI Readability */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/30 to-transparent z-10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 via-black/45 to-transparent z-10"
          aria-hidden="true"
        />

        {/* Shutter Flash Overlay */}
        {shutterFlashing && (
          <div
            className="pointer-events-none absolute inset-0 z-40 bg-white animate-shutter-flash"
            aria-hidden="true"
          />
        )}

        {/* Top Camera Controls */}
        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5">
          <button
            type="button"
            onClick={handleCloseCamera}
            aria-label="Close camera"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] gap-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 px-3 sm:px-4 text-sm font-semibold text-white backdrop-blur-md transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
            <span className="hidden sm:inline">Close</span>
          </button>

          <div className="flex items-center gap-1.5 text-sm font-display font-bold text-white/95 drop-shadow">
            <Heart className="h-4 w-4 text-pink-400 fill-pink-400" />
            <span>My Next Relationship</span>
          </div>

          <button
            type="button"
            onClick={handleSwitchCamera}
            disabled={cameraStatus !== 'ready'}
            aria-label="Switch camera"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] gap-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-45 border border-white/15 px-3 sm:px-4 text-sm font-semibold text-white backdrop-blur-md transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <SwitchCamera className="h-5 w-5 text-pink-300" />
            <span className="hidden sm:inline">Switch</span>
          </button>
        </header>

        {/* Temporary Switch Notice Toast */}
        {switchNotice && (
          <div className="pointer-events-none absolute top-18 inset-x-0 z-30 flex justify-center px-4">
            <div className="rounded-full bg-black/80 border border-white/20 px-4 py-2 text-xs font-medium text-white backdrop-blur-md shadow-lg">
              {switchNotice}
            </div>
          </div>
        )}

        {/* Relationship Prediction Overlay */}
        {cameraStatus === 'ready' && (
          <FilterOverlay
            phase={filterPhase}
            displayValues={displayValues}
            lockedCount={lockedCount}
          />
        )}

        {/* Idle Prompt Hint */}
        {cameraStatus === 'ready' && filterPhase === 'idle' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-32 z-20 flex justify-center px-4">
            <p className="rounded-full bg-black/55 border border-white/15 px-4 py-2 text-xs sm:text-sm font-medium text-white/90 backdrop-blur-md text-center">
              Frame your face and tap <strong className="text-pink-300">Start Filter</strong> to predict your match
            </p>
          </div>
        )}

        {/* Initializing / Error / Permission States */}
        {cameraStatus !== 'ready' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-[#07050c]/95">
            {cameraStatus === 'initializing' ? (
              <div className="flex flex-col items-center text-center max-w-xs">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-400/30">
                  <Camera className="h-8 w-8 text-pink-400 animate-pulse" />
                </div>
                <h2 className="font-display text-xl font-bold text-white">
                  Starting Camera
                </h2>
                <p className="mt-2 text-sm text-white/70">
                  Please allow camera access if your browser prompts you.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-sm rounded-3xl bg-white/[0.06] border border-white/15 p-6 text-center backdrop-blur-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/20 border border-pink-400/35">
                  <AlertCircle className="h-7 w-7 text-pink-400" />
                </div>
                <h2 className="font-display text-xl font-bold text-white">
                  {cameraStatus === 'denied'
                    ? 'Camera Permission Denied'
                    : 'Camera Unavailable'}
                </h2>
                <p className="mt-2.5 text-sm text-white/75 leading-relaxed">
                  {errorMessage}
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="flex-1 min-h-[46px] rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 font-display text-sm font-bold text-white hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseCamera}
                    className="flex-1 min-h-[46px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-5 py-2.5 font-display text-sm font-semibold text-white transition-colors cursor-pointer"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Thumb-Zone Control Bar */}
        {cameraStatus === 'ready' && !capturedPhotoUrl && (
          <div className="absolute inset-x-0 bottom-0 z-30 px-4 sm:px-8 pb-6 sm:pb-8 pt-3 flex items-center justify-center">
            <div className="flex items-center justify-center gap-3 sm:gap-4 w-full max-w-lg">
              {filterPhase === 'idle' && (
                <>
                  <button
                    type="button"
                    onClick={startFilterRoll}
                    className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 px-6 py-3 font-display text-sm sm:text-base font-bold text-white shadow-[0_0_24px_rgba(236,72,153,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer whitespace-nowrap"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Start Filter</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    aria-label="Capture photo"
                    title="Capture Photo"
                    className="group relative flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full border-4 border-white bg-white/15 backdrop-blur-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  >
                    <span className="h-11 w-11 rounded-full bg-white group-hover:bg-pink-100 transition-colors flex items-center justify-center">
                      <Camera className="h-5 w-5 text-black" />
                    </span>
                  </button>
                </>
              )}

              {filterPhase === 'rolling' && (
                <>
                  <button
                    type="button"
                    onClick={handleStopFilter}
                    className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-black/75 hover:bg-black/90 border border-pink-400/50 px-6 py-3 font-display text-sm sm:text-base font-bold text-white backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Square className="h-4 w-4 fill-pink-400 text-pink-400" />
                    <span>Stop Filter</span>
                  </button>

                  <div className="rounded-full bg-black/60 border border-white/15 px-4 py-2.5 text-xs sm:text-sm font-medium text-pink-200 backdrop-blur-md whitespace-nowrap">
                    Predicting ({lockedCount}/7)...
                  </div>
                </>
              )}

              {filterPhase === 'revealed' && (
                <>
                  <button
                    type="button"
                    onClick={startFilterRoll}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 font-display text-sm font-bold text-white shadow-[0_0_20px_rgba(236,72,153,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Try Again</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    aria-label="Capture photo"
                    title="Capture Photo"
                    className="group relative flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full border-4 border-pink-400 bg-white/20 shadow-[0_0_24px_rgba(236,72,153,0.6)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  >
                    <span className="h-12 w-12 rounded-full bg-white flex items-center justify-center">
                      <Camera className="h-5 w-5 text-pink-600" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStopFilter}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 px-4 py-2.5 font-display text-sm font-semibold text-white backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    <span>Stop Filter</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Captured Photo Preview & Download Modal */}
      {capturedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Captured relationship prediction photo"
        >
          <div className="w-full max-w-xl flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">
              Your Prediction Snap
            </h2>
            <button
              type="button"
              onClick={() => setCapturedPhotoUrl(null)}
              aria-label="Back to camera"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="my-3 flex-1 w-full max-w-xl min-h-0 flex items-center justify-center">
            <img
              src={capturedPhotoUrl}
              alt="Captured camera photo with relationship prediction overlay"
              className="max-h-full max-w-full rounded-2xl border border-pink-400/35 shadow-2xl object-contain"
            />
          </div>

          <div className="w-full max-w-xl flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPhoto}
              className="w-full sm:flex-1 min-h-[50px] inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-display text-base font-bold text-white shadow-[0_0_24px_rgba(236,72,153,0.45)] hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="h-5 w-5" />
              <span>Download Photo</span>
            </button>

            <button
              type="button"
              onClick={startFilterRoll}
              className="w-full sm:w-auto min-h-[50px] inline-flex items-center justify-center gap-2 rounded-2xl bg-white/12 hover:bg-white/20 border border-white/15 px-6 py-3 font-display text-base font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4 text-pink-300" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
