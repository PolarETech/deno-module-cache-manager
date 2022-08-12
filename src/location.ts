// Copyright 2022 Polar Tech. All rights reserved. MIT license.

class CacheLocation {
  baseDepsPath = "";
  baseGenPath = "";

  async obtainCacheLocation(): Promise<void> {
    // NOTE:
    // "--json" option with "deno info" was unstable before Deno v1.10
    const process = Deno.run({
      cmd: [Deno.execPath(), "info", "--json", "--unstable"],
      stdout: "piped",
      stderr: "piped",
    });

    const [stderr, stdout, status] = await Promise.all([
      process.stderrOutput(),
      process.output(),
      process.status(),
    ]);

    let output: string;

    if (status.success) {
      output = new TextDecoder().decode(stdout);
      process.close();
    } else {
      const errorString = new TextDecoder().decode(stderr);
      console.error(errorString);
      process.close();
      Deno.exit(status.code);
    }

    const jsonData = JSON.parse(output);

    this.baseDepsPath = jsonData.modulesCache;
    this.baseGenPath = jsonData.typescriptCache;
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
