// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals } from "../tests/deps.ts";
import { location } from "./location.ts";
import { collectPathOfFileWithMissingURL } from "./missing_url.ts";

const testdataDir = (() => {
  const testdataUrl = new URL("../tests/testdata/", import.meta.url);
  return Deno.build.os === "windows"
    ? testdataUrl.pathname.slice(1) // remove leading letter "/"
    : testdataUrl.pathname;
})();

Deno.test({
  name: "collect missing url files #1 listed",
  permissions: { read: true },
  fn() {
    location.baseDepsPath = testdataDir + "missing_url/cache/deps";
    location.baseGenPath = testdataDir + "missing_url/cache/gen";

    const expected = [
      location.baseDepsPath +
      "/http/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99",
      location.baseGenPath +
      "/http/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99.buildinfo",
      location.baseGenPath +
      "/http/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99.d.ts",
      location.baseGenPath +
      "/http/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99.js",
      location.baseGenPath +
      "/http/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99.js.map",
      location.baseGenPath +
      "/http/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99.meta",
      location.baseDepsPath +
      "/https/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99",
      location.baseGenPath +
      "/https/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99.buildinfo",
      location.baseGenPath +
      "/https/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99.d.ts",
      location.baseGenPath +
      "/https/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99.js",
      location.baseGenPath +
      "/https/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99.js.map",
      location.baseGenPath +
      "/https/example.com/9027edfbe896b4facc5e14b1f48d81c2c788dd8e5efde4261a3044a972a93f99.meta",
    ];

    const actual = collectPathOfFileWithMissingURL();

    expected.forEach((expectedPath) => {
      assertEquals(
        actual.includes(expectedPath),
        true,
        `The file "${expectedPath}" should be listed`,
      );
    });

    // cleanup
    location.baseDepsPath = "";
    location.baseGenPath = "";
  },
});

Deno.test({
  name: "collect missing url files #2 unlisted",
  permissions: { read: true },
  fn() {
    location.baseDepsPath = testdataDir + "missing_url/cache/deps";
    location.baseGenPath = testdataDir + "missing_url/cache/gen";

    const expected = [
      location.baseDepsPath +
      "/http/example.com/bc0af984da426f2107fbbe85be4929b997e12191cec0daaf2a4a04c0e7e28a34.metadata.json",
      location.baseGenPath +
      "/http/example.com/bc0af984da426f2107fbbe85be4929b997e12191cec0daaf2a4a04c0e7e28a34.js",
      location.baseDepsPath +
      "/https/example.com/bc0af984da426f2107fbbe85be4929b997e12191cec0daaf2a4a04c0e7e28a34.metadata.json",
      location.baseGenPath +
      "/https/example.com/bc0af984da426f2107fbbe85be4929b997e12191cec0daaf2a4a04c0e7e28a34.js",
    ];

    const actual = collectPathOfFileWithMissingURL();

    expected.forEach((expectedPath) => {
      assertEquals(
        actual.includes(expectedPath),
        false,
        `The file "${expectedPath}" should not be listed`,
      );
    });

    // cleanup
    location.baseDepsPath = "";
    location.baseGenPath = "";
  },
});
