// Copyright 2022 Polar Tech. All rights reserved. MIT license.

export class DenoInfo {
  static async obtainModuleInfo(url: string, _errorCallback?: () => void): Promise<string> {
    const data: Record<string, string> = {
      "https://example.com/dummy1/mod.ts":
        "local: /deno-dir/deps/https/example.com/70df6afede37c85584cf771fb66c04e0b987a763032b012d3b750ee214130d19\n" +
        "emit: /deno-dir/gen/https/example.com/70df6afede37c85584cf771fb66c04e0b987a763032b012d3b750ee214130d19.js\n" +
        "type: TypeScript\n" +
        "dependencies: 2 unique (total 34.5KB)\n" +
        "\n" +
        "https://example.com/dummy1/mod.ts (20.0KB)\n" +
        "├── https://example.com/dummy2/mod.ts (11.0KB)\n" +
        "└── https://example.com/dummy3/mod.js (3.5KB)\n",

      "https://example.com/dummy2/mod.ts":
        "local: /deno-dir/deps/https/example.com/bc0af984da426f2107fbbe85be4929b997e12191cec0daaf2a4a04c0e7e28a34\n" +
        "emit: /deno-dir/gen/https/example.com/bc0af984da426f2107fbbe85be4929b997e12191cec0daaf2a4a04c0e7e28a34.js\n" +
        "type: TypeScript\n" +
        "dependencies: 1 unique (total 14.5KB)\n" +
        "\n" +
        "https://example.com/dummy2/mod.ts (11.0KB)\n" +
        "└── https://example.com/dummy3/mod.js (3.5KB)\n",

      "https://example.com/dummy3/mod.js":
        "local: /deno-dir/deps/https/example.com/2594da3b61c98fedfbc0226b38b63a588a28ce87d179c4fae902adbb5d673541\n" +
        "type: JavaScript\n" +
        "dependencies: 0 unique (total 3.5KB)\n" +
        "\n" +
        "https://example.com/dummy3/mod.js (3.5KB)\n",
    };

    return await new Promise((resolve) => resolve(data[url] ?? ""));
  }
}
