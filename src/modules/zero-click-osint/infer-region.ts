interface RegionResult {
  region: string;
  confidence: 'low';
}

const REGION_MAP: Record<string, string> = {
  America: 'Americas',
  Europe: 'Europe',
  Asia: 'Asia',
  Pacific: 'Pacific',
  Australia: 'Australia',
  Africa: 'Africa',
  Indian: 'Indian Ocean',
  Atlantic: 'Atlantic',
  Antarctica: 'Antarctica',
  Arctic: 'Arctic',
};

export function inferRegion(timezone: string): RegionResult {
  const prefix = timezone.split('/')[0];
  const region = REGION_MAP[prefix];

  if (region) {
    return { region: `${region} [Heuristic]`, confidence: 'low' };
  }

  return { region: 'Undetermined [Heuristic]', confidence: 'low' };
}
