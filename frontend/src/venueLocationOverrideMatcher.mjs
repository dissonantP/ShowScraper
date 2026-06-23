export const venueMatcherMatches = (matchGroups, venueCommonName = '') => {
  const normalizedVenueCommonName = venueCommonName.toLowerCase();

  return matchGroups.every((matchGroup) => {
    const aliases = Array.isArray(matchGroup) ? matchGroup : [matchGroup];
    return aliases.some((alias) =>
      normalizedVenueCommonName.includes(alias.toLowerCase())
    );
  });
};

export const findVenueLocationOverrideIn = (
  overrides,
  venueCommonName = ''
) =>
  overrides.find(([matchGroups]) =>
    venueMatcherMatches(matchGroups, venueCommonName)
  );
