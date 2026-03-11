import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import EventMarkers from './EventMarkers';
import HoverInfoBox from './HoverInfoBox';
import MissingEventsNotice from './MissingEventsNotice';
import MissingEventsModal from './MissingEventsModal';
import NoMapEntries from './NoMapEntries';
import { BAY_AREA_CENTER, DEFAULT_ZOOM } from '../../utils/mapUtils';
import { getEventKey } from '../../utils/eventLocationUtils';

const FOCUSED_EVENT_ZOOM = 14;

const FocusHandler = ({ focusRequest, onEventHover }) => {
  const map = useMap();

  useEffect(() => {
    const event = focusRequest?.event;
    if (!Number.isFinite(event?.lat) || !Number.isFinite(event?.lng)) return;

    const nextZoom = Math.max(map.getZoom(), FOCUSED_EVENT_ZOOM);
    map.flyTo([event.lat, event.lng], nextZoom, {
      animate: true,
      duration: 0.7,
    });
    onEventHover(event);
  }, [focusRequest, map, onEventHover]);

  return null;
};

const MapView = ({
  eventsWithLocation = [],
  eventsWithoutLocationByDate = {},
  eventsWithoutLocationCount = 0,
  focusRequest,
  onEventClick,
}) => {
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [showMissingEventsModal, setShowMissingEventsModal] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const containerRef = useRef(null);
  const focusedEvent = focusRequest?.event;
  const focusedEventKey = focusedEvent ? getEventKey(focusedEvent) : null;
  const focusedMapEvent = focusedEventKey
    ? eventsWithLocation.find((event) => getEventKey(event) === focusedEventKey)
    : null;

  useEffect(() => {
    if (!focusedMapEvent || !containerRef.current) return;

    containerRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [focusedMapEvent, focusRequest]);

  const ZoomHandler = () => {
    useMapEvents({
      zoomend: (e) => setCurrentZoom(e.target.getZoom()),
    });
    return null;
  };

  if (eventsWithLocation.length === 0) {
    return <NoMapEntries />;
  }

  return (
    <div className='map-container' ref={containerRef}>
      <MapContainer
        center={BAY_AREA_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '600px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomHandler />
        <FocusHandler
          focusRequest={focusedMapEvent ? { ...focusRequest, event: focusedMapEvent } : null}
          onEventHover={setHoveredEvent}
        />
        <EventMarkers
          events={eventsWithLocation}
          onEventClick={onEventClick}
          onEventHover={(event) => setHoveredEvent(event)}
          currentZoom={currentZoom}
        />
      </MapContainer>
      <HoverInfoBox event={hoveredEvent} />
      <MissingEventsNotice
        count={eventsWithoutLocationCount}
        onClick={() => setShowMissingEventsModal(true)}
      />
      {showMissingEventsModal && (
        <MissingEventsModal
          onClose={() => setShowMissingEventsModal(false)}
          events={eventsWithoutLocationByDate}
        />
      )}
    </div>
  );
};

export default MapView;
