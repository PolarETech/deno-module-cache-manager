// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { checkDenoVersion } from "./version.ts";

export class Semaphore {
  counter: number;
  queue: (() => void)[];

  constructor(maxConcurrent = 1) {
    this.counter = maxConcurrent;
    this.queue = [];
  }

  try(): void {
    if (this.counter === 0) return;
    if (this.queue.length === 0) return;
    this.counter--;
    const resolve = this.queue.shift();
    resolve && resolve();
  }

  acquire(): Promise<void> {
    if (this.counter > 0) {
      this.counter--;
      return new Promise((resolve) => resolve());
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.counter++;
    this.try();
  }
}

type Metadata = {
  url?: string;
  date?: string;
  location?: string;
  types?: string;
};

export function obtainValueFromMetadata(metadataFilePath: string): Metadata {
  const metadata: Metadata = {};

  const jsonData = (() => {
    try {
      const text = Deno.readTextFileSync(metadataFilePath);
      return JSON.parse(text);
    } catch (_e) {
      return undefined;
    }
  })();

  if (jsonData === undefined) return metadata;

  metadata.url = jsonData.url;

  metadata.date = (() => {
    try {
      // NOTE:
      // SystemTime is not stored in metadata created by Deno v1.16.4 or earlier
      // https://github.com/denoland/deno/pull/13010
      return new Date(jsonData.now.secs_since_epoch * 1000).toISOString();
    } catch (_e) {
      // Proceed to read a date header instead of using SystemTime
    }
    try {
      return new Date(jsonData.headers.date).toISOString();
    } catch (_e) {
      return undefined;
    }
  })();

  metadata.location = (() => {
    if (jsonData.headers?.location === undefined) return undefined;

    const location = jsonData.headers.location;
    if (isValidUrl(location)) return location;

    try {
      const url = new URL(jsonData.url);
      return `${url.origin}${location}`;
    } catch (_e) {
      return undefined;
    }
  })();

  // URL of .d.ts file specified in x-typescript-types header
  metadata.types = (() => {
    if (jsonData.headers?.["x-typescript-types"] === undefined) return undefined;

    const types = jsonData.headers["x-typescript-types"];
    if (isValidUrl(types)) return types;

    try {
      const url = new URL(jsonData.url);
      return `${url.origin}${types}`;
    } catch (_e) {
      return undefined;
    }
  })();

  return metadata;
}

export async function fetchJsonFile(url: string, timeout = 45000): Promise<unknown> {
  try {
    const res = await (async () => {
      // NOTE:
      // Before Deno v1.11.0, aborting fetch requests was not supported.
      // https://github.com/denoland/deno/issues/7019
      //
      // Since Deno v1.20.1, AbortSignal.timeout() has been supported.
      // However, we do not add implementations for v1.20.1 or later at this time
      // to avoid complicating the code.
      if (checkDenoVersion("1.11.0")) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        const res = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timer);
        return res;
      } else {
        return await fetch(url);
      }
    })();

    if (res.ok === false) {
      throw new Error(
        "Failed to fetch\n" +
          `Response Status: ${res.status} ${res.statusText}`,
      );
    }

    return await res.json();
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      const error = new Error("Fetch request has timed out");
      error.name = "TimeoutError";
      throw error;
    } else if (e.name === "SyntaxError" && e.message.endsWith("not valid JSON")) {
      const error = new Error("The specified resource is not a JSON file");
      error.name = "TypeError";
      throw error;
    } else {
      throw e;
    }
  }
}

export function readJsonFile(path: string): unknown {
  try {
    const text = Deno.readTextFileSync(path);
    return JSON.parse(text);
  } catch (e) {
    if (e.name === "SyntaxError" && e.message.endsWith("not valid JSON")) {
      const error = new Error("The specified resource is not a JSON file");
      error.name = "TypeError";
      throw error;
    } else {
      throw e;
    }
  }
}

export function isFileExist(path: string): boolean {
  try {
    return Deno.lstatSync(path).isFile;
  } catch (_e) {
    return false;
  }
}

export function isDirectoryExist(path: string): boolean {
  try {
    return Deno.lstatSync(path).isDirectory;
  } catch (_e) {
    return false;
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Convert string to ISO format date string.
 * If the given string cannot be converted to Date object, return undefined.
 * @param dateString
 * @returns ISO format date string or undefined
 */
export function formatDateString(dateString: string): string | undefined {
  // Two values, year and monthIndex, are required
  const validInput =
    /^\d{1,4}[-/]\d{1,2}(([-/]\d{1,2})?|[-/]\d{1,2}[T ]\d{1,2}((:\d{1,2}){0,2}|(:\d{1,2}){2}\.\d{1,3}))\D*$/;

  if (validInput.test(dateString) === false) return undefined;

  const re = /\d+/g;
  const dateArray = dateString!
    .match(re)!
    .map((v) => Number.parseInt(v, 10)) as [
      number,
      number,
      number?,
      number?,
      number?,
      number?,
      number?,
    ];

  dateArray[1] -= 1; // adjust for monthIndex

  const dateObject = new Date(Date.UTC(...dateArray));
  return dateObject.toISOString();
}

/**
 * Merge two objects.
 * @param obj1
 * @param obj2
 * @returns Object merging obj1 and obj2
 */
export function mergeObject(
  obj1: { [key: string]: string | Set<string> },
  obj2: { [key: string]: string | Set<string> },
): { [key: string]: Set<string> } {
  const mergedObj: { [key: string]: Set<string> } = {};

  for (const obj of [obj1, obj2]) {
    for (const [key, value] of Object.entries(obj)) {
      if (mergedObj[key] === undefined) mergedObj[key] = new Set();

      if (typeof value === "string") {
        mergedObj[key].add(value);
      } else {
        value.forEach(mergedObj[key].add, mergedObj[key]);
      }
    }
  }

  return mergedObj;
}

/**
 * Switch key and value of an object.
 * @param obj
 * @returns Switched object
 */
export function switchObjectKeyAndValue(
  obj: { [key: string]: string | Set<string> },
): { [key: string]: Set<string> } {
  const switchedObj: { [key: string]: Set<string> } = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      if (switchedObj[value] === undefined) switchedObj[value] = new Set();
      switchedObj[value].add(key);
    } else {
      for (const v of value) {
        if (switchedObj[v] === undefined) switchedObj[v] = new Set();
        switchedObj[v].add(key);
      }
    }
  }

  return switchedObj;
}
