import venueLocationOverrides from './venueLocationOverrides.json';
import { findVenueLocationOverrideIn } from './venueLocationOverrideMatcher.mjs';

export const VENUE_LOCATION_OVERRIDES = venueLocationOverrides;

export const findVenueLocationOverride = (venueCommonName = '') =>
  findVenueLocationOverrideIn(VENUE_LOCATION_OVERRIDES, venueCommonName);
