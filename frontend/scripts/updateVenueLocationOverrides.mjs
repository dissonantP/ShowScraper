#!/usr/bin/env node

import {
  open,
  readFile,
  rename,
  stat,
  unlink,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { venueMatcherMatches } from '../src/venueLocationOverrideMatcher.mjs';

export const DEFAULT_OVERRIDES_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/venueLocationOverrides.json'
);

const entryKey = (entry) => JSON.stringify(entry);

const fail = (message) => {
  throw new Error(message);
};

const validateMatchGroup = (group, entryNumber, groupNumber) => {
  if (typeof group === 'string') {
    if (group.length === 0) {
      fail(`Entry ${entryNumber}, group ${groupNumber} must not be empty`);
    }
    return;
  }

  if (
    !Array.isArray(group) ||
    group.length === 0 ||
    group.some((alias) => typeof alias !== 'string' || alias.length === 0)
  ) {
    fail(
      `Entry ${entryNumber}, group ${groupNumber} must be a non-empty string or a non-empty array of non-empty strings`
    );
  }
};

const validateCoordinates = (coordinates, entryNumber) => {
  if (typeof coordinates !== 'string') {
    fail(`Entry ${entryNumber} coordinates must be a string`);
  }

  const parts = coordinates.split(',');
  if (parts.length !== 2 || parts.some((part) => part.trim() === '')) {
    fail(
      `Entry ${entryNumber} coordinates must use the format "latitude, longitude"`
    );
  }

  const [latitude, longitude] = parts.map((part) => Number(part.trim()));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    fail(`Entry ${entryNumber} coordinates must be finite numbers`);
  }
  if (latitude < -90 || latitude > 90) {
    fail(`Entry ${entryNumber} latitude must be between -90 and 90`);
  }
  if (longitude < -180 || longitude > 180) {
    fail(`Entry ${entryNumber} longitude must be between -180 and 180`);
  }
};

export const validateProposals = (input, existingOverrides) => {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    !Array.isArray(input.entries)
  ) {
    fail('Input must be an object with an entries array');
  }
  if (input.entries.length === 0) {
    fail('Input must contain at least one proposed entry');
  }
  if (!Array.isArray(existingOverrides)) {
    fail('Canonical override data must be an array');
  }

  const existingKeys = new Set(existingOverrides.map(entryKey));
  const proposedKeys = new Set();

  return input.entries.map((proposal, index) => {
    const entryNumber = index + 1;
    if (
      proposal === null ||
      typeof proposal !== 'object' ||
      Array.isArray(proposal) ||
      typeof proposal.sourceVenue !== 'string' ||
      proposal.sourceVenue.length === 0
    ) {
      fail(`Entry ${entryNumber} must have a non-empty sourceVenue string`);
    }

    const override = proposal.override;
    if (
      !Array.isArray(override) ||
      override.length !== 2 ||
      !Array.isArray(override[0]) ||
      override[0].length === 0
    ) {
      fail(
        `Entry ${entryNumber} override must have shape [[matchGroup, ...], "latitude, longitude"]`
      );
    }

    override[0].forEach((group, groupIndex) =>
      validateMatchGroup(group, entryNumber, groupIndex + 1)
    );
    validateCoordinates(override[1], entryNumber);

    if (!venueMatcherMatches(override[0], proposal.sourceVenue)) {
      fail(
        `Entry ${entryNumber} matcher does not match its sourceVenue using production semantics`
      );
    }

    const key = entryKey(override);
    if (proposedKeys.has(key)) {
      fail(`Entry ${entryNumber} duplicates another proposed override`);
    }
    if (existingKeys.has(key)) {
      fail(`Entry ${entryNumber} is already present in the canonical data`);
    }
    proposedKeys.add(key);

    return override;
  });
};

const readJson = async (filePath, label) => {
  let contents;
  try {
    contents = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read ${label} file ${filePath}: ${error.message}`);
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`Invalid JSON in ${label} file ${filePath}: ${error.message}`);
  }
};

const writeJsonAtomically = async (filePath, data) => {
  const fileStats = await stat(filePath);
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.tmp`
  );
  let handle;

  try {
    handle = await open(temporaryPath, 'wx', fileStats.mode);
    await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, filePath);
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
    }
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
};

export const runUpdate = async ({
  inputFile,
  overridesFile = DEFAULT_OVERRIDES_FILE,
  dryRun = false,
}) => {
  if (!inputFile) {
    fail('An input file is required');
  }

  const [input, existingOverrides] = await Promise.all([
    readJson(path.resolve(inputFile), 'input'),
    readJson(path.resolve(overridesFile), 'canonical override'),
  ]);
  const additions = validateProposals(input, existingOverrides);

  if (!dryRun) {
    await writeJsonAtomically(path.resolve(overridesFile), [
      ...existingOverrides,
      ...additions,
    ]);
  }

  return {
    mode: dryRun ? 'dry-run' : 'apply',
    overrideFile: path.resolve(overridesFile),
    existingEntries: existingOverrides.length,
    addedEntries: additions.length,
    totalEntries: existingOverrides.length + additions.length,
    additions,
  };
};

const usage = `Usage:
  node scripts/updateVenueLocationOverrides.mjs --input <proposals.json> [--dry-run]

Options:
  --input <path>  JSON proposal file to validate and apply
  --dry-run       Validate and report without changing the canonical data
  --validate      Alias for --dry-run
  --help          Show this help`;

const parseArguments = (args) => {
  const options = { dryRun: false };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--input') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) {
        fail('--input requires a file path');
      }
      options.inputFile = value;
      index += 1;
    } else if (argument === '--dry-run' || argument === '--validate') {
      options.dryRun = true;
    } else if (argument === '--help') {
      options.help = true;
    } else {
      fail(`Unknown option: ${argument}`);
    }
  }

  if (!options.help && !options.inputFile) {
    fail('--input is required');
  }
  return options;
};

const main = async () => {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(usage);
      return;
    }
    console.log(JSON.stringify(await runUpdate(options), null, 2));
  } catch (error) {
    console.error(error.message);
    console.error(usage);
    process.exitCode = 1;
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
