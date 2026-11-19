import { ATTRIBUTE_SEQUENCE, PredictionResult } from '../data/predictions';

interface CaptureOptions {
  video: HTMLVideoElement;
  containerWidth: number;
  containerHeight: number;
  isMirrored: boolean;
  prediction: PredictionResult | null;
  showOverlay: boolean;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function captureCameraWithOverlay({
  video,
  containerWidth,
  containerHeight,
  isMirrored,
  prediction,
  showOverlay,
}: CaptureOptions): string {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;

  const safeW = Math.max(containerWidth, 320);
  const safeH = Math.max(containerHeight, 480);
  const containerAspect = safeW / safeH;

  // Render at crisp HD resolution matching the live viewfinder aspect ratio
  const maxDim = 1440;
  let canvasW: number;
  let canvasH: number;
  if (containerAspect >= 1) {
    canvasW = maxDim;
    canvasH = Math.round(maxDim / containerAspect);
  } else {
    canvasH = maxDim;
    canvasW = Math.round(maxDim * containerAspect);
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not initialize canvas rendering context.');
  }

  // Compute object-cover crop rectangle from the live video feed
  const videoAspect = vw / vh;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoAspect > containerAspect) {
    sw = vh * containerAspect;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / containerAspect;
    sy = (vh - sh) / 2;
  }

  ctx.save();
  if (isMirrored) {
    ctx.translate(canvasW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
  ctx.restore();

  // Subtle top & bottom gradient scrim for broadcast legibility
  const topScrim = ctx.createLinearGradient(0, 0, 0, canvasH * 0.24);
  topScrim.addColorStop(0, 'rgba(7, 5, 12, 0.55)');
  topScrim.addColorStop(1, 'rgba(7, 5, 12, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, canvasW, canvasH * 0.24);

  const bottomScrim = ctx.createLinearGradient(0, canvasH * 0.78, 0, canvasH);
  bottomScrim.addColorStop(0, 'rgba(7, 5, 12, 0)');
  bottomScrim.addColorStop(1, 'rgba(7, 5, 12, 0.65)');
  ctx.fillStyle = bottomScrim;
  ctx.fillRect(0, canvasH * 0.78, canvasW, canvasH * 0.22);

  if (showOverlay && prediction) {
    const scale = Math.min(canvasW, canvasH) / 720;
    const padX = Math.round(32 * scale);
    const startY = Math.round(canvasH * 0.14);

    // Header badge on canvas
    const badgeText = 'My Next Relationship ❤️';
    ctx.font = `700 ${Math.round(24 * scale)}px "Outfit", sans-serif`;
    const badgeMetrics = ctx.measureText(badgeText);
    const badgeW = badgeMetrics.width + Math.round(36 * scale);
    const badgeH = Math.round(44 * scale);

    ctx.save();
    const badgeGrad = ctx.createLinearGradient(padX, startY - badgeH - 18 * scale, padX + badgeW, startY);
    badgeGrad.addColorStop(0, 'rgba(236, 72, 153, 0.92)');
    badgeGrad.addColorStop(1, 'rgba(147, 51, 234, 0.92)');
    ctx.fillStyle = badgeGrad;
    ctx.shadowColor = 'rgba(236, 72, 153, 0.5)';
    ctx.shadowBlur = 18 * scale;
    drawRoundedRect(ctx, padX, startY - badgeH - Math.round(20 * scale), badgeW, badgeH, 999);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      badgeText,
      padX + Math.round(18 * scale),
      startY - badgeH / 2 - Math.round(20 * scale)
    );

    // Calculate vertical chain geometry
    const availableH = Math.min(canvasH * 0.68, Math.round(680 * scale));
    const rowStep = availableH / ATTRIBUTE_SEQUENCE.length;
    const lineX = padX + Math.round(16 * scale);
    const firstCenterY = startY + rowStep * 0.45;
    const lastCenterY = startY + rowStep * (ATTRIBUTE_SEQUENCE.length - 1 + 0.45);

    // Glowing vertical connecting line
    ctx.save();
    const spineGrad = ctx.createLinearGradient(lineX, firstCenterY, lineX, lastCenterY);
    spineGrad.addColorStop(0, '#f472b6');
    spineGrad.addColorStop(0.5, '#ec4899');
    spineGrad.addColorStop(1, '#a855f7');
    ctx.strokeStyle = spineGrad;
    ctx.lineWidth = Math.max(3, Math.round(4 * scale));
    ctx.shadowColor = 'rgba(236, 72, 153, 0.85)';
    ctx.shadowBlur = 14 * scale;
    ctx.beginPath();
    ctx.moveTo(lineX, firstCenterY);
    ctx.lineTo(lineX, lastCenterY);
    ctx.stroke();
    ctx.restore();

    // Draw each prediction node + card
    ATTRIBUTE_SEQUENCE.forEach((attr, idx) => {
      const cy = startY + rowStep * (idx + 0.45);
      const valueText = prediction[attr.key];

      // Pink circular marker with glow
      ctx.save();
      ctx.shadowColor = 'rgba(236, 72, 153, 0.95)';
      ctx.shadowBlur = 16 * scale;
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(lineX, cy, Math.round(11 * scale), 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lineX, cy, Math.round(4.5 * scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Card sizing
      const cardX = lineX + Math.round(24 * scale);
      const cardH = Math.round(rowStep * 0.78);
      const cardY = cy - cardH / 2;

      ctx.font = `600 ${Math.round(15 * scale)}px "Plus Jakarta Sans", sans-serif`;
      const labelW = ctx.measureText(attr.label.toUpperCase()).width;

      ctx.font = `700 ${Math.round(22 * scale)}px "Outfit", sans-serif`;
      const valW = ctx.measureText(valueText).width;

      const innerPadX = Math.round(18 * scale);
      const cardW = Math.min(
        canvasW - cardX - padX,
        Math.max(labelW, valW) + innerPadX * 2 + Math.round(12 * scale)
      );

      // Card background
      ctx.save();
      ctx.fillStyle = 'rgba(10, 7, 18, 0.76)';
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.5)';
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 16 * scale;
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, Math.round(14 * scale));
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Attribute label
      ctx.save();
      ctx.font = `600 ${Math.round(13 * scale)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#f9a8d4';
      ctx.textBaseline = 'middle';
      ctx.fillText(attr.label.toUpperCase(), cardX + innerPadX, cy - cardH * 0.2);

      // Attribute value
      ctx.font = `700 ${Math.round(22 * scale)}px "Outfit", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(244, 114, 182, 0.7)';
      ctx.shadowBlur = 10 * scale;
      ctx.fillText(valueText, cardX + innerPadX, cy + cardH * 0.17);
      ctx.restore();
    });
  }

  // Subtle corner footer signature
  const footScale = Math.min(canvasW, canvasH) / 720;
  ctx.save();
  ctx.font = `600 ${Math.round(16 * footScale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 6;
  ctx.fillText(
    'My Next Relationship ❤️',
    canvasW - Math.round(28 * footScale),
    canvasH - Math.round(24 * footScale)
  );
  ctx.restore();

  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
