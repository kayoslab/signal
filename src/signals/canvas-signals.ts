export interface CanvasSignals {
  canvasHash: string;
  canvasSupported: boolean;
}

const UNAVAILABLE = 'unavailable';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function collectCanvasSignals(): CanvasSignals {
  try {
    if (typeof document === 'undefined') {
      return { canvasHash: UNAVAILABLE, canvasSupported: false };
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { canvasHash: UNAVAILABLE, canvasSupported: false };
    }

    // Text rendering — varies by font engine, GPU, anti-aliasing, sub-pixel rendering
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(100, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.font = '11pt Arial';
    ctx.fillText('Cwm fjordbank\u00a0glyphs vext quiz, \ud83d\ude00', 2, 15);

    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.font = '18pt Times New Roman';
    ctx.fillText('Cwm fjordbank\u00a0glyphs vext quiz, \ud83d\ude00', 4, 45);

    // Geometric shapes — exercise path rendering + compositing
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(255,0,255)';
    ctx.beginPath();
    ctx.arc(50, 50, 30, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgb(0,255,255)';
    ctx.beginPath();
    ctx.arc(80, 50, 30, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgb(255,255,0)';
    ctx.beginPath();
    ctx.arc(65, 30, 30, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    const dataUrl = canvas.toDataURL();
    const hash = simpleHash(dataUrl);

    return { canvasHash: hash, canvasSupported: true };
  } catch {
    return { canvasHash: UNAVAILABLE, canvasSupported: false };
  }
}
