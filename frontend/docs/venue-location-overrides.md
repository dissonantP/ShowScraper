# Venue location overrides

Canonical venue-coordinate overrides live in
`src/venueLocationOverrides.json`. Existing entries are ordered, and the first
matching entry wins.

Each override has this shape:

```json
[
  ["MATCH GROUP", ["ALIAS A", "ALIAS B"]],
  "37.8, -122.2"
]
```

Matching is case-insensitive substring matching. Every group must occur in the
source venue name. A string group has one required substring; an array group
matches when any alias occurs.

## Updating the data

Create a proposal file that associates each exact source venue string with one
override:

```json
{
  "entries": [
    {
      "sourceVenue": "Example Hall, Oakland",
      "override": [
        ["EXAMPLE HALL", ["OAK", "OAKLAND"]],
        "37.8, -122.2"
      ]
    }
  ]
}
```

Validate and preview the complete batch:

```sh
npm run venue-overrides:update -- --input proposals.json --dry-run
```

Apply it:

```sh
npm run venue-overrides:update -- --input proposals.json
```

The updater validates the complete input before writing, rejects duplicates
and existing entries, confirms each matcher matches its `sourceVenue`, and
atomically replaces the canonical file only after validation succeeds. It
preserves existing order and appends proposals in input order. Git, PR,
scheduling, webhook, and deployment orchestration are intentionally outside
this command.
