import { findVenueLocationOverride } from '../venueLocationOverrides';
import { parseLatLng } from './mapUtils';

export function getEventKey(event = {}) {
  const sourceName = event?.source?.name || '';
  const commonName = event?.source?.commonName || '';
  const date = event?.date || '';
  const title = event?.title || '';
  const url = event?.url || '';

  return [sourceName, commonName, date, title, url].join('||');
}

export function resolveEventCoordinates(event, venuesByName = {}) {
  const venueName = event?.source?.name;
  const venueCommonName = event?.source?.commonName;

  if (!venueName || !venueCommonName) return null;

  const override = findVenueLocationOverride(venueCommonName);
  if (override) return parseLatLng(override[1]);

  const venue = venuesByName[venueName];
  if (!venue?.latlng) return null;

  return parseLatLng(venue.latlng);
}
