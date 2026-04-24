export interface SpeechSignals {
  voiceCount: number | string;
  voiceList: string[];
  speechSupported: boolean;
}

const UNAVAILABLE = 'unavailable';

export function collectSpeechSignals(): SpeechSignals {
  const fail: SpeechSignals = {
    voiceCount: UNAVAILABLE,
    voiceList: [],
    speechSupported: false,
  };

  try {
    if (typeof globalThis.speechSynthesis === 'undefined') {
      return fail;
    }

    const voices = globalThis.speechSynthesis.getVoices();

    // getVoices() may return empty on first call in some browsers.
    // We return what's available — the receipt can re-run to pick them up.
    const voiceList = voices.map((v) => `${v.name} (${v.lang})`);

    return {
      voiceCount: voices.length,
      voiceList,
      speechSupported: true,
    };
  } catch {
    return fail;
  }
}
