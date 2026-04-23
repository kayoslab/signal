export interface LocaleSignals {
  timezone: string;
  languages: readonly string[];
  platform: string;
  doNotTrack: string;
}

export function collectLocaleSignals(): LocaleSignals {
  let timezone: string;
  try {
    const tz = Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone;
    timezone = typeof tz === 'string' && tz.length > 0 ? tz : 'unknown';
  } catch {
    timezone = 'unknown';
  }

  let languages: readonly string[];
  try {
    const navLangs =
      (globalThis as unknown as { navigator?: { languages?: readonly string[]; language?: string } })
        .navigator?.languages ?? ([] as string[]);
    const langArr =
      navLangs.length > 0
        ? navLangs
        : (() => {
            const single = (
              globalThis as unknown as { navigator?: { language?: string } }
            ).navigator?.language;
            return single ? [single] : [];
          })();
    languages = langArr.length > 0 ? Object.freeze([...langArr]) : Object.freeze(['unknown']);
  } catch {
    languages = Object.freeze(['unknown']);
  }

  let platform: string;
  try {
    const navPlatform = (
      globalThis as unknown as { navigator?: { platform?: string } }
    ).navigator?.platform;
    platform =
      typeof navPlatform === 'string' && navPlatform.length > 0
        ? navPlatform
        : 'unknown';
  } catch {
    platform = 'unknown';
  }

  let doNotTrack: string;
  try {
    const dnt =
      (globalThis as unknown as { navigator?: { doNotTrack?: string | null } })
        .navigator?.doNotTrack ??
      (globalThis as unknown as { doNotTrack?: string | null }).doNotTrack ??
      null;
    doNotTrack = typeof dnt === 'string' ? dnt : 'unknown';
  } catch {
    doNotTrack = 'unknown';
  }

  return { timezone, languages, platform, doNotTrack };
}
