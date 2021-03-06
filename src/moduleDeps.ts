// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { buildBaseFilePath } from "./location.ts";
import { fetchJsonFile, isFileExist, isValidUrl, readJsonFile, Semaphore } from "./utils.ts";
import { displayCursor, displayProgress } from "./messages.ts";
import { checkDenoVersion } from "./version.ts";

async function obtainDenoInfo(url: string, execPath: string): Promise<string> {
  // NOTE:
  // Output with "--json" option is difficult to use
  // because the format changes significantly depending on the Deno version.
  const process = Deno.run({
    cmd: [execPath, "info", "--unstable", url],
    env: { NO_COLOR: "1" },
    stdout: "piped",
    stderr: "piped",
  });

  // NOTE:
  // https://github.com/denoland/deno/issues/4568
  const [stderr, stdout, status] = await Promise.all([
    process.stderrOutput(),
    process.output(),
    process.status(),
  ]);

  if (status.success) {
    const output = new TextDecoder().decode(stdout);
    process.close();
    return output;
  } else {
    const errorString = new TextDecoder().decode(stderr);
    console.error(`\n\n${errorString.trim()}`);
    displayCursor();

    process.close();
    Deno.exit(status.code);
  }
}

type DepsData = { [key: string]: Set<string> };

// OPTIMIZE:
// If the number of cached modules is large,
// execution will take noticeably longer.
export async function obtainDepsData(
  urlList: string[],
): Promise<DepsData> {
  const collectedData: DepsData = {};

  const regexpToFilterUrl = (() => {
    // NOTE:
    // The output format of "deno info" has been changed since Deno v1.4.0
    if (checkDenoVersion("1.4.0")) {
      return new RegExp("^\\S{3}\\shttps?://");
    } else {
      return new RegExp("^\\s{2}\\S{3}\\shttps?://");
    }
  })();

  const regexpToRemoveBeforeUrl = new RegExp("^.*?\\shttp");
  const regexpToRemoveAfterUrl = new RegExp("\\s.*$");

  const execPath = Deno.execPath();

  let counter = 0;
  const total = urlList.length;
  displayProgress(counter, total, "modules checked");

  const semaphore = new Semaphore(5);

  await Promise.all(urlList.map(async (url) => {
    await semaphore.acquire();

    const denoInfo = await obtainDenoInfo(url, execPath);

    // WARNING:
    // If the output format of "deno info" changes in the future,
    // this function may not work as expected.
    const depsUrlList = new Set(
      denoInfo
        .split("\n")
        .filter((line) => regexpToFilterUrl.test(line))
        .map((line) => {
          return line
            .trim()
            .replace(regexpToRemoveBeforeUrl, "http")
            .replace(regexpToRemoveAfterUrl, "");
        }),
    );

    collectedData[url] = depsUrlList;

    semaphore.release();

    displayProgress(++counter, total, "modules checked");
  }));

  return collectedData;
}

type ImportMap = {
  imports?: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
};

// TODO: Refactor
// References: https://wicg.github.io/import-maps/
function obtainUrlFromImportMapData(
  jsonData: ImportMap,
  ignoreError = false,
): Set<string> {
  const collectedList: Set<string> = new Set();

  const isKeyValueObject = ((data: unknown) => {
    return (
      typeof data !== "object" ||
      data === null ||
      Array.isArray(data)
    );
  });

  const _extractUrlInImports = (() => {
    if (jsonData.imports === undefined) return;

    if (isKeyValueObject(jsonData.imports)) {
      if (ignoreError) return;
      throw new TypeError(
        `The "imports" top-level key should be a JSON object\n` +
          `"imports":${JSON.stringify(jsonData.imports)}`,
      );
    }

    for (const v of Object.values(jsonData.imports)) {
      if (typeof v === "string") {
        // Omit key string validation
        if (isValidUrl(v)) collectedList.add(v);
      }
    }
  })();

  const _extractUrlInScopes = (() => {
    if (jsonData.scopes === undefined) return;

    if (isKeyValueObject(jsonData.scopes)) {
      if (ignoreError) return;
      throw new TypeError(
        `The "scopes" top-level key should be a JSON object\n` +
          `"scopes":${JSON.stringify(jsonData.scopes)}`,
      );
    }

    for (const [prefix, map] of Object.entries(jsonData.scopes)) {
      if (isKeyValueObject(map)) {
        if (ignoreError) continue;
        throw new TypeError(
          `The value of the scope should be a JSON object\n` +
            `"${prefix}":${JSON.stringify(map)} in ` +
            `"scopes":${JSON.stringify(jsonData.scopes)}`,
        );
      }

      for (const v of Object.values(map)) {
        if (typeof v === "string") {
          // Omit key string validation
          if (isValidUrl(v)) collectedList.add(v);
        }
      }
    }
  })();

  return collectedList;
}

export async function obtainDepsDataFromRemoteImportMap(
  importMapUrlList: Set<string>,
): Promise<DepsData> {
  const collectedData: DepsData = {};

  for (const url of importMapUrlList) {
    try {
      const jsonData = await (async () => {
        if (isValidUrl(url)) {
          return await fetchJsonFile(url) as ImportMap;
        }
        if (isFileExist(url)) {
          return readJsonFile(url) as ImportMap;
        }
        throw new Error("The specified import map URL or path is invalid");
      })();

      collectedData[url] = obtainUrlFromImportMapData(jsonData);
    } catch (e) {
      console.error("Loading import map:", url);
      console.error(e);
      Deno.exit(1);
    }
  }

  return collectedData;
}

// NOTE:
// It is assumed that the import map files are cached by tools such as Trex.
export function obtainDepsDataFromCachedImportMap(
  jsonFileList: { url: string; hash: string }[],
): DepsData {
  const collectedData: DepsData = {};

  for (const file of jsonFileList) {
    const importMapFilePath = buildBaseFilePath(file.url, file.hash).depsHashedPath;

    // JSON files that are not ???or import maps may be cached.
    // Therefore, the process continues
    // even if there are invalid JSON files as import maps.
    const jsonData: ImportMap | undefined = (() => {
      try {
        const text = Deno.readTextFileSync(importMapFilePath);
        return JSON.parse(text);
      } catch (_e) {
        return undefined;
      }
    })();

    if (jsonData === undefined) continue;
    collectedData[file.url] = obtainUrlFromImportMapData(jsonData, true);
  }

  return collectedData;
}
