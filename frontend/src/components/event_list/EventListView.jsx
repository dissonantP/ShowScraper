import React from 'react';
import EventListItemText from './EventListItemText';
import EventListItemFlyer from './EventListItemFlyer';
import moment from 'moment';

import { groupByRegion } from '../../utils/regionUtils';
import DayGroup from './DayGroup';
import DayGroupTitle from './DayGroupTitle';
import DayEventsGrid from './DayEventsGrid';
import RegionBlock from './RegionBlock';

export default function EventListView({
  events: eventsByDate,
  textOnly,
  hideDayGroupTitle,
  onMapFocus,
  focusableEventKeys,
}) {
  const dayGroups = Object.entries(eventsByDate).map(([date, dateEvents], dayIdx) => {
    const dayGroupTitle = <DayGroupTitle label={moment(date, "MM-DD").format("M/DD (dddd)")} />;

    const eventsByRegion = groupByRegion(dateEvents)
      .filter(([, regionEvents]) => regionEvents.length > 0);

    return (
      <DayGroup key={dayIdx}>
        {!hideDayGroupTitle && dayGroupTitle}
        <DayEventsGrid textOnly={textOnly}>
          {eventsByRegion.map(([region, regionEvents]) => (
            <RegionBlock key={region} region={region} showTitle={textOnly}>
              { regionEvents.map((dateEvent, idx) => {
                const ItemComponent = textOnly ? EventListItemText : EventListItemFlyer;
                return (
                  <ItemComponent
                    key={(dayIdx + 1) + idx}
                    event={dateEvent}
                    onMapFocus={textOnly ? onMapFocus : undefined}
                    focusableEventKeys={textOnly ? focusableEventKeys : undefined}
                  />
                );
              }) }
            </RegionBlock>
          ))}
        </DayEventsGrid>
      </DayGroup>
    );
  });

  return (
    <div className='Events-list '>
      {dayGroups}
    </div>
  );
}
