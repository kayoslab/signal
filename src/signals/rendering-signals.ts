export interface RenderingSignals {
  webglSupported: boolean;
  renderer: string;
  vendor: string;
  webglVersion: string;
}

const UNAVAILABLE = 'unavailable';

const UNAVAILABLE_RESULT: RenderingSignals = {
  webglSupported: false,
  renderer: UNAVAILABLE,
  vendor: UNAVAILABLE,
  webglVersion: UNAVAILABLE,
};

function tryWebGLContext(): {
  gl: WebGLRenderingContext;
  version: string;
} | null {
  const canvas = document.createElement('canvas');

  const gl2 = canvas.getContext('webgl2') as WebGLRenderingContext | null;
  if (gl2) return { gl: gl2, version: 'webgl2' };

  const gl1 = canvas.getContext('webgl') as WebGLRenderingContext | null;
  if (gl1) return { gl: gl1, version: 'webgl' };

  return null;
}

function extractRendererInfo(gl: WebGLRenderingContext): {
  renderer: string;
  vendor: string;
} {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (!ext) {
    return { renderer: UNAVAILABLE, vendor: UNAVAILABLE };
  }

  const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
  const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);

  return {
    renderer: typeof renderer === 'string' && renderer !== '' ? renderer : UNAVAILABLE,
    vendor: typeof vendor === 'string' && vendor !== '' ? vendor : UNAVAILABLE,
  };
}

function cleanupContext(gl: WebGLRenderingContext): void {
  try {
    const loseCtx = gl.getExtension('WEBGL_lose_context');
    if (loseCtx) {
      loseCtx.loseContext();
    }
  } catch {
    // Cleanup is best-effort
  }
}

export function collectRenderingSignals(): RenderingSignals {
  try {
    if (typeof document === 'undefined') {
      return { ...UNAVAILABLE_RESULT };
    }

    const ctx = tryWebGLContext();
    if (!ctx) {
      return { ...UNAVAILABLE_RESULT };
    }

    const { gl, version } = ctx;

    let rendererInfo: { renderer: string; vendor: string };
    try {
      rendererInfo = extractRendererInfo(gl);
    } catch {
      rendererInfo = { renderer: UNAVAILABLE, vendor: UNAVAILABLE };
    }

    cleanupContext(gl);

    return {
      webglSupported: true,
      renderer: rendererInfo.renderer,
      vendor: rendererInfo.vendor,
      webglVersion: version,
    };
  } catch {
    return { ...UNAVAILABLE_RESULT };
  }
}
