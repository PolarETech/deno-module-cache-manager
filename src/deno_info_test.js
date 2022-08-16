// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals } from "../tests/deps.ts";
import { DenoInfo } from "./deno_info.ts";

// NOTE:
// Have to keep in mind that the tests may be broken
// due to specification changes for Deno version upgrades.

Deno.test({
  name: "deno info #1 - cache info (modulesCache)",
  permissions: { run: true },
  async fn() {
    const regexpToVerifyDeps = /.+(?:\/|\\)deps$/;

    const actual = await DenoInfo.obtainCacheLocation();

    assertEquals(
      regexpToVerifyDeps.test(actual.baseDepsPath),
      true,
      "deps location cannot be obtained",
    );
  },
});

Deno.test({
  name: "deno info #2 - cache info (typescriptCache)",
  permissions: { run: true },
  async fn() {
    const regexpToVerifyGen = /.+(?:\/|\\)gen$/;

    const actual = await DenoInfo.obtainCacheLocation();

    assertEquals(
      regexpToVerifyGen.test(actual.baseGenPath),
      true,
      "gen location cannot be obtained",
    );
  },
});

Deno.test({
  name: "deno info #3 module info",
  permissions: { run: true },
  async fn() {
    const url = "https://deno.land/std@0.130.0/testing/asserts.ts";

    const actual = await DenoInfo.obtainModuleInfo([url]);

    assertEquals(actual.includes("https://deno.land/std@0.130.0/testing/asserts.ts"), true);
    assertEquals(actual.includes("├── https://deno.land/std@0.130.0/fmt/colors.ts"), true);
    assertEquals(actual.includes("└── https://deno.land/std@0.130.0/testing/_diff.ts"), true);
  },
});
