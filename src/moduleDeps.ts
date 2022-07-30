// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { Semaphore } from "./utils.ts";
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
