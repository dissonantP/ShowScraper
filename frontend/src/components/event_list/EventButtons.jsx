import React from 'react';
import AIResearchControls from './AIResearchControls';
import GoogleCalendarButton from '../calendar/GoogleCalendarButton';
import IcalCalendarButton from '../calendar/IcalCalendarButton';
import { FEATURE_FLAGS } from '../../config';

const EventButtons = ({ event }) => {
  return (
    <div className='calendar-buttons'>
      <GoogleCalendarButton event={event} />
      <IcalCalendarButton event={event} />
      {FEATURE_FLAGS.SHOW_AI_RESEARCH_UI && <AIResearchControls event={event} />}
    </div>
  );
};

export default EventButtons;
