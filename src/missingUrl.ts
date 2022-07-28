// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { baseDepsPath, baseGenPath } from "./main.ts";
import { isDirectoryExist, isFileExist } from "./utils.ts";

// WARNING:
// This function does not collect compiled files
// created by Deno v1.2.2 or earlier, whose file names are not hashed.
// If it eventually becomes necessary, its implementation should be considered separately.
// https://github.com/denoland/deno/pull/6911
function collectAllHashedFilePath(type = ""): string[] {
  const baseDirList = (() => {
    switch (type) {
      case "modulesCache":
        return [
          `${baseDepsPath}/https`,
          `${baseDepsPath}/http`,
        ];
      case "typescriptCache":
        return [
          `${baseGenPath}/https`,
          `${baseGenPath}/http`,
        ];
      default:
        return [
          `${baseDepsPath}/https`,
          `${baseDepsPath}/http`,
          `${baseGenPath}/https`,
          `${baseGenPath}/http`,
        ];
    }
  })();

  const hostDirList: string[] = [];
  for (const baseDir of baseDirList) {
    if (isDirectoryExist(baseDir) === false) continue;
    for (const dirEntry of Deno.readDirSync(baseDir)) {
      if (dirEntry.isDirectory === false) continue;
      hostDirList.push(`${baseDir}/${dirEntry.name}`);
    }
  }

  const pathList: string[] = [];
  for (const hostDir of hostDirList) {
    for (const dirEntry of Deno.readDirSync(hostDir)) {
      if (dirEntry.isDirectory) continue;
      if (dirEntry.name.startsWith(".")) continue;
      pathList.push(`${hostDir}/${dirEntry.name}`);
    }
  }

  return pathList;
}

export function collectPathOfFileWithMissingURL(): string[] {
  const pathList = collectAllHashedFilePath();

  const metadataExt = ".metadata.json";

  // REVIEW:
  // I have never seen .d.ts file created in the gen/http(s) directory.
  // Is it necessary to handle the .d.ts extention?
  // https://github.com/denoland/deno/blob/v1.20.1/cli/cache.rs#L186
  const regexpToRemoveExt = new RegExp(/\.d\.ts$|\.js$|\.js\.map$|\.buildinfo$|\.meta$/);

  const pathListWithMissingURL: string[] = [];
  for (const path of pathList) {
    if (path.startsWith(baseDepsPath) && path.endsWith(".metadata.json")) continue;

    const adjustedPath = path.replace(regexpToRemoveExt, "");
    const depsMetadataFilePath = adjustedPath.replace(baseGenPath, baseDepsPath) + metadataExt;

    if (isFileExist(depsMetadataFilePath)) continue;
    pathListWithMissingURL.push(path);
  }

  return pathListWithMissingURL;
}
