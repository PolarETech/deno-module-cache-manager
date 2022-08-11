// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { displayResultMessage, ResultId } from "./messages.ts";

// TODO:
// Empty folders are not deleted
export function deleteFile(pathList: string[]): void {
  pathList.forEach((path) => {
    Deno.removeSync(path);
    displayResultMessage({ id: ResultId.DeletedFile, filePath: path });
  });
}
