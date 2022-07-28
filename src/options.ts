// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { formatDateString } from "./utils.ts";

export type OptionFlags = {
  delete: boolean;
  help: boolean;
  leaves: boolean;
  missingUrl: boolean;
  name: boolean;
  newer: boolean;
  older: boolean;
  quiet: boolean;
  skipConfirmation: boolean;
  sortDate: boolean;
  uses: boolean;
  verbose: boolean;
  version: boolean;
  withDate: boolean;
  withPath: boolean;
};

export type Target = {
  url?: string;
  newer?: string | null;
  older?: string | null;
};

type InvalidArgs = {
  noUrl: boolean;
  noNewer: boolean;
  noOlder: boolean;
  invalidNewer: boolean;
  invalidOlder: boolean;
};

type AvailableFlags = {
  "--delete": string;
  "-d": string;
  "--help": string;
  "-h": string;
  "--leaves": string;
  "--missing-url": string;
  "--name": string;
  "-n": string;
  "--url": string;
  "--newer": string;
  "--older": string;
  "--quiet": string;
  "-q": string;
  "--sort-date": string;
  "--uses": string;
  "--verbose": string;
  "-v": string;
  "--version": string;
  "-V": string;
  "--with-date": string;
  "--with-path": string;
  "--yes": string;
  "-y": string;
};

export function sortOutArgs(args: string[]): {
  optionFlags: OptionFlags;
  target: Target;
  invalidArgs: InvalidArgs;
} {
  const flags: OptionFlags = {
    delete: false,
    help: false,
    leaves: false,
    missingUrl: false,
    name: false,
    newer: false,
    older: false,
    quiet: false,
    skipConfirmation: false,
    sortDate: false,
    uses: false,
    verbose: false,
    version: false,
    withDate: false,
    withPath: false,
  };

  const target: Target = {
    url: undefined,
    newer: undefined,
    older: undefined,
  };

  const invalidArgs: InvalidArgs = {
    noUrl: false,
    noNewer: false,
    noOlder: false,
    invalidNewer: false,
    invalidOlder: false,
  };

  if (args.length === 0) {
    return { optionFlags: flags, target, invalidArgs };
  }

  const availableFlags: AvailableFlags = {
    "--delete": "delete",
    "-d": "delete",
    "--help": "help",
    "-h": "help",
    "--leaves": "leaves",
    "--missing-url": "missingUrl",
    "--name": "name",
    "-n": "name",
    "--url": "name",
    "--newer": "newer",
    "--older": "older",
    "--quiet": "quiet",
    "-q": "quiet",
    "--sort-date": "sortDate",
    "--uses": "uses",
    "--verbose": "verbose",
    "-v": "verbose",
    "--version": "version",
    "-V": "version",
    "--with-date": "withDate",
    "--with-path": "withPath",
    "--yes": "skipConfirmation",
    "-y": "skipConfirmation",
  };

  const exclusiveFlags = new Set([
    "delete",
    "help",
    "leaves",
    "missingUrl",
    "uses",
    "version",
  ]);

  let setExclusive = false;

  let key = "";
  for (const arg of args) {
    if (availableFlags[arg as keyof AvailableFlags]) {
      key = availableFlags[arg as keyof AvailableFlags];

      if (exclusiveFlags.has(key)) {
        if (setExclusive === false) {
          flags[key as keyof OptionFlags] = true;
          setExclusive = true;
        } else {
          key = "";
        }
      } else {
        flags[key as keyof OptionFlags] = true;
      }

      continue;
    }

    // Priority when multiple URLs are specified in arguments:
    // - 1. The URL specified immediately after the delete argument when executing the delete function
    // - 2. The URL specified first
    // NOTE:
    // ??= operator does not work properly on "deno run" before Deno v1.6.2
    // https://github.com/denoland/deno/issues/8627
    switch (key) {
      case "newer": {
        target.newer ?? (target.newer = formatDateString(arg) ?? null);
        break;
      }
      case "older": {
        target.older ?? (target.older = formatDateString(arg) ?? null);
        break;
      }
      case "delete":
        target.url = arg;
        break;
      default:
        target.url ?? (target.url = arg);
    }

    key = "";
  }

  flags.withPath = flags.delete ? true : flags.withPath;
  flags.withPath = flags.uses ? false : flags.withPath;

  flags.verbose = flags.quiet ? false : flags.verbose; // Priority: quiet > verbose

  invalidArgs.noUrl = (flags.name || flags.delete) && target.url === undefined;
  invalidArgs.noNewer = flags.newer && target.newer === undefined;
  invalidArgs.noOlder = flags.older && target.older === undefined;
  invalidArgs.invalidNewer = flags.newer && target.newer === null;
  invalidArgs.invalidOlder = flags.older && target.older === null;

  return { optionFlags: flags, target, invalidArgs };
}
