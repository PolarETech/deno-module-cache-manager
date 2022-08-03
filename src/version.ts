// Copyright 2022 Polar Tech. All rights reserved. MIT license.

export const SCRIPT_VERSION = "0.4.0";
export const MIN_DENO_VERSION = "1.2.0";

export function checkDenoVersion(version: string): boolean {
  const requiredVersion = version.split(".").map((n) => Number(n));
  const currentVersion = Deno.version.deno.split(".").map((n) => Number(n));

  for (let i = 0; i <= 2; i++) {
    if (currentVersion[i] > requiredVersion[i]) return true;
    if (currentVersion[i] < requiredVersion[i]) return false;
  }

  return true;
}
