// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { location } from "./location.ts";
import { isDirectoryExist, isFileExist } from "./utils.ts";

// WARNING:
// This function does not collect compiled files
// created by Deno v1.2.2 or earlier, whose file names are not hashed.
// If it eventually becomes necessary, its implementation should be considered separately.
// https://github.com/denoland/deno/pull/6911
function collectAllHashedFilePath(): string[] {
  const baseDirList = [
    `${location.baseDepsPath}/https`,
    `${location.baseDepsPath}/http`,
    `${location.baseGenPath}/https`,
    `${location.baseGenPath}/http`,
  ];

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

  // NOTE:
  // (Past Notes)
  // I have never seen .d.ts file created in the gen/http(s) directory.
  // Is it necessary to handle the .d.ts extension?
  // https://github.com/denoland/deno/blob/v1.20.1/cli/cache.rs#L186
  //
  // (Update Notes)
  // .d.ts extension is removed from Deno source code at v1.23.0.
  // https://github.com/denoland/deno/commit/0b90e966c5e22b95c283a10407234cad37b8f19b
  //
  // .buildinfo extension is removed from Deno source code at v1.24.0.
  // https://github.com/denoland/deno/pull/15118/files#diff-0fab6cf2f78858285fdf1c7991480f8d39f6356900d8e22b2c370909e8d8e917
  //
  // In the user's environment, there may exist the cache files
  // with the above extensions stored in the past.
  // Therefore, we should not exclude them from the processing.
  //
  // TODO:
  // Extension-related processing is also present in the moduleData.ts file.
  const regexpToRemoveExt = new RegExp(/\.d\.ts$|\.js$|\.js\.map$|\.buildinfo$|\.meta$/);

  const pathListWithMissingURL: string[] = [];
  for (const path of pathList) {
    if (path.startsWith(location.baseDepsPath) && path.endsWith(".metadata.json")) continue;

    const adjustedPath = path.replace(regexpToRemoveExt, "");
    const depsMetadataFilePath = adjustedPath
      .replace(location.baseGenPath, location.baseDepsPath) + metadataExt;

    if (isFileExist(depsMetadataFilePath)) continue;
    pathListWithMissingURL.push(path);
  }

  return pathListWithMissingURL;
}
