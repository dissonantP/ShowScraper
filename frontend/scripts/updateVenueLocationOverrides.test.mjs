import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  runUpdate,
  validateProposals,
} from './updateVenueLocationOverrides.mjs';
import {
  findVenueLocationOverrideIn,
  venueMatcherMatches,
} from '../src/venueLocationOverrideMatcher.mjs';

const existing = [[['EXISTING'], '1, 2']];
const validInput = {
  entries: [
    {
      sourceVenue: 'Example Hall, Oakland',
      override: [['EXAMPLE', ['OAK', 'OAKLAND']], '37.8, -122.2'],
    },
  ],
};

const withTemporaryFiles = async (callback) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'venue-overrides-'));
  const overridesFile = path.join(directory, 'overrides.json');
  const inputFile = path.join(directory, 'input.json');
  await writeFile(overridesFile, `${JSON.stringify(existing, null, 2)}\n`);
  await writeFile(inputFile, `${JSON.stringify(validInput, null, 2)}\n`);
  try {
    await callback({ overridesFile, inputFile });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

test('production matcher requires every group and any alias within a group', () => {
  assert.equal(
    venueMatcherMatches(
      ['HALL', ['OAK', 'OAKLAND']],
      'Example Hall, oakland'
    ),
    true
  );
  assert.equal(
    venueMatcherMatches(['HALL', ['SF']], 'Example Hall, Oakland'),
    false
  );
});

test('production lookup retains first-match ordering', () => {
  const overrides = [
    [['EXAMPLE'], '1, 2'],
    [['EXAMPLE', 'HALL'], '3, 4'],
  ];
  assert.equal(
    findVenueLocationOverrideIn(overrides, 'Example Hall'),
    overrides[0]
  );
});

test('canonical JSON exactly retains the legacy tuple count and order', async () => {
  const canonical = JSON.parse(
    await readFile(
      new URL('../src/venueLocationOverrides.json', import.meta.url),
      'utf8'
    )
  );
  const digest = createHash('sha256')
    .update(JSON.stringify(canonical))
    .digest('hex');

  assert.equal(canonical.length, 117);
  assert.equal(
    digest,
    '5f4dd9ecb1cf16eea46e576689545327b31b57ae77761df7ec8913291bb7930a'
  );
});

test('valid proposals append in input order', async () => {
  await withTemporaryFiles(async ({ overridesFile, inputFile }) => {
    const result = await runUpdate({ inputFile, overridesFile });
    const updated = JSON.parse(await readFile(overridesFile, 'utf8'));

    assert.equal(result.addedEntries, 1);
    assert.deepEqual(updated, [...existing, validInput.entries[0].override]);
  });
});

test('rejects an empty proposal batch', () => {
  assert.throws(
    () => validateProposals({ entries: [] }, existing),
    /at least one proposed entry/
  );
});

test('dry-run reports additions without modifying the file', async () => {
  await withTemporaryFiles(async ({ overridesFile, inputFile }) => {
    const before = await readFile(overridesFile, 'utf8');
    const result = await runUpdate({
      inputFile,
      overridesFile,
      dryRun: true,
    });

    assert.equal(result.mode, 'dry-run');
    assert.equal(result.addedEntries, 1);
    assert.equal(await readFile(overridesFile, 'utf8'), before);
  });
});

test('rejects malformed tuples', () => {
  assert.throws(
    () =>
      validateProposals(
        {
          entries: [
            {
              sourceVenue: 'Example',
              override: [['EXAMPLE']],
            },
          ],
        },
        existing
      ),
    /must have shape/
  );
  assert.throws(
    () =>
      validateProposals(
        {
          entries: [
            {
              sourceVenue: 'Example',
              override: [[[]], '1, 2'],
            },
          ],
        },
        existing
      ),
    /non-empty string/
  );
});

test('rejects invalid coordinates', () => {
  for (const coordinates of ['NaN, 2', '91, 2', '1, -181']) {
    assert.throws(
      () =>
        validateProposals(
          {
            entries: [
              {
                sourceVenue: 'Example',
                override: [['EXAMPLE'], coordinates],
              },
            ],
          },
          existing
        ),
      /coordinates|latitude|longitude/
    );
  }
});

test('rejects exact duplicate proposed entries', () => {
  const proposal = {
    sourceVenue: 'Example',
    override: [['EXAMPLE'], '1, 2'],
  };
  assert.throws(
    () => validateProposals({ entries: [proposal, proposal] }, []),
    /duplicates another proposed override/
  );
});

test('rejects entries already present in canonical data', () => {
  assert.throws(
    () =>
      validateProposals(
        {
          entries: [
            {
              sourceVenue: 'Existing',
              override: existing[0],
            },
          ],
        },
        existing
      ),
    /already present/
  );
});

test('rejects a matcher that does not match its source venue', () => {
  assert.throws(
    () =>
      validateProposals(
        {
          entries: [
            {
              sourceVenue: 'Example Hall',
              override: [['OTHER'], '1, 2'],
            },
          ],
        },
        existing
      ),
    /does not match/
  );
});

test('a validation failure leaves the override file unchanged', async () => {
  await withTemporaryFiles(async ({ overridesFile, inputFile }) => {
    const invalidBatch = {
      entries: [
        validInput.entries[0],
        {
          sourceVenue: 'Broken Venue',
          override: [['BROKEN'], '200, 2'],
        },
      ],
    };
    await writeFile(inputFile, `${JSON.stringify(invalidBatch, null, 2)}\n`);
    const before = await readFile(overridesFile, 'utf8');

    await assert.rejects(
      runUpdate({ inputFile, overridesFile }),
      /latitude/
    );
    assert.equal(await readFile(overridesFile, 'utf8'), before);
  });
});
