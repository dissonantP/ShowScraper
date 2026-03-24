import _ from 'underscore'
import { FILE_DATE_FORMAT } from './dateUtils';

const filterEventsByDay = (events, day) => {
  return _.pick(events, day.format(FILE_DATE_FORMAT));
}

const filterEventsByWeek = (events, day) => {
  const days = [...Array(7).keys()].map((i) => {
    return day.clone().add(i, 'days').format(FILE_DATE_FORMAT);
  });
  return _.pick(events, days);
}

const filterEventsByTime = (events, day, mode) => {
  if (mode == 'day') {
    return filterEventsByDay(events, day);
  } else if (mode == 'week') {
    return filterEventsByWeek(events, day);
  }
  return {};
}

export const filterEventsList = (allEvents, currentDay, mode, search) => {
  let results = filterEventsByTime(allEvents, currentDay, mode);
  if (search && search != "") {
    Object.entries(results).forEach(([date, events]) => {
      results[date] = events.filter((event) => {
        return event.source.commonName.toLowerCase().includes(search.toLowerCase())
      })
    })
    // delete the keys of results which have empty values
    Object.entries(results).forEach(([date, events]) => {
      if (events.length == 0) {
        delete results[date]
      }
    })
  }
  return results
}

export const filterEventsByVenueAcrossAllDays = (allEvents, search) => {
  if (!search || search == "") {
    return {};
  }

  return Object.entries(allEvents || {}).reduce((results, [date, events]) => {
    const matchingEvents = events.filter((event) =>
      event.source.commonName.toLowerCase().includes(search.toLowerCase())
    );

    if (matchingEvents.length > 0) {
      results[date] = matchingEvents;
    }

    return results;
  }, {});
}
