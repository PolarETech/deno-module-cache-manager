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
  const jsonData = (() => {
    try {
      const text = Deno.readTextFileSync(metadataFilePath);
      return JSON.parse(text);
    } catch (_e) {
      return undefined;
    }
  })();

  if (jsonData === undefined) return {};

  const url = jsonData.url;

  const date = (() => {
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

  const location = (() => {
    if (jsonData.headers?.location === undefined) return undefined;
    try {
      return new URL(jsonData.headers.location, url).href;
    } catch (_e) {
      return undefined;
    }
  })();

  // URL of .d.ts file specified in x-typescript-types header
  const types = (() => {
    if (jsonData.headers?.["x-typescript-types"] === undefined) return undefined;
    try {
      return new URL(jsonData.headers["x-typescript-types"], url).href;
    } catch (_e) {
      return undefined;
    }
  })();

  return { url, date, location, types };
}

export async function fetchJsonFile(url: string, timeout = 45000): Promise<unknown> {
  const res = await (async () => {
    let timer = 0;
    try {
      // NOTE:
      // Before Deno v1.11.0, aborting fetch requests was not supported.
      // https://github.com/denoland/deno/issues/7019
      //
      // Since Deno v1.20.1, AbortSignal.timeout() has been supported.
      // However, we do not add implementations for v1.20.1 or later at this time
      // to avoid complicating the code.
      if (checkDenoVersion("1.11.0") === false) return await fetch(url);

      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), timeout);
      return await fetch(url, { signal: controller.signal });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        const error = new Error("Fetch request has timed out");
        error.name = "TimeoutError";
        throw error;
      }
      throw e;
    } finally {
      timer && clearTimeout(timer);
    }
  })();

  if (res.ok) {
    try {
      return await res.json();
    } catch (_e) {
      const error = new Error("The specified resource is not a valid JSON file");
      error.name = "TypeError";
      throw error;
    }
  }

  res.body?.cancel();

  throw new Error(
    "Failed to fetch\n" +
      `Response Status: ${res.status} ${res.statusText}`,
  );
}

export function readJsonFile(path: string): unknown {
  const text = Deno.readTextFileSync(path);

  try {
    return JSON.parse(text);
  } catch (_e) {
    const error = new Error("The specified resource is not a valid JSON file");
    error.name = "TypeError";
    throw error;
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
  const regexpToVerifyDateString =
    /^\d{1,4}[-/]\d{1,2}(([-/]\d{1,2})?|[-/]\d{1,2}[T ]\d{1,2}((:\d{1,2}){0,2}|(:\d{1,2}){2}\.\d{1,3}))\D*$/;

  if (regexpToVerifyDateString.test(dateString) === false) return undefined;

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
 * Merge multiple objects.
 * @param objArray
 * @returns Object merged from multiple objects
 */
export function mergeObject(
  ...objArray: Record<string, string | Set<string>>[]
): Record<string, Set<string>> {
  const mergedObj: Record<string, Set<string>> = {};

  for (const obj of objArray) {
    for (const [key, value] of Object.entries(obj)) {
      mergedObj[key] ?? (mergedObj[key] = new Set());
      if (typeof value === "string") {
        mergedObj[key].add(value);
      } else {
        value.forEach(Set.prototype.add, mergedObj[key]);
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
  obj: Record<string, Set<string>>,
): Record<string, Set<string>> {
  const switchedObj: Record<string, Set<string>> = {};

  for (const [key, value] of Object.entries(obj)) {
    for (const v of value) {
      switchedObj[v] ?? (switchedObj[v] = new Set());
      switchedObj[v].add(key);
    }
  }

  return switchedObj;
}
