// Copyright 2022 Polar Tech. All rights reserved. MIT license.

export {
  obtainDepsDataFromCachedImportMap,
  obtainDepsDataFromSpecifiedImportMap,
} from "../../../src/module_deps.ts";

type DepsData = Record<string, Set<string>>;

export async function obtainDepsData(
  urlList: string[],
): Promise<DepsData> {
  const collectedData: DepsData = {};

  const data: Record<string, string[]> = {
    "https://example.com/dummy1/dummy2/mod.ts": [
      "https://example.com/dummy2/index.js",
      "https://example.com/dummy3/mod.js",
    ],
    "https://example.com/dummy2@1.0.0/index.js": [
      "https://example.com/dummy3/mod.js",
    ],
  };

  urlList.forEach((url) => collectedData[url] = new Set(data[url] ?? []));

  return await new Promise((resolve) => resolve(collectedData));
}
