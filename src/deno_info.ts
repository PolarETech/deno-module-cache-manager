// Copyright 2022 Polar Tech. All rights reserved. MIT license.

export class DenoInfo {
  static execPath = Deno.execPath();

  static async obtainCacheLocation(): Promise<{ baseDepsPath: string; baseGenPath: string }> {
    // NOTE:
    // "--json" option with "deno info" was unstable before Deno v1.10
    const process = Deno.run({
      cmd: [this.execPath, "info", "--json", "--unstable"],
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

    const baseDepsPath = jsonData.modulesCache;
    const baseGenPath = jsonData.typescriptCache;

    return { baseDepsPath, baseGenPath };
  }

  static async obtainModuleInfo(url: string, errorCallback?: () => void): Promise<string> {
    // NOTE:
    // Output with "--json" option is difficult to use
    // because the format changes significantly depending on the Deno version.
    const process = Deno.run({
      cmd: [this.execPath, "info", "--unstable", url],
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
      errorCallback && errorCallback();

      process.close();
      Deno.exit(status.code);
    }
  }
}
