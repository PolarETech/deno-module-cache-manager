// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { DenoInfo } from "./deno_info.ts";

class CacheLocation {
  baseDepsPath = "";
  baseGenPath = "";

  async storeCacheLocation(): Promise<void> {
    const denoInfo = await DenoInfo.obtainCacheLocation();
    this.baseDepsPath = denoInfo.baseDepsPath;
    this.baseGenPath = denoInfo.baseGenPath;
  }
}

const location = new CacheLocation();
Object.seal(location);
export { location };

type BaseFilePath = {
  depsHashedPath: string;
  genHashedPath: string;
  genUrlPath: string;
};

export function buildBaseFilePath(
  url: string,
  hash: string,
): BaseFilePath {
  const parsedUrl = new URL(url);

  const protocolDirName = parsedUrl.protocol.slice(0, -1); // remove trailing letter ":"
  const portString = parsedUrl.port ? `_PORT${parsedUrl.port}` : "";
  const hostDirName = parsedUrl.hostname + portString;
  const pathName = parsedUrl.pathname.slice(1); // remove leading letter "/"

  const depsHashedPath = [location.baseDepsPath, protocolDirName, hostDirName, hash].join("/");
  const genHashedPath = [location.baseGenPath, protocolDirName, hostDirName, hash].join("/");

  // For compiler cache files created by Deno v1.2.2 or earlier
  // https://github.com/denoland/deno/pull/6911
  const genUrlPath = [location.baseGenPath, protocolDirName, hostDirName, pathName].join("/");

  return { depsHashedPath, genHashedPath, genUrlPath };
}
