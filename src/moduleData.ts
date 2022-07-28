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
import { obtainDepsData } from "./moduleDeps.ts";

type CachedModuleData = {
  [key: string]: {
    hash: string;
    target: boolean;
    date?: string;
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
    return Object.keys(this.data).filter((v) => this.data[v].target);
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

  get typesDataSpecifiedInHeader(): { [key: string]: string } {
    return this.allUrlList
      .filter((v) => this.data[v].types)
      .reduce((object: { [key: string]: string }, v) => {
        object[v] = this.data[v].types ?? "";
        return object;
      }, {});
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
    const extentionsInDeps = ["", ".metadata.json"];

    // REVIEW:
    // I have never seen .d.ts file created in the gen/http(s) directory.
    // Is it necessary to handle the .d.ts extention?
    // https://github.com/denoland/deno/blob/v1.20.1/cli/cache.rs#L186
    const extentionsInGen = [".d.ts", ".js", ".js.map", ".buildinfo", ".meta"];

    for (const url of this.targetedUrlList) {
      const {
        depsHashedPath,
        genHashedPath,
        genUrlPath,
      } = buildBaseFilePath(url, this.data[url].hash);

      const pathList = [];

      for (const ext of extentionsInDeps) {
        pathList.push(depsHashedPath + ext);
      }

      for (const path of [genHashedPath, genUrlPath]) {
        for (const ext of extentionsInGen) {
          pathList.push(path + ext);
        }
      }

      this.data[url].relatedFilePath = pathList
        .filter((path) => isFileExist(path));
    }
  }

  async collectUsesModule(): Promise<void> {
    const deps1 = await obtainDepsData(this.allUrlList);
    const deps2 = this.typesDataSpecifiedInHeader;
    const usesData = switchObjectKeyAndValue(mergeObject(deps1, deps2));

    for (const url of this.targetedUrlList) {
      this.data[url].uses = usesData[url] ? [...usesData[url]] : [];
    }
  }

  async extractLeavesModule(): Promise<void> {
    await this.collectUsesModule();
    for (const url of this.targetedUrlList) {
      if (this.data[url].uses?.length ?? 0 > 0) {
        this.data[url].target = false;
      }
    }
  }
}
