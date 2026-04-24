export interface WebGLParamSignals {
  maxTextureSize: number | string;
  maxRenderbufferSize: number | string;
  maxViewportDims: string;
  maxVertexAttribs: number | string;
  maxVertexUniformVectors: number | string;
  maxFragmentUniformVectors: number | string;
  maxVaryingVectors: number | string;
  maxCubeMapTextureSize: number | string;
  aliasedLineWidthRange: string;
  aliasedPointSizeRange: string;
  shadingLanguageVersion: string;
  extensionCount: number | string;
  extensions: string[];
}

const UNAVAILABLE = 'unavailable';

function formatRange(range: Float32Array | null): string {
  if (!range || range.length < 2) return UNAVAILABLE;
  return `${range[0]}-${range[1]}`;
}

function formatDims(dims: Int32Array | null): string {
  if (!dims || dims.length < 2) return UNAVAILABLE;
  return `${dims[0]}x${dims[1]}`;
}

export function collectWebGLParamSignals(): WebGLParamSignals {
  const fail: WebGLParamSignals = {
    maxTextureSize: UNAVAILABLE,
    maxRenderbufferSize: UNAVAILABLE,
    maxViewportDims: UNAVAILABLE,
    maxVertexAttribs: UNAVAILABLE,
    maxVertexUniformVectors: UNAVAILABLE,
    maxFragmentUniformVectors: UNAVAILABLE,
    maxVaryingVectors: UNAVAILABLE,
    maxCubeMapTextureSize: UNAVAILABLE,
    aliasedLineWidthRange: UNAVAILABLE,
    aliasedPointSizeRange: UNAVAILABLE,
    shadingLanguageVersion: UNAVAILABLE,
    extensionCount: UNAVAILABLE,
    extensions: [],
  };

  try {
    if (typeof document === 'undefined') return fail;

    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGLRenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return fail;

    const exts = gl.getSupportedExtensions() ?? [];

    const slv = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);

    const result: WebGLParamSignals = {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) ?? UNAVAILABLE,
      maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) ?? UNAVAILABLE,
      maxViewportDims: formatDims(gl.getParameter(gl.MAX_VIEWPORT_DIMS)),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) ?? UNAVAILABLE,
      maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) ?? UNAVAILABLE,
      maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) ?? UNAVAILABLE,
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS) ?? UNAVAILABLE,
      maxCubeMapTextureSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE) ?? UNAVAILABLE,
      aliasedLineWidthRange: formatRange(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)),
      aliasedPointSizeRange: formatRange(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)),
      shadingLanguageVersion: typeof slv === 'string' ? slv : UNAVAILABLE,
      extensionCount: exts.length,
      extensions: exts,
    };

    // Cleanup
    try {
      const loseCtx = gl.getExtension('WEBGL_lose_context');
      if (loseCtx) loseCtx.loseContext();
    } catch { /* best-effort */ }

    return result;
  } catch {
    return fail;
  }
}
