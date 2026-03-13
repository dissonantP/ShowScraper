import _ from 'underscore';

export const REGIONS = {
  EAST_BAY: 'East Bay',
  SAN_FRANCISCO: 'San Francisco',
  PACIFICA: 'Pacifica',
  SOUTH_BAY: 'South Bay',
  SANTA_CRUZ: 'Santa Cruz',
  NORTH_BAY: 'North Bay',
  SACRAMENTO: 'Sacramento',
  OTHER: 'Other',
  ////////////////////////////////////////////////////////////////////////////
  // If adding an entry here, make sure to add it to the sorting array below //
  ////////////////////////////////////////////////////////////////////////////
};

export const REGION_SORTING = [
  REGIONS.EAST_BAY,
  REGIONS.SAN_FRANCISCO,
  REGIONS.PACIFICA,
  REGIONS.SOUTH_BAY,
  REGIONS.NORTH_BAY,
  REGIONS.SANTA_CRUZ,
  REGIONS.SACRAMENTO,
  REGIONS.OTHER,
];

export const REGION_FALLBACKS = [
  [REGIONS.EAST_BAY, ['el cerrito', 'hayward','tamarack', 'crockett', 'oakland', 'port costa', 'richmond', 'berkeley', 'alameda', 'vallejo', 'emeryville', 'oakley', 'walnut creek', 'antioch', 'concord', 'lafayette']],
  [REGIONS.PACIFICA, ['pacifica']],
  [REGIONS.SANTA_CRUZ, ['santa cruz', 'santa curz', 'monterey', 'big sur', 'felton']],
  [REGIONS.SAN_FRANCISCO, ['san francisco', 'sf', 's.f.', 'thrillhouse']],
  [REGIONS.SACRAMENTO, ['sacramento', 'brooks']],
  [REGIONS.SOUTH_BAY, ['sunnyvale', 'fremont', 'freemont', 'menlo park', 'redwood city', 'saratoga', 'memlo park', 'palo alto', 'san jose']],
  [REGIONS.NORTH_BAY, ['novato', 'sebastopol', 'mill valley', 'piedmont', 'santa rosa', 'fairfax', 'marin', 'petaluma', 'sonoma', 'napa', 'healdsburg', 'forest knolls']],
];

export const groupByRegion = (events) => {
  const grouped = _.groupBy(events, (event) => {
    let region = event.source.region;
    if (region === REGIONS.OTHER) {
      REGION_FALLBACKS.forEach(([fallbackRegion, regionStrings]) => {
        if (regionStrings.some((str) => event.source.commonName.toLowerCase().includes(str))) {
          region = fallbackRegion;
        }
      });
      if (region === REGIONS.OTHER) {
        console.log(`[Region fallback] Unable to infer region for event: ${event.source.commonName}`);
      }
    }
    return region;
  });

  // Ensure groups are returned in consistent sort order
  return REGION_SORTING.map((region) => [region, grouped[region] || []]);
};
