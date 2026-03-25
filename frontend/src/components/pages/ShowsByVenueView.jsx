import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { useRecoilValue } from 'recoil';
import * as Atoms from '../../state/atoms';
import { filterEventsByVenueAcrossAllDays } from '../../utils/eventFilterUtils';
import GoogleCalendarButton from '../calendar/GoogleCalendarButton';
import IcalCalendarButton from '../calendar/IcalCalendarButton';
import SearchVenuesForm from '../event_list/SearchVenuesForm';
import { FILE_DATE_FORMAT } from '../../utils/dateUtils';

const ShowsByVenueView = () => {
  const eventsFromStore = useRecoilValue(Atoms.eventsState);
  const [search, setSearch] = useState('');

  const events = useMemo(
    () => filterEventsByVenueAcrossAllDays(eventsFromStore || {}, search),
    [eventsFromStore, search]
  );

  const hasSearch = search.trim() !== '';
  const hasResults = Object.keys(events).length > 0;
  const rows = useMemo(
    () => {
      const todayKey = moment().format(FILE_DATE_FORMAT);

      return Object.entries(events)
        .filter(([date]) => date >= todayKey)
        .flatMap(([date, dateEvents]) =>
          dateEvents.map((event, idx) => ({
            id: `${date}-${idx}-${event.url}`,
            date,
            venue: event.source.commonName,
            title: event.title,
            url: event.url,
            event,
          }))
        );
    },
    [events]
  );
  const hasUpcomingResults = rows.length > 0;

  return (
    <div className='ListViewManager'>
      <div className='shows-by-venue-intro'>
        <h2 className='shows-by-venue-title'>Shows by Venue</h2>
        <p className='shows-by-venue-copy'>
          Search by venue name to see matching shows across multiple days.
        </p>
        <Link className='shows-by-venue-directory-link venue-link' to='/VenuesListView'>Browse available Venues</Link>
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

      {hasSearch && hasResults && !hasUpcomingResults && (
        <div className='shows-by-venue-empty'>
          No upcoming shows found for that venue search.
        </div>
      )}

      {hasUpcomingResults && (
        <div className='shows-by-venue-table-wrap'>
          <div className='shows-by-venue-table'>
            <div className='shows-by-venue-header'>
              <div className='shows-by-venue-header-cell'>Date</div>
              <div className='shows-by-venue-header-cell'>Title</div>
              <div className='shows-by-venue-header-cell'>Links</div>
              <div className='shows-by-venue-header-cell'>Venue</div>
            </div>

            {rows.map((row) => (
              <div key={row.id} className='shows-by-venue-row'>
                <div className='shows-by-venue-date'>
                  {moment(row.date, 'MM-DD').format('M/DD (dddd)')}
                </div>
                <a
                  className='shows-by-venue-link'
                  href={row.url}
                >
                  {row.title}
                </a>
                <div className='shows-by-venue-links'>
                  <GoogleCalendarButton event={row.event} />
                  <IcalCalendarButton event={row.event} />
                </div>
                <div className='shows-by-venue-venue'>{row.venue}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowsByVenueView;
