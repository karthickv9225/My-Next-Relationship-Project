import { useState } from 'react';
import { CameraScreen } from './components/CameraScreen';
import { LandingScreen } from './components/LandingScreen';

export default function App() {
  const [cameraActive, setCameraActive] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-[#07050c] text-white">
      {cameraActive ? (
        <CameraScreen onClose={() => setCameraActive(false)} />
      ) : (
        <LandingScreen onStartCamera={() => setCameraActive(true)} />
      )}
    </div>
  );
}
