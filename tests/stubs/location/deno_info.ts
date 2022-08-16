// Copyright 2022 Polar Tech. All rights reserved. MIT license.

export class DenoInfo {
  static async obtainCacheLocation(): Promise<{ baseDepsPath: string; baseGenPath: string }> {
    const data = {
      baseDepsPath: "/deno-dir/deps",
      baseGenPath: "/deno-dir/gen",
    };
    return await new Promise((resolve) => resolve(data));
  }
}
