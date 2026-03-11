import React, { useMemo, useState } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import * as Atoms from '../../state/atoms';
import * as DateUtils from '../../utils/dateUtils';
import { filterEventsList } from '../../utils/eventFilterUtils';
import useConsoleCommands from '../../hooks/useConsoleCommands';
import MapView from '../map/MapView';
import EventListView from '../event_list/EventListView';
import EventModal from '../event_list/EventModal';
import AiIntegrationNotice from '../header/AiIntegrationNotice';
import OtherEventLists from '../header/OtherEventLists';
import DateSelector from '../event_list/DateSelector';
import useVenues from '../../hooks/useVenues';
import { getEventKey } from '../../utils/eventLocationUtils';

const MapViewManager = () => {
  const allEvents = useRecoilValue(Atoms.eventsState);
  const venues = useRecoilValue(Atoms.venuesState);
  const [currentDay, setCurrentDay] = useRecoilState(Atoms.currentDayState);
  const setAIModalEvent = useSetRecoilState(Atoms.aiModalEventState);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [mapFocusRequest, setMapFocusRequest] = useState(null);

  useConsoleCommands(venues, allEvents);

  const events = useMemo(
    () => filterEventsList(allEvents || {}, currentDay, 'day', ''),
    [allEvents, currentDay]
  );
  const {
    eventsWithLocation,
    eventsWithoutLocationByDate,
    eventsWithoutLocationCount,
  } = useVenues(events);
  const focusableEventKeys = useMemo(
    () => new Set(eventsWithLocation.map((event) => getEventKey(event))),
    [eventsWithLocation]
  );

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
    setAIModalEvent(event);
  };

  const handleMapFocus = (event) => {
    setMapFocusRequest({
      event,
      requestedAt: Date.now(),
    });
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
    setShowEventModal(false);
  };

  return (
    <div className='MapViewManager'>
      <AiIntegrationNotice />
      <br />
      <OtherEventLists />
      <br />
      <MapView
        eventsWithLocation={eventsWithLocation}
        eventsWithoutLocationByDate={eventsWithoutLocationByDate}
        eventsWithoutLocationCount={eventsWithoutLocationCount}
        focusRequest={mapFocusRequest}
        onEventClick={handleEventClick}
      />
      <DateSelector
        currentValue={DateUtils.currentDateEntry(currentDay, 'day')}
        nextValue={DateUtils.nextDateEntry(currentDay, 'day')}
        previousValue={DateUtils.prevDateEntry(currentDay, 'day')}
        onPreviousClick={() => setCurrentDay((prev) => DateUtils.prevDate(prev, 'day'))}
        onNextClick={() => setCurrentDay((prev) => DateUtils.nextDate(prev, 'day'))}
      />
      <EventListView
        hideDayGroupTitle={true}
        textOnly={true}
        events={events}
        onMapFocus={handleMapFocus}
        focusableEventKeys={focusableEventKeys}
      />
      <EventModal
        isOpen={showEventModal}
        event={selectedEvent}
        onClose={closeEventModal}
      />
    </div>
  );
};

export default MapViewManager;
