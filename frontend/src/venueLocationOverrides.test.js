import venueLocationOverrides from './venueLocationOverrides.json';
import {
  VENUE_LOCATION_OVERRIDES,
  findVenueLocationOverride,
} from './venueLocationOverrides';

describe('venue location overrides', () => {
  test('exports the canonical JSON data without changing it', () => {
    expect(VENUE_LOCATION_OVERRIDES).toBe(venueLocationOverrides);
    expect(VENUE_LOCATION_OVERRIDES).toHaveLength(117);
  });

  test('matches every string group case-insensitively by substring', () => {
    expect(findVenueLocationOverride('The Back Room, Berkeley')).toEqual([
      ['BACK', 'ROOM', 'BERKELEY'],
      '37.873894976273284, -122.27235434474908',
    ]);
    expect(findVenueLocationOverride('Back Room, Oakland')).toBeUndefined();
  });

  test('matches any alias within an array group', () => {
    expect(findVenueLocationOverride('Amoeba Music, San Francisco')).toEqual([
      ['AMOEBA', ['SF', 'S.F.', 'SAN FRANCISCO']],
      '37.77502898247423, -122.45266779795483',
    ]);
  });

  test('returns the first matching override', () => {
    expect(findVenueLocationOverride('924 Gilman Brewing')).toBe(
      VENUE_LOCATION_OVERRIDES[0]
    );
  });
});
