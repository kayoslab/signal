export interface MediaSignals {
  audioInputCount: number | string;
  audioOutputCount: number | string;
  videoInputCount: number | string;
  totalDeviceCount: number | string;
}

const UNAVAILABLE = 'unavailable';

export async function collectMediaSignals(): Promise<MediaSignals> {
  const fail: MediaSignals = {
    audioInputCount: UNAVAILABLE,
    audioOutputCount: UNAVAILABLE,
    videoInputCount: UNAVAILABLE,
    totalDeviceCount: UNAVAILABLE,
  };

  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.enumerateDevices !== 'function'
    ) {
      return fail;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();

    let audioIn = 0;
    let audioOut = 0;
    let videoIn = 0;

    for (const device of devices) {
      switch (device.kind) {
        case 'audioinput':
          audioIn++;
          break;
        case 'audiooutput':
          audioOut++;
          break;
        case 'videoinput':
          videoIn++;
          break;
      }
    }

    return {
      audioInputCount: audioIn,
      audioOutputCount: audioOut,
      videoInputCount: videoIn,
      totalDeviceCount: devices.length,
    };
  } catch {
    return fail;
  }
}
