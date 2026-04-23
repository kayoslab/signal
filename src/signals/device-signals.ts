export interface DeviceCapabilitySignals {
  screenWidth: number | string;
  screenHeight: number | string;
  devicePixelRatio: number | string;
  hardwareConcurrency: number | string;
  touchSupport: boolean | string;
  storageSupport: {
    localStorage: boolean | string;
    sessionStorage: boolean | string;
    indexedDB: boolean | string;
  };
}

const UNAVAILABLE = 'unavailable';

function collectScreenDimensions(): {
  width: number | string;
  height: number | string;
} {
  if (typeof globalThis.window === 'undefined' || !globalThis.window.screen) {
    return { width: UNAVAILABLE, height: UNAVAILABLE };
  }
  const { width, height } = globalThis.window.screen;
  return {
    width: typeof width === 'number' ? width : UNAVAILABLE,
    height: typeof height === 'number' ? height : UNAVAILABLE,
  };
}

function collectDevicePixelRatio(): number | string {
  if (
    typeof globalThis.window === 'undefined' ||
    typeof globalThis.window.devicePixelRatio !== 'number'
  ) {
    return UNAVAILABLE;
  }
  return globalThis.window.devicePixelRatio;
}

function collectHardwareConcurrency(): number | string {
  if (
    typeof globalThis.navigator === 'undefined' ||
    typeof globalThis.navigator.hardwareConcurrency !== 'number'
  ) {
    return UNAVAILABLE;
  }
  return globalThis.navigator.hardwareConcurrency;
}

function collectTouchSupport(): boolean | string {
  if (typeof globalThis.window === 'undefined') {
    return UNAVAILABLE;
  }

  const hasOntouchstart = 'ontouchstart' in globalThis.window;

  if (
    typeof globalThis.navigator !== 'undefined' &&
    typeof globalThis.navigator.maxTouchPoints === 'number'
  ) {
    return hasOntouchstart || globalThis.navigator.maxTouchPoints > 0;
  }

  if (hasOntouchstart) {
    return true;
  }

  return UNAVAILABLE;
}

function detectStorage(
  accessor: () => unknown
): boolean | string {
  try {
    const storage = accessor();
    return storage ? true : UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}

function collectStorageSupport(): DeviceCapabilitySignals['storageSupport'] {
  if (typeof globalThis.window === 'undefined') {
    return {
      localStorage: UNAVAILABLE,
      sessionStorage: UNAVAILABLE,
      indexedDB: UNAVAILABLE,
    };
  }

  return {
    localStorage: detectStorage(() => globalThis.window.localStorage),
    sessionStorage: detectStorage(() => globalThis.window.sessionStorage),
    indexedDB: detectStorage(() => globalThis.window.indexedDB),
  };
}

export function collectDeviceCapabilitySignals(): DeviceCapabilitySignals {
  const screen = collectScreenDimensions();

  return {
    screenWidth: screen.width,
    screenHeight: screen.height,
    devicePixelRatio: collectDevicePixelRatio(),
    hardwareConcurrency: collectHardwareConcurrency(),
    touchSupport: collectTouchSupport(),
    storageSupport: collectStorageSupport(),
  };
}
