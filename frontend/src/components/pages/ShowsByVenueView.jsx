import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import * as Atoms from '../../state/atoms';
import { filterEventsByVenueAcrossAllDays } from '../../utils/eventFilterUtils';
import SearchVenuesForm from '../event_list/SearchVenuesForm';
import EventListView from '../event_list/EventListView';

const ShowsByVenueView = () => {
  const eventsFromStore = useRecoilValue(Atoms.eventsState);
  const [search, setSearch] = useState('');

  const events = useMemo(
    () => filterEventsByVenueAcrossAllDays(eventsFromStore || {}, search),
    [eventsFromStore, search]
  );

  const hasSearch = search.trim() !== '';
  const hasResults = Object.keys(events).length > 0;

  return (
    <div className='ListViewManager'>
      <div className='shows-by-venue-intro'>
        <h2 className='shows-by-venue-title'>Shows by Venue</h2>
        <p className='shows-by-venue-copy'>
          Search by venue name to see matching shows across multiple days. Need the full venue directory?{' '}
          <Link className='venue-link' to='/VenuesListView'>Browse the Venues page</Link>.
        </p>
      </div>

      <SearchVenuesForm onChange={(event) => setSearch(event.currentTarget.value)} />

      {!hasSearch && (
        <div className='shows-by-venue-empty'>
          Enter a venue name to see matching shows.
        </div>
      )}

      {hasSearch && !hasResults && (
        <div className='shows-by-venue-empty'>
          No shows found for that venue search.
        </div>
      )}

      {hasResults && <EventListView textOnly={true} events={events} />}
    </div>
  );
};

export default ShowsByVenueView;
