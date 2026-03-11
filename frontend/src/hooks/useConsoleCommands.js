import { useEffect } from 'react';
import { resolveEventCoordinates } from '../utils/eventLocationUtils';

// Standalone helper for reuse/testing.
const listMissingVenues = (venues = [], allEvents = {}) => {
  const venueMap = {};
  venues.forEach((venue) => { venueMap[venue.name] = venue; });

  const missingVenueNames = new Set();
  Object.values(allEvents).forEach((dateEvents = []) => {
    dateEvents.forEach((event) => {
      const venueName = event?.source?.name;
      const venueCommonName = event?.source?.commonName;
      if (!venueName || !venueCommonName) return;

      if (!resolveEventCoordinates(event, venueMap)) {
        missingVenueNames.add(venueCommonName);
      }
    });
  });

  const sortedNames = Array.from(missingVenueNames).sort();
  console.log(`\n=== ${sortedNames.length} Venues Without Location ===\n`);
  sortedNames.forEach((name) => console.log(`"${name}"`));
  console.log('\n');
  return sortedNames;
};

// Registers console helpers on window; cleans up on unmount.
export const useConsoleCommands = (venues = [], allEvents = {}) => {
  useEffect(() => {
    window.listMissingVenues = () => listMissingVenues(venues, allEvents);
    console.log('Console command available: listMissingVenues()');
    return () => { delete window.listMissingVenues; };
  }, [venues, allEvents]);
};

export default useConsoleCommands;
