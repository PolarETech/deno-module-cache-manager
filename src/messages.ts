// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { location } from "./location.ts";
import { checkDenoVersion } from "./version.ts";
import { InvalidArgs, OptionFlags, Target } from "./options.ts";

let quietMode = false;
let verboseMode = false;

export function updateOutputMode(mode: { quiet: boolean; verbose: boolean }) {
  quietMode = mode.quiet;
  verboseMode = mode.verbose;
}

export enum ConfirmationId {
  Delete = "delete",
  LongTime = "longTime",
}

type ConfirmationType =
  | { id: ConfirmationId.Delete; fileCount: number }
  | { id: ConfirmationId.LongTime };

export enum ResultId {
  Version = "version",
  VersionError = "versionError",
  InvalidDate = "invalidDate",
  DateRequired = "dateRequired",
  ModuleUrlRequired = "moduleUrlRequired",
  FoundModule = "foundModule",
  FoundFile = "foundFile",
  DeletedFile = "deletedFile",
}

type ResultType =
  | { id: ResultId.Version; version: string }
  | { id: ResultId.VersionError; version: string }
  | { id: ResultId.InvalidDate; option: "newer" | "older" }
  | { id: ResultId.DateRequired; option: "newer" | "older" }
  | { id: ResultId.ModuleUrlRequired }
  | { id: ResultId.FoundModule; moduleCount: number; fileCount?: number }
  | { id: ResultId.FoundFile; fileCount: number }
  | { id: ResultId.DeletedFile; filePath: string };

function generateMessage(type: ConfirmationType | ResultType): string {
  switch (type.id) {
    /*
     * Confirmation messages
     */
    case ConfirmationId.Delete:
      switch (type.fileCount) {
        case 0:
          throw new Error("There are no files to delete");
        case 1:
          return "\nThis operation cannot be undone.\n" +
            `Are you sure you want to delete the above ${type.fileCount} file? (y/N): `;
        default:
          return "\nThis operation cannot be undone.\n" +
            `Are you sure you want to delete the above ${type.fileCount} files? (y/N): `;
      }
    case ConfirmationId.LongTime:
      return "It may take a very long time. Are you sure you want to start the process? (y/N): ";
    /*
     * Result messages
     */
    case ResultId.Version:
      return `Deno module cache manager ${type.version}`;
    case ResultId.VersionError:
      return `INFO: Deno version ${type.version} or later is required`;
    case ResultId.InvalidDate:
      return `INFO: The specified ${type.option} date is invalid`;
    case ResultId.DateRequired:
      return `INFO: Please specify the ${type.option} date`;
    case ResultId.ModuleUrlRequired:
      return "INFO: Please specify the module url";

    case ResultId.FoundModule: {
      const moduleMessage = (() => {
        switch (type.moduleCount) {
          case 0:
            return "INFO: No modules are found";
          case 1:
            return `\nTotal: ${type.moduleCount} module is found`;
          default:
            return `\nTotal: ${type.moduleCount} modules are found`;
        }
      })();

      switch (type.fileCount) {
        case undefined:
          return moduleMessage;
        case 1:
          return `${moduleMessage} (${type.fileCount} file)`;
        default:
          return `${moduleMessage} (${type.fileCount} files)`;
      }
    }

    case ResultId.FoundFile:
      switch (type.fileCount) {
        case 0:
          return "INFO: No files are found";
        case 1:
          return `\nTotal: ${type.fileCount} file is found`;
        default:
          return `\nTotal: ${type.fileCount} files are found`;
      }

    case ResultId.DeletedFile:
      return `DELETED: ${type.filePath}`;

    default: {
      const _invalidValue: never = type;
      throw new Error(`${JSON.stringify(_invalidValue)} is invalid`);
    }
  }
}

export function displayConfirmationMessage(
  type: ConfirmationType,
  skip = false,
): boolean {
  if (skip) return true;

  const message = generateMessage(type);
  Deno.stdout.writeSync(new TextEncoder().encode(message));

  const buf = new Uint8Array(1024);
  const n = Deno.stdin.readSync(buf);
  const input = new TextDecoder().decode(buf.subarray(0, n!)).trim();

  return input.toLowerCase() === "y";
}

export function displayResultMessage(type: ResultType): void {
  if (quietMode) return;
  const message = generateMessage(type);
  console.log(message);
}

export function displayInvalidArgsMessage(invalidArgs: InvalidArgs): void {
  invalidArgs.noUrl &&
    displayResultMessage({
      id: ResultId.ModuleUrlRequired,
    });

  invalidArgs.noNewer &&
    displayResultMessage({
      id: ResultId.DateRequired,
      option: "newer",
    });

  invalidArgs.noOlder &&
    displayResultMessage({
      id: ResultId.DateRequired,
      option: "older",
    });

  invalidArgs.invalidNewer &&
    displayResultMessage({
      id: ResultId.InvalidDate,
      option: "newer",
    });

  invalidArgs.invalidOlder &&
    displayResultMessage({
      id: ResultId.InvalidDate,
      option: "older",
    });
}

export function displaySearchCriteria(
  option: OptionFlags,
  target: Target,
): void {
  if (verboseMode === false) return;

  const criteria = (
    (option.missingUrl ? ` - Search with option "--missing-url"\n` : "") +
    (option.leaves ? ` - Search with option "--leaves"\n` : "") +
    (option.uses ? ` - Search with option "--uses"\n` : "") +
    (target.url ? ` - Module URL contains "${target.url}"\n` : "") +
    (target.newer ? ` - Download date is equal to or newer than "${target.newer}"\n` : "") +
    (target.older ? ` - Download date is equal to or older than "${target.older}"\n` : "")
  ) || " - All cached modules";

  const message = `Search criteria:\n${criteria}`.trimEnd();
  console.log(message);
}

export function displaySearchLocation(): void {
  if (verboseMode === false) return;

  const message = "Search locations:\n" +
    ` - ${location.baseDepsPath}\n` +
    ` - ${location.baseGenPath}`;

  console.log(message);
}

export function displayCursor(show = true): void {
  // NOTE:
  // Before Deno v1.19.0, handling OS signals was unstable.
  // To ensure that the cursor is recovered when SIGINT etc. occurs,
  // cursor display control only be performed in Deno v1.19.0 or later.
  // https://github.com/denoland/deno/pull/13438
  //
  // (Deno v1.20.1)
  // Handling OS signals is currently not available on Windows.
  // Therefore, Windows is also excluded.
  // https://deno.land/manual@v1.20.1/examples/os_signals
  //
  // (Deno v1.23.0)
  // Windows only supports listening for SIGINT and SIGBREAK as of Deno v1.23.
  // Continue to exclude this process in Windows.
  // https://deno.land/manual@v1.23.0/examples/os_signals
  if (checkDenoVersion("1.19.0") === false) return;
  if (Deno.build.os === "windows") return;

  const showCursor = () => {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?25h"));
  };

  const hideCursor = () => {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?25l"));
  };

  // NOTE:
  // Deno (Rust) cannot catch SIGKILL
  // https://github.com/denoland/deno/blob/v1.20.1/runtime/js/40_signals.js#L12-L14
  // https://github.com/denoland/deno/blob/v1.20.1/runtime/ops/signal.rs#L183-L188
  // https://github.com/vorner/signal-hook/blob/v0.3.13/signal-hook-registry/src/lib.rs#L392
  if (show) {
    showCursor();
    Deno.removeSignalListener("SIGINT", showCursor);
    Deno.removeSignalListener("SIGTERM", showCursor);

    // NOTE:
    // The default behavior of the signal never restored.
    // https://github.com/denoland/deno/issues/7164
    Deno.addSignalListener("SIGINT", () => Deno.exit(1));
    Deno.addSignalListener("SIGTERM", () => Deno.exit(1));
  } else {
    hideCursor();
    Deno.addSignalListener("SIGINT", showCursor);
    Deno.addSignalListener("SIGTERM", showCursor);
  }
}

export function displayProgress(
  current: number,
  total: number,
  suffix = "done",
): void {
  if (quietMode) return;

  const digits = String(total).length;
  const text = ` * ${String(current).padStart(digits, " ")} / ${total} ${suffix}`;

  if (current === 0) displayCursor(false);

  Deno.stdout.writeSync(new TextEncoder().encode(`${text}\r`));

  if (current >= total) {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[2K"));
    displayCursor(true);
  }
}
