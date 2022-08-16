// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals } from "../tests/deps.ts";
import { buildBaseFilePath, location } from "./location.ts";

Deno.test({
  name: "store cache location #1 - deps and gen (with stubbed deno info)",
  async fn() {
    await location.storeCacheLocation();

    assertEquals(location.baseDepsPath, "/deno-dir/deps");
    assertEquals(location.baseGenPath, "/deno-dir/gen");

    // cleanup
    location.baseDepsPath = "";
    location.baseGenPath = "";
  },
});

Deno.test({
  name: "build base file path #1 - protocol host path",
  fn() {
    location.baseDepsPath = "/foo/bar";
    location.baseGenPath = "/bar/baz";

    const url = "https://example.com/dummy/mod.ts";
    const hash = "9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99";

    const expected = {
      depsHashedPath: `/foo/bar/https/example.com/${hash}`,
      genHashedPath: `/bar/baz/https/example.com/${hash}`,
      genUrlPath: "/bar/baz/https/example.com/dummy/mod.ts",
    };

    const actual = buildBaseFilePath(url, hash);

    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
    location.baseGenPath = "";
  },
});

Deno.test({
  name: "build base file path #2 - protocol port host path",
  fn() {
    location.baseDepsPath = "/foo/bar";
    location.baseGenPath = "/bar/baz";

    const url = "https://example.com:8088/dummy/mod.ts";
    const hash = "9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99";

    const expected = {
      depsHashedPath: `/foo/bar/https/example.com_PORT8088/${hash}`,
      genHashedPath: `/bar/baz/https/example.com_PORT8088/${hash}`,
      genUrlPath: "/bar/baz/https/example.com_PORT8088/dummy/mod.ts",
    };

    const actual = buildBaseFilePath(url, hash);

    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
    location.baseGenPath = "";
  },
});
