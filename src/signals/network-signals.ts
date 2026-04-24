export interface NetworkSignals {
  effectiveType: string;
  downlink: number | string;
  rtt: number | string;
  saveData: boolean | string;
}

const UNAVAILABLE = 'unavailable';

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export function collectNetworkSignals(): NetworkSignals {
  const fail: NetworkSignals = {
    effectiveType: UNAVAILABLE,
    downlink: UNAVAILABLE,
    rtt: UNAVAILABLE,
    saveData: UNAVAILABLE,
  };

  try {
    const nav = globalThis.navigator as { connection?: NetworkInformation };
    const conn = nav?.connection;
    if (!conn) return fail;

    return {
      effectiveType: typeof conn.effectiveType === 'string' ? conn.effectiveType : UNAVAILABLE,
      downlink: typeof conn.downlink === 'number' ? conn.downlink : UNAVAILABLE,
      rtt: typeof conn.rtt === 'number' ? conn.rtt : UNAVAILABLE,
      saveData: typeof conn.saveData === 'boolean' ? conn.saveData : UNAVAILABLE,
    };
  } catch {
    return fail;
  }
}
