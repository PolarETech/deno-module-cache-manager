// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import {
  isDirectoryExist,
  isFileExist,
  mergeObject,
  obtainValueFromMetadata,
  switchObjectKeyAndValue,
} from "./utils.ts";

import { Target } from "./options.ts";
import { buildBaseFilePath } from "./location.ts";

import {
  obtainDepsData,
  obtainDepsDataFromCachedImportMap,
  obtainDepsDataFromSpecifiedImportMap,
} from "./module_deps.ts";

type CachedModuleData = {
  [url: string]: {
    hash: string;
    target: boolean;
    date?: string;
    location?: string;
    types?: string;
    relatedFilePath?: string[];
    uses?: string[];
  };
};

export class ModuleData {
  data: CachedModuleData = {};

  get allUrlList(): string[] {
    return Object.keys(this.data);
  }

  get targetedUrlList(): string[] {
    return this.allUrlList.filter((v) => this.data[v].target);
  }

  get sortedUrlList(): string[] {
    return this.targetedUrlList.sort();
  }

  get sortedUrlListByDate(): string[] {
    return this.sortedUrlList
      .sort((v1, v2) => {
        return (this.data[v1].date ?? "0") > (this.data[v2].date ?? "0") ? -1 : 1;
      });
  }

  get targetedUrlListLength(): number {
    return this.targetedUrlList.length;
  }

  get maxUrlStringLength(): number {
    return this.targetedUrlList
      .reduce((v1, v2) => Math.max(v1, v2.length), 0);
  }

  get relatedFilePathList(): string[] {
    return this.targetedUrlList
      .flatMap((v) => this.data[v].relatedFilePath ?? []);
  }

  get relatedFilePathListLength(): number {
    return this.targetedUrlList
      .reduce((v1, v2) => v1 + (this.data[v2].relatedFilePath?.length ?? 0), 0);
  }

  get locationDataSpecifiedInHeader(): Record<string, string> {
    return this.allUrlList
      .filter((v) => this.data[v].location)
      .reduce((object: Record<string, string>, v) => {
        object[v] = this.data[v].location!;
        return object;
      }, {});
  }

  get typesDataSpecifiedInHeader(): Record<string, string> {
    return this.allUrlList
      .filter((v) => this.data[v].types)
      .reduce((object: Record<string, string>, v) => {
        object[v] = this.data[v].types!;
        return object;
      }, {});
  }

  get cachedJsonFileUrlAndHashList(): { url: string; hash: string }[] {
    return this.allUrlList
      .filter((v) => v.endsWith(".json"))
      .map((v) => ({ url: v, hash: this.data[v].hash }));
  }

  date(url: string): string | undefined {
    return this.data[url].date;
  }

  relatedFilePath(url: string): string[] {
    return this.data[url].relatedFilePath ?? [];
  }

  uses(url: string): string[] {
    return this.data[url].uses?.sort() ?? [];
  }

  collectModule(depsPath: string, target: Target): void {
    if (depsPath.endsWith("/")) depsPath = depsPath.slice(0, -1);
    if (isDirectoryExist(depsPath) === false) return;

    for (const dirEntry of Deno.readDirSync(depsPath)) {
      if (dirEntry.isDirectory) {
        const subDir = `${depsPath}/${dirEntry.name}`;
        this.collectModule(subDir, target);
        continue;
      }

      if (dirEntry.isFile && dirEntry.name.endsWith(".metadata.json")) {
        const metadata = obtainValueFromMetadata(`${depsPath}/${dirEntry.name}`);
        const url = metadata.url;
        if (url === undefined) continue;

        this.data[url] = {
          hash: dirEntry.name.replace(".metadata.json", ""),
          target: target.url === undefined || url.includes(target.url),
          date: metadata.date,
          location: metadata.location,
          types: metadata.types,
        };

        if (this.data[url].target === false) continue;
        if ((target.newer ?? target.older ?? false) === false) continue;

        if (this.data[url].date === undefined) {
          this.data[url].target = false;
          continue;
        }
        if (target.newer && this.data[url].date! < target.newer) {
          this.data[url].target = false;
          continue;
        }
        if (target.older && this.data[url].date! > target.older) {
          this.data[url].target = false;
          continue;
        }
      }
    }
  }

  collectRelatedFilePath(): void {
    const extensionsInDeps = ["", ".metadata.json"];

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
    // Extension-related processing is also present in the missing_url.ts file.
    const extensionsInGen = [".d.ts", ".js", ".js.map", ".buildinfo", ".meta"];

    for (const url of this.targetedUrlList) {
      const {
        depsHashedPath,
        genHashedPath,
        genUrlPath,
      } = buildBaseFilePath(url, this.data[url].hash);

      const depsPathList = extensionsInDeps
        .map((ext) => depsHashedPath + ext);

      const genPathList = [genHashedPath, genUrlPath]
        .flatMap((path) => extensionsInGen.map((ext) => path + ext));

      this.data[url].relatedFilePath = [...depsPathList, ...genPathList]
        .filter((path) => isFileExist(path));
    }
  }

  async collectUsesModule(
    importMapLocationList?: Set<string>,
  ): Promise<void> {
    const cachedJsonFileList = this.cachedJsonFileUrlAndHashList; // candidate import map files
    const mapDeps1 = cachedJsonFileList.length
      ? obtainDepsDataFromCachedImportMap(cachedJsonFileList)
      : {};
    const mapDeps2 = importMapLocationList
      ? await obtainDepsDataFromSpecifiedImportMap(importMapLocationList)
      : {};
    const mapsData = switchObjectKeyAndValue(mergeObject(mapDeps1, mapDeps2));

    const deps1 = await obtainDepsData(this.allUrlList);
    const deps2 = this.locationDataSpecifiedInHeader;
    const deps3 = this.typesDataSpecifiedInHeader;
    const usesData = switchObjectKeyAndValue(mergeObject(deps1, deps2, deps3));

    for (const url of this.targetedUrlList) {
      const collectedDepsData: Set<string> = usesData[url] ?? new Set();

      // Reflect import maps
      for (const [key, value] of Object.entries(mapsData)) {
        if (url.startsWith(key)) {
          value.forEach(Set.prototype.add, collectedDepsData);
        }
      }
      this.data[url].uses = [...collectedDepsData];
    }
  }

  async extractLeavesModule(importMapLocationList?: Set<string>): Promise<void> {
    await this.collectUsesModule(importMapLocationList);
    for (const url of this.targetedUrlList) {
      if (this.data[url].uses?.length) {
        this.data[url].target = false;
      }
    }
  }
}
