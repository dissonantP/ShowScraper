import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import _ from 'underscore';
import { venuesState, eventsState } from '../state/atoms';
import { resolveEventCoordinates } from '../utils/eventLocationUtils';

// Shared venue + event location computations.
// Optionally accepts an events override (already-filtered list); otherwise uses global eventsState.
export default function useVenues(eventsOverride) {
  const venues = useRecoilValue(venuesState) || [];
  const eventsFromState = useRecoilValue(eventsState) || {};
  const events = eventsOverride || eventsFromState;

  const venuesByName = useMemo(() => _.indexBy(venues, 'name'), [venues]);

  const { eventsWithLocation, eventsWithoutLocationByDate } = useMemo(() => {
    const withLoc = [];
    const withoutLocByDate = {};

    Object.entries(events || {}).forEach(([date, dateEvents = []]) => {
      dateEvents.forEach((event) => {
        const coords = resolveEventCoordinates(event, venuesByName);

        if (coords) {
          withLoc.push({ ...event, lat: coords[0], lng: coords[1] });
        } else {
          (withoutLocByDate[date] = withoutLocByDate[date] || []).push(event);
        }
      });
    });

    return { eventsWithLocation: withLoc, eventsWithoutLocationByDate: withoutLocByDate };
  }, [events, venuesByName]);

  const eventsWithoutLocationCount = useMemo(
    () => Object.values(eventsWithoutLocationByDate).reduce((acc, dateEvents) => acc + dateEvents.length, 0),
    [eventsWithoutLocationByDate]
  );

  return {
    venues,
    eventsWithLocation,
    eventsWithoutLocationByDate,
    eventsWithoutLocationCount,
  };
}
