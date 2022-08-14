// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { checkDenoVersion, MIN_DENO_VERSION, SCRIPT_VERSION } from "./version.ts";
import { location } from "./location.ts";
import { sortOutArgs } from "./options.ts";
import { ModuleData } from "./moduleData.ts";
import { collectPathOfFileWithMissingURL } from "./missingUrl.ts";
import { displayCachedModuleList } from "./list.ts";
import { deleteFile } from "./delete.ts";
import { displayHelp } from "./help.ts";

import {
  ConfirmationId,
  displayConfirmationMessage,
  displayInvalidArgsMessage,
  displayResultMessage,
  displaySearchCriteria,
  displaySearchLocation,
  ResultId,
  updateOutputMode,
} from "./messages.ts";

async function main() {
  if (checkDenoVersion(MIN_DENO_VERSION) === false) {
    displayResultMessage({ id: ResultId.VersionError, version: MIN_DENO_VERSION });
    Deno.exit();
  }

  const { optionFlags, target, invalidArgs } = sortOutArgs(Deno.args);

  // Output script version information for version option
  if (optionFlags.version) {
    displayResultMessage({ id: ResultId.Version, version: SCRIPT_VERSION });
    Deno.exit();
  }

  // Output help information for help option
  if (optionFlags.help) {
    displayHelp(SCRIPT_VERSION);
    Deno.exit();
  }

  // Store the cache location and the output mode to be applied in subsequent processing
  await location.obtainCacheLocation();
  updateOutputMode({ quiet: optionFlags.quiet, verbose: optionFlags.verbose });

  // Output file list and results for missing url option
  if (optionFlags.missingUrl) {
    const filePathList = collectPathOfFileWithMissingURL();
    const fileCount = filePathList.length;
    filePathList.forEach((path) => console.log(path));
    displayResultMessage({ id: ResultId.FoundFile, fileCount });
    displaySearchCriteria(optionFlags, {});
    displaySearchLocation();
    Deno.exit();
  }

  // Output invalid argument errors
  if (Object.values(invalidArgs).includes(true)) {
    displayInvalidArgsMessage(invalidArgs);
    Deno.exit();
  }

  // Confirmation for leaves and uses options
  if (optionFlags.leaves || optionFlags.uses) {
    displayConfirmationMessage({
      id: ConfirmationId.LongTime,
    }, optionFlags.skipConfirmation) ||
      Deno.exit();
  }

  // Collect basic information on cached modules
  const moduleData = new ModuleData();
  moduleData.collectModule(location.baseDepsPath, target);

  if (optionFlags.leaves) await moduleData.extractLeavesModule(target.importMap);

  const moduleCount = moduleData.targetedUrlListLength;

  // Output found-no-modules message
  if (moduleCount === 0) {
    displayResultMessage({ id: ResultId.FoundModule, moduleCount });
    displaySearchCriteria(optionFlags, target);
    displaySearchLocation();
    Deno.exit();
  }

  // Collect additional information on cached modules
  if (optionFlags.withPath) moduleData.collectRelatedFilePath();
  if (optionFlags.uses) await moduleData.collectUsesModule(target.importMap);

  // Process for delete option
  if (optionFlags.delete) {
    optionFlags.skipConfirmation ||
      displayCachedModuleList(moduleData, optionFlags);

    displayConfirmationMessage({
      id: ConfirmationId.Delete,
      fileCount: moduleData.relatedFilePathListLength,
    }, optionFlags.skipConfirmation) &&
      deleteFile(
        moduleData.relatedFilePathList,
        (filePath: string) => {
          displayResultMessage({ id: ResultId.DeletedFile, filePath });
        },
      );

    Deno.exit();
  }

  // Output module list and results for url, leaves, and uses options
  displayCachedModuleList(moduleData, optionFlags);
  displayResultMessage({
    id: ResultId.FoundModule,
    moduleCount,
    fileCount: optionFlags.withPath ? moduleData.relatedFilePathListLength : undefined,
  });
  displaySearchCriteria(optionFlags, target);
  displaySearchLocation();
}

main();
