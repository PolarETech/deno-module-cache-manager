// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { formatDateString } from "./utils.ts";

type AvailableFlagKeys =
  | "--delete"
  | "-d"
  | "--help"
  | "-h"
  | "--import-map"
  | "--leaves"
  | "--missing-url"
  | "--newer"
  | "--older"
  | "--quiet"
  | "-q"
  | "--sort-date"
  | "--url"
  | "--name"
  | "-n"
  | "--uses"
  | "--verbose"
  | "-v"
  | "--version"
  | "-V"
  | "--with-date"
  | "--with-path"
  | "--yes"
  | "-y";

type OptionFlagKeys =
  | "delete"
  | "help"
  | "importMap"
  | "leaves"
  | "missingUrl"
  | "newer"
  | "older"
  | "quiet"
  | "skipConfirmation"
  | "sortDate"
  | "url"
  | "uses"
  | "verbose"
  | "version"
  | "withDate"
  | "withPath";

export type OptionFlags = Record<OptionFlagKeys, boolean>;

export type Target = {
  url?: string;
  newer?: string | null;
  older?: string | null;
  importMap?: Set<string>;
};

export type InvalidArgs = Record<
  | "noUrl"
  | "noNewer"
  | "noOlder"
  | "invalidNewer"
  | "invalidOlder",
  boolean
>;

export function sortOutArgs(args: string[]): {
  optionFlags: OptionFlags;
  target: Target;
  invalidArgs: InvalidArgs;
} {
  const flags: OptionFlags = {
    delete: false,
    help: false,
    importMap: false,
    leaves: false,
    missingUrl: false,
    newer: false,
    older: false,
    quiet: false,
    skipConfirmation: false,
    sortDate: false,
    url: false,
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
    importMap: undefined,
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

  const flagKeyTable: Record<AvailableFlagKeys, OptionFlagKeys> = {
    "--delete": "delete",
    "-d": "delete",
    "--help": "help",
    "-h": "help",
    "--import-map": "importMap",
    "--leaves": "leaves",
    "--missing-url": "missingUrl",
    "--name": "url",
    "-n": "url",
    "--url": "url",
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

  let key: OptionFlagKeys = "url";
  for (const arg of args) {
    if (flagKeyTable[arg as AvailableFlagKeys]) {
      key = flagKeyTable[arg as AvailableFlagKeys];

      if (exclusiveFlags.has(key)) {
        if (setExclusive === false) {
          flags[key] = true;
          setExclusive = true;
        } else {
          key = "url";
        }
      } else {
        flags[key] = true;
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
      case "newer":
        target.newer ?? (target.newer = formatDateString(arg) ?? null);
        break;
      case "older":
        target.older ?? (target.older = formatDateString(arg) ?? null);
        break;
      case "delete":
        target.url = arg;
        break;
      case "importMap":
        target.importMap ?? (target.importMap = new Set());
        target.importMap.add(arg);
        break;
      default:
        target.url ?? (target.url = arg);
    }

    // --import-map allows multiple URLs to be specified in succession.
    if (key === "importMap") continue;
    key = "url";
  }

  flags.delete && (flags.withPath = true);
  flags.uses && (flags.withPath = false);

  flags.quiet && (flags.verbose = false); // Priority: quiet > verbose

  invalidArgs.noUrl = (flags.url || flags.delete) && target.url === undefined;
  invalidArgs.noNewer = flags.newer && target.newer === undefined;
  invalidArgs.noOlder = flags.older && target.older === undefined;
  invalidArgs.invalidNewer = flags.newer && target.newer === null;
  invalidArgs.invalidOlder = flags.older && target.older === null;

  return { optionFlags: flags, target, invalidArgs };
}
