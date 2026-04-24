export interface FontSignals {
  detectedFonts: string[];
  fontCount: number;
}

const UNAVAILABLE_RESULT: FontSignals = { detectedFonts: [], fontCount: 0 };

/**
 * Fonts commonly tested by production fingerprinting libraries.
 * A mix of Windows, macOS, Linux, and cross-platform fonts.
 */
const TEST_FONTS = [
  'Arial',
  'Arial Black',
  'Arial Narrow',
  'Calibri',
  'Cambria',
  'Century Gothic',
  'Comic Sans MS',
  'Consolas',
  'Courier New',
  'Franklin Gothic Medium',
  'Garamond',
  'Georgia',
  'Gill Sans',
  'Helvetica',
  'Helvetica Neue',
  'Impact',
  'Lucida Console',
  'Lucida Sans Unicode',
  'Menlo',
  'Monaco',
  'Optima',
  'Palatino Linotype',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  // CJK and extended
  'MS Gothic',
  'MS PGothic',
  'Meiryo',
  'SimHei',
  'SimSun',
  'Microsoft YaHei',
  // Linux
  'DejaVu Sans',
  'Liberation Sans',
  'Ubuntu',
  'Noto Sans',
  'Cantarell',
  'Droid Sans',
];

const FALLBACK_FONTS = ['monospace', 'sans-serif', 'serif'];
const TEST_STRING = 'mmmmmmmmmmlli';
const TEST_SIZE = '72px';

export function collectFontSignals(): FontSignals {
  try {
    if (typeof document === 'undefined') return UNAVAILABLE_RESULT;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return UNAVAILABLE_RESULT;

    // Measure baseline widths for each fallback
    const baselines = new Map<string, number>();
    for (const fallback of FALLBACK_FONTS) {
      ctx.font = `${TEST_SIZE} ${fallback}`;
      baselines.set(fallback, ctx.measureText(TEST_STRING).width);
    }

    const detected: string[] = [];

    for (const font of TEST_FONTS) {
      let isDetected = false;
      for (const fallback of FALLBACK_FONTS) {
        ctx.font = `${TEST_SIZE} '${font}', ${fallback}`;
        const width = ctx.measureText(TEST_STRING).width;
        if (width !== baselines.get(fallback)) {
          isDetected = true;
          break;
        }
      }
      if (isDetected) {
        detected.push(font);
      }
    }

    return { detectedFonts: detected, fontCount: detected.length };
  } catch {
    return UNAVAILABLE_RESULT;
  }
}
