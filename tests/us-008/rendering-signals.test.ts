import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  collectRenderingSignals,
  type RenderingSignals,
} from '../../src/signals/rendering-signals';

// ---------------------------------------------------------------------------
// Helpers to build mock WebGL chains
// ---------------------------------------------------------------------------

interface MockGLContext {
  getExtension: ReturnType<typeof vi.fn>;
  getParameter: ReturnType<typeof vi.fn>;
}

function createMockGLContext(options: {
  hasDebugExt?: boolean;
  renderer?: string;
  vendor?: string;
} = {}): MockGLContext {
  const { hasDebugExt = true, renderer = 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)', vendor = 'Google Inc. (Apple)' } = options;

  const debugExt = hasDebugExt
    ? { UNMASKED_RENDERER_WEBGL: 0x9246, UNMASKED_VENDOR_WEBGL: 0x9245 }
    : null;

  const gl: MockGLContext = {
    getExtension: vi.fn((name: string) => {
      if (name === 'WEBGL_debug_renderer_info') return debugExt;
      if (name === 'WEBGL_lose_context') return { loseContext: vi.fn() };
      return null;
    }),
    getParameter: vi.fn((param: number) => {
      if (param === 0x9246) return renderer;
      if (param === 0x9245) return vendor;
      return null;
    }),
  };

  return gl;
}

function stubCanvasWithContext(
  contextType: 'webgl2' | 'webgl' | null,
  gl: MockGLContext | null = null
) {
  const mockCanvas = {
    getContext: vi.fn((type: string) => {
      if (contextType && type === contextType) return gl;
      if (contextType === 'webgl' && type === 'webgl2') return null;
      return null;
    }),
  };

  vi.stubGlobal('document', {
    createElement: vi.fn((tag: string) => {
      if (tag === 'canvas') return mockCanvas;
      return {};
    }),
  });

  return mockCanvas;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('US-008: collectRenderingSignals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // -----------------------------------------------------------------------
  // Return shape and required fields
  // -----------------------------------------------------------------------
  describe('return shape and required fields', () => {
    it('returns an object with all required keys', () => {
      const signals = collectRenderingSignals();

      expect(signals).toHaveProperty('webglSupported');
      expect(signals).toHaveProperty('renderer');
      expect(signals).toHaveProperty('vendor');
      expect(signals).toHaveProperty('webglVersion');
    });

    it('returns no extra top-level keys beyond the interface', () => {
      const signals = collectRenderingSignals();
      const expectedKeys = [
        'webglSupported',
        'renderer',
        'vendor',
        'webglVersion',
      ];

      expect(Object.keys(signals).sort()).toEqual(expectedKeys.sort());
    });
  });

  // -----------------------------------------------------------------------
  // Happy path: WebGL2 with debug extension
  // -----------------------------------------------------------------------
  describe('WebGL2 available with debug renderer info', () => {
    it('populates all fields with real values', () => {
      const gl = createMockGLContext({
        renderer: 'ANGLE (Apple, Apple M1 Pro)',
        vendor: 'Google Inc. (Apple)',
      });
      stubCanvasWithContext('webgl2', gl);

      const signals = collectRenderingSignals();

      expect(signals.webglSupported).toBe(true);
      expect(signals.renderer).toBe('ANGLE (Apple, Apple M1 Pro)');
      expect(signals.vendor).toBe('Google Inc. (Apple)');
      expect(signals.webglVersion).toBe('webgl2');
    });
  });

  // -----------------------------------------------------------------------
  // Fallback to WebGL1 when WebGL2 unavailable
  // -----------------------------------------------------------------------
  describe('WebGL2 unavailable, fallback to WebGL1', () => {
    it('falls back to webgl context and still collects renderer', () => {
      const gl = createMockGLContext({
        renderer: 'Mesa Intel UHD 630',
        vendor: 'Intel Inc.',
      });
      stubCanvasWithContext('webgl', gl);

      const signals = collectRenderingSignals();

      expect(signals.webglSupported).toBe(true);
      expect(signals.renderer).toBe('Mesa Intel UHD 630');
      expect(signals.vendor).toBe('Intel Inc.');
      expect(signals.webglVersion).toBe('webgl');
    });
  });

  // -----------------------------------------------------------------------
  // Both WebGL2 and WebGL1 unavailable
  // -----------------------------------------------------------------------
  describe('WebGL completely unsupported', () => {
    it('returns all fields as unavailable when no context is obtainable', () => {
      stubCanvasWithContext(null, null);

      const signals = collectRenderingSignals();

      expect(signals.webglSupported).toBe(false);
      expect(signals.renderer).toBe('unavailable');
      expect(signals.vendor).toBe('unavailable');
      expect(signals.webglVersion).toBe('unavailable');
    });
  });

  // -----------------------------------------------------------------------
  // Debug extension returns null (renderer/vendor unavailable)
  // -----------------------------------------------------------------------
  describe('debug extension unavailable', () => {
    it('returns unavailable renderer/vendor but webglSupported is true', () => {
      const gl = createMockGLContext({ hasDebugExt: false });
      stubCanvasWithContext('webgl2', gl);

      const signals = collectRenderingSignals();

      expect(signals.webglSupported).toBe(true);
      expect(signals.renderer).toBe('unavailable');
      expect(signals.vendor).toBe('unavailable');
      expect(signals.webglVersion).toBe('webgl2');
    });
  });

  // -----------------------------------------------------------------------
  // getContext throws SecurityError (privacy-hardened browser)
  // -----------------------------------------------------------------------
  describe('getContext throws SecurityError', () => {
    it('returns all fallback values without throwing', () => {
      vi.stubGlobal('document', {
        createElement: vi.fn(() => ({
          getContext: vi.fn(() => {
            throw new DOMException(
              'WebGL has been disabled',
              'SecurityError'
            );
          }),
        })),
      });

      const signals = collectRenderingSignals();

      expect(signals.webglSupported).toBe(false);
      expect(signals.renderer).toBe('unavailable');
      expect(signals.vendor).toBe('unavailable');
      expect(signals.webglVersion).toBe('unavailable');
    });
  });

  // -----------------------------------------------------------------------
  // document.createElement throws (no DOM environment)
  // -----------------------------------------------------------------------
  describe('document.createElement throws', () => {
    it('returns full unavailable result', () => {
      vi.stubGlobal('document', {
        createElement: vi.fn(() => {
          throw new Error('document is not defined');
        }),
      });

      const signals = collectRenderingSignals();

      expect(signals.webglSupported).toBe(false);
      expect(signals.renderer).toBe('unavailable');
      expect(signals.vendor).toBe('unavailable');
      expect(signals.webglVersion).toBe('unavailable');
    });
  });

  // -----------------------------------------------------------------------
  // document is undefined entirely
  // -----------------------------------------------------------------------
  describe('document is undefined', () => {
    it('returns full unavailable result when document does not exist', () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error -- intentionally removing document for test
      delete globalThis.document;

      const signals = collectRenderingSignals();

      expect(signals.webglSupported).toBe(false);
      expect(signals.renderer).toBe('unavailable');
      expect(signals.vendor).toBe('unavailable');
      expect(signals.webglVersion).toBe('unavailable');

      globalThis.document = originalDocument;
    });
  });

  // -----------------------------------------------------------------------
  // Renderer/vendor return empty strings
  // -----------------------------------------------------------------------
  describe('renderer and vendor return empty strings', () => {
    it('treats empty strings as unavailable', () => {
      const gl = createMockGLContext({ renderer: '', vendor: '' });
      stubCanvasWithContext('webgl2', gl);

      const signals = collectRenderingSignals();

      expect(signals.webglSupported).toBe(true);
      expect(signals.renderer).toBe('unavailable');
      expect(signals.vendor).toBe('unavailable');
    });
  });

  // -----------------------------------------------------------------------
  // WebGL context cleanup
  // -----------------------------------------------------------------------
  describe('WebGL context cleanup', () => {
    it('calls WEBGL_lose_context to clean up resources', () => {
      const loseContextFn = vi.fn();
      const gl: MockGLContext = {
        getExtension: vi.fn((name: string) => {
          if (name === 'WEBGL_debug_renderer_info') {
            return {
              UNMASKED_RENDERER_WEBGL: 0x9246,
              UNMASKED_VENDOR_WEBGL: 0x9245,
            };
          }
          if (name === 'WEBGL_lose_context') {
            return { loseContext: loseContextFn };
          }
          return null;
        }),
        getParameter: vi.fn(() => 'some value'),
      };
      stubCanvasWithContext('webgl2', gl);

      collectRenderingSignals();

      expect(loseContextFn).toHaveBeenCalledOnce();
    });

    it('does not throw when WEBGL_lose_context extension is unavailable', () => {
      const gl: MockGLContext = {
        getExtension: vi.fn((name: string) => {
          if (name === 'WEBGL_debug_renderer_info') {
            return {
              UNMASKED_RENDERER_WEBGL: 0x9246,
              UNMASKED_VENDOR_WEBGL: 0x9245,
            };
          }
          return null; // WEBGL_lose_context not available
        }),
        getParameter: vi.fn(() => 'some renderer'),
      };
      stubCanvasWithContext('webgl2', gl);

      expect(() => collectRenderingSignals()).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // No uncaught runtime errors
  // -----------------------------------------------------------------------
  describe('does not throw', () => {
    it('never throws regardless of environment', () => {
      expect(() => collectRenderingSignals()).not.toThrow();
    });

    it('does not throw when getParameter throws', () => {
      const gl: MockGLContext = {
        getExtension: vi.fn((name: string) => {
          if (name === 'WEBGL_debug_renderer_info') {
            return {
              UNMASKED_RENDERER_WEBGL: 0x9246,
              UNMASKED_VENDOR_WEBGL: 0x9245,
            };
          }
          if (name === 'WEBGL_lose_context') {
            return { loseContext: vi.fn() };
          }
          return null;
        }),
        getParameter: vi.fn(() => {
          throw new Error('getParameter failed');
        }),
      };
      stubCanvasWithContext('webgl2', gl);

      expect(() => collectRenderingSignals()).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Type correctness
  // -----------------------------------------------------------------------
  describe('type correctness', () => {
    it('each field is either the expected type or the fallback string', () => {
      const signals = collectRenderingSignals();

      const isBooleanOrString = (v: unknown) =>
        typeof v === 'boolean' || typeof v === 'string';
      const isString = (v: unknown) => typeof v === 'string';

      expect(isBooleanOrString(signals.webglSupported)).toBe(true);
      expect(isString(signals.renderer)).toBe(true);
      expect(isString(signals.vendor)).toBe(true);
      expect(isString(signals.webglVersion)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Interface type export
  // -----------------------------------------------------------------------
  describe('interface type export', () => {
    it('RenderingSignals type is importable', () => {
      // This test validates at compile time that the type is exported.
      // If RenderingSignals is not exported, this file will not compile.
      const typeCheck: RenderingSignals = collectRenderingSignals();
      expect(typeCheck).toBeDefined();
    });
  });
});
