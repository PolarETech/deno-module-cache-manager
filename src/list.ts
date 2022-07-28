// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { ModuleData } from "./moduleData.ts";
import { OptionFlags } from "./options.ts";

export function displayCachedModuleList(
  moduleData: ModuleData,
  optionFlags: OptionFlags,
): void {
  const sortedUrlList = optionFlags.sortDate
    ? moduleData.sortedUrlListByDate
    : moduleData.sortedUrlList;

  const maxUrlLength = optionFlags.withDate ? moduleData.maxUrlStringLength : 0;

  const { startBold, endBold } = (() => {
    if (Deno.noColor === false && (optionFlags.withPath || optionFlags.uses)) {
      return { startBold: "\x1b[1m", endBold: "\x1b[0m" };
    }
    return { startBold: "", endBold: "" };
  })();

  for (const url of sortedUrlList) {
    const urlString = `${startBold}${url}${endBold}`;

    const dateString = (() => {
      if (optionFlags.withDate) {
        const padding = " ".repeat(maxUrlLength - url.length + 2);
        return padding + (moduleData.date(url) ?? "Unknown");
      } else {
        return "";
      }
    })();

    console.log(urlString + dateString);

    if (optionFlags.withPath || optionFlags.uses) {
      const list = (() => {
        switch (true) {
          case optionFlags.withPath:
            return moduleData.relatedFilePath(url);
          case optionFlags.uses:
            return moduleData.uses(url);
          default:
            return [];
        }
      })();

      for (const value of list) {
        console.log(` - ${value}`);
      }
    }
  }
}
