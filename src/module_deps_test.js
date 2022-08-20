// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals } from "../tests/deps.ts";
import { MockConsole, MockStdout } from "../tests/mocks/io.ts";
import { location } from "./location.ts";
import {
  obtainDepsData,
  obtainDepsDataFromCachedImportMap,
  obtainDepsDataFromSpecifiedImportMap,
} from "./module_deps.ts";

const testdataDir = (() => {
  const testdataUrl = new URL("../tests/testdata/", import.meta.url);
  return Deno.build.os === "windows"
    ? testdataUrl.pathname.slice(1) // remove leading letter "/"
    : testdataUrl.pathname;
})();

const mock = {
  console: new MockConsole(),
  stdout: new MockStdout(),
  exit: {
    _originalExit: Deno.exit,
    replaceExitFn() {
      Deno.exit = (code) => console.error(`**  call Deno.exit(${code}) **`);
    },
    restoreExitFn() {
      Deno.exit = this._originalExit;
    },
  },
};

Deno.test({
  name: "obtain deps data #1 listed (with stubbed deno info)",
  async fn() {
    const url1 = "https://example.com/dummy1/mod.ts";
    const url2 = "https://example.com/dummy2/mod.ts";
    const url3 = "https://example.com/dummy3/mod.js";

    const expected = {
      [url1]: new Set([
        "https://example.com/dummy2/mod.ts",
        "https://example.com/dummy3/mod.js",
      ]),
      [url2]: new Set([
        "https://example.com/dummy3/mod.js",
      ]),
      [url3]: new Set(),
    };

    const actual = await obtainDepsData([url1, url2, url3]);

    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "obtain deps data #2 display progress (with stubbed deno info)",
  async fn() {
    const url1 = "https://example.com/dummy1/mod.ts";
    const url2 = "https://example.com/dummy2/mod.ts";
    const url3 = "https://example.com/dummy3/mod.js";

    const expected = [
      "** call hideCursor **",
      " * 0 / 3 modules checked\r",
      " * 1 / 3 modules checked\r",
      " * 2 / 3 modules checked\r",
      " * 3 / 3 modules checked\r",
      "\x1b[2K",
      "** call showCursor **",
    ];

    mock.stdout.replaceWriteSyncFn();

    await obtainDepsData([url1, url2, url3]);

    assertEquals(mock.stdout.output, expected);

    // cleanup
    mock.stdout.restoreWriteSyncFn();
  },
});

Deno.test({
  name: "obtain specified import map #1 - imports valid (fetch)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/imports_valid.json`;

    const expected = {
      [url]: new Set([
        "https://example.com/dummy1/",
        "https://example.com/dummy2/mod.ts",
      ]),
    };

    const actual = await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "obtain specified import map #2 - scopes valid (fetch)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/scopes_valid.json`;

    const expected = {
      [url]: new Set([
        "https://example.com/scope1/dummy1/",
        "https://example.com/scope1/dummy2/mod.ts",
        "https://example.com/scope2/dummy/mod.ts",
      ]),
    };

    const actual = await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "obtain specified import map #3 - all valid (read)",
  permissions: { read: true },
  async fn() {
    const path = `${testdataDir}module_deps/cache/https/example.com/all_valid.json`;

    const expected = {
      [path]: new Set([
        "https://example.com/dummy1/",
        "https://example.com/dummy2/mod.ts",
        "https://example.com/scope1/dummy1/",
        "https://example.com/scope1/dummy2/mod.ts",
        "https://example.com/scope2/dummy/mod.ts",
      ]),
    };

    const actual = await obtainDepsDataFromSpecifiedImportMap(new Set([path]));

    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "obtain specified import map #4 - invalid (no throw)",
  permissions: { read: true },
  async fn() {
    const path1 = `${testdataDir}module_deps/cache/https/example.com/no_imports_and_scopes.json`;
    const path2 = `${testdataDir}module_deps/cache/https/example.com/empty_object.json`;
    const path3 = `${testdataDir}module_deps/cache/https/example.com/imports_non_string.json`;
    const path4 = `${testdataDir}module_deps/cache/https/example.com/scope_empty_object.json`;
    const path5 = `${testdataDir}module_deps/cache/https/example.com/scope_non_string.json`;

    const expected = {
      [path1]: new Set(),
      [path2]: new Set(),
      [path3]: new Set(),
      [path4]: new Set(),
      [path5]: new Set(),
    };

    const actual = await obtainDepsDataFromSpecifiedImportMap(
      new Set([path1, path2, path3, path4, path5]),
    );

    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "obtain specified import map #5 - location error",
  permissions: { read: true },
  async fn() {
    const path = `${testdataDir}module_deps/non-existing.json`;

    const expected = [
      `Loading import map: ${path}`,
      "Error",
      "The specified import map URL or path is invalid",
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([path]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain specified import map #6 - invalid json file",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/no_json_format.json`;

    const expected = [
      `Loading import map: ${url}`,
      "TypeError",
      "The specified resource is not a valid JSON file",
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain specified import map #7 - imports key is not a json object (text)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/imports_text.json`;

    const expected = [
      `Loading import map: ${url}`,
      "TypeError",
      `The "imports" top-level key should be a JSON object\n` +
      `"imports":"dummy"`,
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain specified import map #8 - imports key is not a json object (null)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/imports_null.json`;

    const expected = [
      `Loading import map: ${url}`,
      "TypeError",
      `The "imports" top-level key should be a JSON object\n` +
      `"imports":null`,
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain specified import map #9 - imports key is not a json object (array)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/imports_array.json`;

    const expected = [
      `Loading import map: ${url}`,
      "TypeError",
      `The "imports" top-level key should be a JSON object\n` +
      `"imports":[{"dummy1/":"https://example.com/dummy1/","mod":"https://example.com/dummy2/mod.ts"}]`,
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain specified import map #10 - scopes key is not a json object (text)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/scopes_text.json`;

    const expected = [
      `Loading import map: ${url}`,
      "TypeError",
      `The "scopes" top-level key should be a JSON object\n` +
      `"scopes":"dummy"`,
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain specified import map #11 - scopes key is not a json object (null)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/scopes_null.json`;

    const expected = [
      `Loading import map: ${url}`,
      "TypeError",
      `The "scopes" top-level key should be a JSON object\n` +
      `"scopes":null`,
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain specified import map #12 - scopes key is not a json object (array)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/scopes_array.json`;

    const expected = [
      `Loading import map: ${url}`,
      "TypeError",
      `The "scopes" top-level key should be a JSON object\n` +
      `"scopes":[{"/scope1/":{"dummy1/":"https://example.com/scope1/dummy1/",` +
      `"mod":"https://example.com/scope1/dummy2/mod.ts"},` +
      `"/scope2/":{"dummy":"https://example.com/scope2/dummy/mod.ts"}}]`,
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain specified import map #13 - scope key is not a json object (text)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/scope_text.json`;

    const expected = [
      `Loading import map: ${url}`,
      "TypeError",
      `The value of the scope should be a JSON object\n` +
      `"/scope/":"dummy" in "scopes":{"/scope/":"dummy"}`,
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain specified import map #14 - scope key is not a json object (null)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/scope_null.json`;

    const expected = [
      `Loading import map: ${url}`,
      "TypeError",
      `The value of the scope should be a JSON object\n` +
      `"/scope/":null in "scopes":{"/scope/":null}`,
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain specified import map #15 - scope key is not a json object (array)",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}module_deps/cache/https/example.com/scope_array.json`;

    const expected = [
      `Loading import map: ${url}`,
      "TypeError",
      `The value of the scope should be a JSON object\n` +
      `"/scope/":[{"dummy1/":"https://example.com/scope1/dummy1/",` +
      `"mod":"https://example.com/scope1/dummy2/mod.ts"}] in ` +
      `"scopes":{"/scope/":[{"dummy1/":"https://example.com/scope1/dummy1/",` +
      `"mod":"https://example.com/scope1/dummy2/mod.ts"}]}`,
      "**  call Deno.exit(1) **",
    ];

    mock.console.replaceErrorFn();
    mock.exit.replaceExitFn();

    await obtainDepsDataFromSpecifiedImportMap(new Set([url]));

    assertEquals(mock.console.output[0], expected[0]);
    assertEquals(mock.console.output[1].name, expected[1]);
    assertEquals(mock.console.output[1].message, expected[2]);
    assertEquals(mock.console.output.slice(-1)[0], expected[3]);

    // cleanup
    mock.console.restoreErrorFn();
    mock.exit.restoreExitFn();
  },
});

Deno.test({
  name: "obtain cached import map #1 - imports valid",
  permissions: { read: true },
  fn() {
    location.baseDepsPath = testdataDir + "module_deps/cache";

    const expected = {
      "https://example.com/imports_valid.json": new Set([
        "https://example.com/dummy1/",
        "https://example.com/dummy2/mod.ts",
      ]),
    };

    const actual = obtainDepsDataFromCachedImportMap([
      {
        url: "https://example.com/imports_valid.json",
        hash: "imports_valid.json",
      },
    ]);

    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
  },
});

Deno.test({
  name: "obtain cached import map #2 - scopes valid",
  permissions: { read: true },
  fn() {
    location.baseDepsPath = testdataDir + "module_deps/cache";

    const expected = {
      "https://example.com/scopes_valid.json": new Set([
        "https://example.com/scope1/dummy1/",
        "https://example.com/scope1/dummy2/mod.ts",
        "https://example.com/scope2/dummy/mod.ts",
      ]),
    };

    const actual = obtainDepsDataFromCachedImportMap([
      {
        url: "https://example.com/scopes_valid.json",
        hash: "scopes_valid.json",
      },
    ]);

    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
  },
});

Deno.test({
  name: "obtain cached import map #3 - all valid",
  permissions: { read: true },
  fn() {
    location.baseDepsPath = testdataDir + "module_deps/cache";

    const expected = {
      "https://example.com/all_valid.json": new Set([
        "https://example.com/dummy1/",
        "https://example.com/dummy2/mod.ts",
        "https://example.com/scope1/dummy1/",
        "https://example.com/scope1/dummy2/mod.ts",
        "https://example.com/scope2/dummy/mod.ts",
      ]),
    };

    const actual = obtainDepsDataFromCachedImportMap([
      {
        url: "https://example.com/all_valid.json",
        hash: "all_valid.json",
      },
    ]);

    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
  },
});

Deno.test({
  name: "obtain cached import map #4 - invalid (no throw)",
  permissions: { read: true },
  fn() {
    location.baseDepsPath = testdataDir + "module_deps/cache";

    const expected = {
      "https://example.com/no_imports_and_scopes.json": new Set(),
      "https://example.com/empty_object.json": new Set(),
      "https://example.com/imports_non_string.json": new Set(),
      "https://example.com/scope_empty_object.json": new Set(),
      "https://example.com/scope_non_string.json": new Set(),
    };

    const actual = obtainDepsDataFromCachedImportMap([
      {
        url: "https://example.com/no_imports_and_scopes.json",
        hash: "no_imports_and_scopes.json",
      },
      {
        url: "https://example.com/empty_object.json",
        hash: "empty_object.json",
      },
      {
        url: "https://example.com/imports_non_string.json",
        hash: "imports_non_string.json",
      },
      {
        url: "https://example.com/scope_empty_object.json",
        hash: "scope_empty_object.json",
      },
      {
        url: "https://example.com/scope_non_string.json",
        hash: "scope_non_string.json",
      },
    ]);

    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
  },
});

Deno.test({
  name: "obtain cached import map #5 - invalid (ignore throw)",
  permissions: { read: true },
  fn() {
    location.baseDepsPath = testdataDir + "module_deps/cache";

    const expected = {
      "https://example.com/imports_text.json": new Set(),
      "https://example.com/imports_null.json": new Set(),
      "https://example.com/imports_array.json": new Set(),
      "https://example.com/scopes_text.json": new Set(),
      "https://example.com/scopes_null.json": new Set(),
      "https://example.com/scopes_array.json": new Set(),
      "https://example.com/scope_text.json": new Set(),
      "https://example.com/scope_null.json": new Set(),
      "https://example.com/scope_array.json": new Set(),
    };

    const actual = obtainDepsDataFromCachedImportMap([
      {
        url: "https://example.com/no_json_format.json",
        hash: "no_json_format.json",
      },
      {
        url: "https://example.com/imports_text.json",
        hash: "imports_text.json",
      },
      {
        url: "https://example.com/imports_null.json",
        hash: "imports_null.json",
      },
      {
        url: "https://example.com/imports_array.json",
        hash: "imports_array.json",
      },
      {
        url: "https://example.com/scopes_text.json",
        hash: "scopes_text.json",
      },
      {
        url: "https://example.com/scopes_null.json",
        hash: "scopes_null.json",
      },
      {
        url: "https://example.com/scopes_array.json",
        hash: "scopes_array.json",
      },
      {
        url: "https://example.com/scope_text.json",
        hash: "scope_text.json",
      },
      {
        url: "https://example.com/scope_null.json",
        hash: "scope_null.json",
      },
      {
        url: "https://example.com/scope_array.json",
        hash: "scope_array.json",
      },
    ]);

    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
  },
});
