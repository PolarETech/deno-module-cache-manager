// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals } from "../tests/deps.ts";
import { checkDenoVersion } from "./version.ts";

Deno.test({
  name: "check deno version #1 - same version",
  fn() {
    const version = Deno.version.deno;
    assertEquals(checkDenoVersion(version), true);
  },
});

Deno.test({
  name: "check deno version #2 - lower version",
  fn() {
    const tempVersion = Deno.version.deno
      .split(".")
      .map((n) => Number(n));

    tempVersion[2] > 0
      ? tempVersion[2]--
      : tempVersion[1] > 0
      ? tempVersion[1]--
      : tempVersion[0]--;

    const version = tempVersion.join(".");

    assertEquals(checkDenoVersion(version), true);
  },
});

Deno.test({
  name: "check deno version #3 - higher version",
  fn() {
    const version = Deno.version.deno
      .split(".")
      .map((n, i) => i === 2 ? Number(n) + 1 : Number(n))
      .join(".");

    assertEquals(checkDenoVersion(version), false);
  },
});
