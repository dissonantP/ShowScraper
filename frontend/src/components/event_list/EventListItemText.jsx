import React, { useMemo } from 'react';
import EventButtons from './EventButtons';
import { truncateTitle } from '../../utils/textUtils';
import { getEventKey } from '../../utils/eventLocationUtils';

const EventListItemText = ({ event, onMapFocus, focusableEventKeys }) => {
  const title = useMemo(() => truncateTitle(event.title), [event.title]);
  const canFocusOnMap = Boolean(onMapFocus && focusableEventKeys?.has(getEventKey(event)));

  const handleMapFocus = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (canFocusOnMap) onMapFocus(event);
  };

  return (
    <>
      <div className='textViewEntry'>
        <div className='textViewLink'>
          <EventButtons event={event} />
          {onMapFocus && (
            <button
              type='button'
              className='calendar-button map-focus-button'
              onClick={handleMapFocus}
              disabled={!canFocusOnMap}
              title={canFocusOnMap ? 'Show this event on the map' : 'No map location available for this event'}
              data-tooltip={canFocusOnMap ? 'Show on Map' : 'No Map Location'}
            >
              <i className='fas fa-map'></i>
            </button>
          )}
          <a href={event.url}>
            <b className='textViewVenue'>{event.source.commonName}</b>
            <span className='textViewTitle'> {title}</span>
          </a>
        </div>
      </div>
    </>
  );
};

export default EventListItemText;
