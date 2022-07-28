// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { ModuleData } from "./moduleData.ts";
import { displayResultMessage, ResultId } from "./messages.ts";

// TODO:
// Empty folders are not deleted
export function deleteFile(moduleData: ModuleData): void {
  const filePathList = moduleData.relatedFilePathList;

  for (const path of filePathList) {
    try {
      Deno.removeSync(path);
      displayResultMessage({ name: ResultId.DeletedFile, filePath: path });
    } catch (e) {
      console.error(e);
      Deno.exit(1);
    }
  }
}
