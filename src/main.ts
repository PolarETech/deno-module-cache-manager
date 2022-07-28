// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { checkDenoVersion, MIN_DENO_VERSION, SCRIPT_VERSION } from "./version.ts";
import { obtainCacheLocation } from "./location.ts";
import { sortOutArgs } from "./options.ts";
import { ModuleData } from "./moduleData.ts";
import { collectPathOfFileWithMissingURL } from "./missingUrl.ts";
import { displayCachedModuleList } from "./list.ts";
import { deleteFile } from "./delete.ts";
import { displayHelp } from "./help.ts";

import {
  ConfirmationId,
  displayConfirmationMessage,
  displayResultMessage,
  displaySearchCriteria,
  displaySearchLocation,
  ResultId,
} from "./messages.ts";

// Cache location
export let baseDepsPath = "";
export let baseGenPath = "";

// Output mode
export let quietMode = false;
export let verboseMode = false;

if (checkDenoVersion(MIN_DENO_VERSION) === false) {
  displayResultMessage({ name: ResultId.VersionError, version: MIN_DENO_VERSION });
  Deno.exit();
}

({ baseDepsPath, baseGenPath } = await obtainCacheLocation());

const { optionFlags, target, invalidArgs } = sortOutArgs(Deno.args);

// Output script version information for version option
if (optionFlags.version) {
  displayResultMessage({ name: ResultId.Version, version: SCRIPT_VERSION });
  Deno.exit();
}

// Output help information for help option
if (optionFlags.help) {
  displayHelp();
  Deno.exit();
}

// Set output mode to be applied in subsequent processing
quietMode = optionFlags.quiet;
verboseMode = optionFlags.verbose;

// Output file list and results for missing url option
if (optionFlags.missingUrl) {
  const filePathList = collectPathOfFileWithMissingURL();
  const fileCount = filePathList.length;
  filePathList.forEach((path) => console.log(path));
  displayResultMessage({ name: ResultId.FoundFile, fileCount });
  displaySearchCriteria(optionFlags, {});
  displaySearchLocation();
  Deno.exit();
}

// Output invalid argument errors
if (Object.values(invalidArgs).includes(true)) {
  if (invalidArgs.noUrl) {
    displayResultMessage({
      name: ResultId.ModuleUrlRequired,
    });
  }
  if (invalidArgs.noNewer) {
    displayResultMessage({
      name: ResultId.DateRequired,
      option: "newer",
    });
  }
  if (invalidArgs.noOlder) {
    displayResultMessage({
      name: ResultId.DateRequired,
      option: "older",
    });
  }
  if (invalidArgs.invalidNewer) {
    displayResultMessage({
      name: ResultId.InvalidDate,
      option: "newer",
    });
  }
  if (invalidArgs.invalidOlder) {
    displayResultMessage({
      name: ResultId.InvalidDate,
      option: "older",
    });
  }
  Deno.exit();
}

// Confirmation for leaves and uses options
if (optionFlags.leaves || optionFlags.uses) {
  displayConfirmationMessage({
    name: ConfirmationId.LongTime,
  }, optionFlags.skipConfirmation) ||
    Deno.exit();
}

// Collect basic information on cached modules
const moduleData = new ModuleData();
moduleData.collectModule(baseDepsPath, target);

if (optionFlags.leaves) await moduleData.extractLeavesModule();

const moduleCount = moduleData.targetedUrlListLength;

// Output found-no-modules message
if (moduleCount === 0) {
  displayResultMessage({ name: ResultId.FoundModule, moduleCount });
  displaySearchCriteria(optionFlags, target);
  displaySearchLocation();
  Deno.exit();
}

// Collect additional information on cached modules
if (optionFlags.withPath) moduleData.collectRelatedFilePath();
if (optionFlags.uses) await moduleData.collectUsesModule();

// Process for delete option
if (optionFlags.delete) {
  optionFlags.skipConfirmation ||
    displayCachedModuleList(moduleData, optionFlags);

  displayConfirmationMessage({
    name: ConfirmationId.Delete,
    fileCount: moduleData.relatedFilePathListLength,
  }, optionFlags.skipConfirmation) &&
    deleteFile(moduleData);

  Deno.exit();
}

// Output module list and results for name, leaves, and uses options
displayCachedModuleList(moduleData, optionFlags);
displayResultMessage({
  name: ResultId.FoundModule,
  moduleCount,
  fileCount: optionFlags.withPath ? moduleData.relatedFilePathListLength : undefined,
});
displaySearchCriteria(optionFlags, target);
displaySearchLocation();
