// Copyright 2022 Polar Tech. All rights reserved. MIT license.

// TODO:
// Empty folders are not deleted
export function deleteFile(
  pathList: string[],
  callback?: (path: string) => void,
): void {
  pathList.forEach((path) => {
    Deno.removeSync(path);
    callback && callback(path);
  });
}
