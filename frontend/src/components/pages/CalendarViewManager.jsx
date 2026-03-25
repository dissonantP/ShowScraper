import React, { useMemo, useState } from 'react';
import moment from 'moment';
import { useRecoilState, useRecoilValue } from 'recoil';
import * as Atoms from '../../state/atoms';
import SearchVenuesForm from '../event_list/SearchVenuesForm';
import EventListView from '../event_list/EventListView';
import { FILE_DATE_FORMAT } from '../../utils/dateUtils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const buildCalendarCells = (displayMonth) => {
  const monthStart = displayMonth.clone().startOf('month');
  const gridStart = monthStart.clone().startOf('week');

  return Array.from({ length: 42 }, (_, idx) => gridStart.clone().add(idx, 'days'));
};

const CalendarViewManager = () => {
  const allEvents = useRecoilValue(Atoms.eventsState);
  const [currentDay, setCurrentDay] = useRecoilState(Atoms.currentDayState);
  const [displayMonth, setDisplayMonth] = useState(currentDay.clone().startOf('month'));
  const [search, setSearch] = useState('');

  const filteredDayEvents = useMemo(() => {
    const dayKey = currentDay.format(FILE_DATE_FORMAT);
    const dayEvents = allEvents?.[dayKey] || [];

    if (!search.trim()) {
      return dayEvents;
    }

    return dayEvents.filter((event) =>
      event.source.commonName.toLowerCase().includes(search.toLowerCase())
    );
  }, [allEvents, currentDay, search]);

  const selectedEvents = useMemo(
    () => ({ [currentDay.format(FILE_DATE_FORMAT)]: filteredDayEvents }),
    [currentDay, filteredDayEvents]
  );

  const calendarCells = useMemo(() => buildCalendarCells(displayMonth), [displayMonth]);

  const hasEventsForSelectedDay = filteredDayEvents.length > 0;

  return (
    <div className='ListViewManager'>
      <div className='calendar-view'>
        <div className='calendar-view-header'>
          <button
            type='button'
            className='nav-item calendar-month-button'
            onClick={() => setDisplayMonth((prev) => prev.clone().subtract(1, 'month'))}
          >
            {displayMonth.clone().subtract(1, 'month').format('MMMM')}
          </button>
          <div className='nav-item selected calendar-month-current'>
            {displayMonth.format('MMMM YYYY')}
          </div>
          <button
            type='button'
            className='nav-item calendar-month-button'
            onClick={() => setDisplayMonth((prev) => prev.clone().add(1, 'month'))}
          >
            {displayMonth.clone().add(1, 'month').format('MMMM')}
          </button>
        </div>

        <div className='calendar-grid'>
          {DAY_LABELS.map((label) => (
            <div key={label} className='calendar-grid-label'>{label}</div>
          ))}

          {calendarCells.map((date) => {
            const dayKey = date.format(FILE_DATE_FORMAT);
            const dayEvents = allEvents?.[dayKey] || [];
            const inCurrentMonth = date.month() === displayMonth.month();
            const isSelected = dayKey === currentDay.format(FILE_DATE_FORMAT);

            return (
              <button
                key={date.format('YYYY-MM-DD')}
                type='button'
                className={`calendar-day ${inCurrentMonth ? '' : 'calendar-day-outside'} ${isSelected ? 'calendar-day-selected' : ''} ${dayEvents.length > 0 ? 'calendar-day-has-events' : ''}`}
                onClick={() => {
                  setCurrentDay(date.clone());
                  setDisplayMonth(date.clone().startOf('month'));
                }}
              >
                <span className='calendar-day-number'>{date.date()}</span>
                {dayEvents.length > 0 && (
                  <span className='calendar-day-count'>{dayEvents.length}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className='calendar-selected-day'>
          {currentDay.format('M/DD (dddd)')}
        </div>

        <SearchVenuesForm onChange={(event) => setSearch(event.currentTarget.value)} />

        {hasEventsForSelectedDay ? (
          <EventListView textOnly={true} events={selectedEvents} hideDayGroupTitle={true} />
        ) : (
          <div className='shows-by-venue-empty'>
            No shows found for the selected day.
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarViewManager;
