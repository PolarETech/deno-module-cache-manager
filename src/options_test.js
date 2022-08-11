// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals } from "../tests/deps.ts";
import { sortOutArgs } from "./options.ts";

const defaultOptionFlags = {
  delete: false,
  help: false,
  importMap: false,
  leaves: false,
  missingUrl: false,
  newer: false,
  older: false,
  quiet: false,
  skipConfirmation: false,
  sortDate: false,
  url: false,
  uses: false,
  verbose: false,
  version: false,
  withDate: false,
  withPath: false,
};

const defaultTarget = {
  url: undefined,
  newer: undefined,
  older: undefined,
  importMap: undefined,
};

const defaultInvalidArgs = {
  noUrl: false,
  noNewer: false,
  noOlder: false,
  invalidNewer: false,
  invalidOlder: false,
};

Deno.test({
  name: "default #1 - no args",
  fn() {
    const args = [];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    assertEquals(optionFlags, defaultOptionFlags);
    assertEquals(target, defaultTarget);
    assertEquals(invalidArgs, defaultInvalidArgs);
  },
});

Deno.test({
  name: "version #1 - version",
  fn() {
    const args = ["--version"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, version: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "version #2 - V",
  fn() {
    const args = ["-V"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, version: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "help #1 - help",
  fn() {
    const args = ["--help"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, help: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "help #2 - h",
  fn() {
    const args = ["-h"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, help: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "output mode #1 - verbose",
  fn() {
    const args = ["--verbose"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, verbose: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "output mode #2 - v",
  fn() {
    const args = ["-v"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, verbose: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "output mode #3 - quiet",
  fn() {
    const args = ["--quiet"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, quiet: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "output mode #4 - q",
  fn() {
    const args = ["-q"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, quiet: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "output mode #5 - quiet > verbose",
  fn() {
    const args = ["-v", "-q"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, quiet: true, verbose: false };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "skip confirmation #1 - yes",
  fn() {
    const args = ["--yes"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, skipConfirmation: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "skip confirmation #2 - y",
  fn() {
    const args = ["-y"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, skipConfirmation: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "newer #1 - valid date",
  fn() {
    const args = ["--newer", "2022-01-02T03:45:06"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, newer: true };
    const expectedTarget = { ...defaultTarget, newer: "2022-01-02T03:45:06.000Z" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "newer #2 - without specific date",
  fn() {
    const args = ["--newer"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, newer: true };
    const expectedTarget = { ...defaultTarget, newer: undefined };
    const expectedInvalidArgs = { ...defaultInvalidArgs, noNewer: true };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "newer #3 - invalid date",
  fn() {
    const args = ["--newer", "20220102 03:45:06"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, newer: true };
    const expectedTarget = { ...defaultTarget, newer: null };
    const expectedInvalidArgs = { ...defaultInvalidArgs, invalidNewer: true };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "newer #4 - multiple dates",
  fn() {
    const args = ["--newer", "dummy", "--newer", "2022-01-02 03:45:06", "--newer"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, newer: true };
    const expectedTarget = { ...defaultTarget, newer: "2022-01-02T03:45:06.000Z" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "older #1 - valid date",
  fn() {
    const args = ["--older", "2022-01-02T03:45:06"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, older: true };
    const expectedTarget = { ...defaultTarget, older: "2022-01-02T03:45:06.000Z" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "older #2 - without specific date",
  fn() {
    const args = ["--older"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, older: true };
    const expectedTarget = { ...defaultTarget, older: undefined };
    const expectedInvalidArgs = { ...defaultInvalidArgs, noOlder: true };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "older #3 - invalid date",
  fn() {
    const args = ["--older", "20220102 03:45:06"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, older: true };
    const expectedTarget = { ...defaultTarget, older: null };
    const expectedInvalidArgs = { ...defaultInvalidArgs, invalidOlder: true };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "older #4 - multiple dates",
  fn() {
    const args = ["--older", "dummy", "--older", "2022-01-02 03:45:06", "--older"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, older: true };
    const expectedTarget = { ...defaultTarget, older: "2022-01-02T03:45:06.000Z" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "with path #1 - with-path",
  fn() {
    const args = ["--with-path"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, withPath: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "with date #1 - with-date",
  fn() {
    const args = ["--with-date"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, withDate: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "sort date #1 - sort-date",
  fn() {
    const args = ["--sort-date"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, sortDate: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "import maps #1 - import-map",
  fn() {
    const args = ["--import-map", "http://example.com/import_map.json"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, importMap: true };
    const expectedTarget = {
      ...defaultTarget,
      importMap: new Set(["http://example.com/import_map.json"]),
    };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "import maps #2 - multiple urls",
  fn() {
    const args = [
      "--import-map",
      "http://example.com/import_map1.json",
      "http://example.com/import_map2.json",
    ];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, importMap: true };
    const expectedTarget = {
      ...defaultTarget,
      importMap: new Set([
        "http://example.com/import_map1.json",
        "http://example.com/import_map2.json",
      ]),
    };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "import maps #3 - multiple import-map",
  fn() {
    const args = [
      "--import-map",
      "http://example.com/import_map1.json",
      "--import-map",
      "http://example.com/import_map2.json",
    ];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, importMap: true };
    const expectedTarget = {
      ...defaultTarget,
      importMap: new Set([
        "http://example.com/import_map1.json",
        "http://example.com/import_map2.json",
      ]),
    };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "module url #1 - url",
  fn() {
    const args = ["--url", "foo"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, url: true };
    const expectedTarget = { ...defaultTarget, url: "foo" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "module url #2 - name",
  fn() {
    const args = ["--name", "foo"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, url: true };
    const expectedTarget = { ...defaultTarget, url: "foo" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "module url #3 - n",
  fn() {
    const args = ["-n", "foo"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, url: true };
    const expectedTarget = { ...defaultTarget, url: "foo" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "module url #4 - implicit",
  fn() {
    const args = ["foo"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, url: false };
    const expectedTarget = { ...defaultTarget, url: "foo" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "module url #5 - multiple urls",
  fn() {
    const args = ["--url", "foo", "bar"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, url: true };
    const expectedTarget = { ...defaultTarget, url: "foo" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "module url #6 - without specific url",
  fn() {
    const args = ["--url"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, url: true };
    const expectedTarget = { ...defaultTarget, url: undefined };
    const expectedInvalidArgs = { ...defaultInvalidArgs, noUrl: true };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "delete #1 - delete",
  fn() {
    const args = ["--delete", "foo"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, delete: true, withPath: true };
    const expectedTarget = { ...defaultTarget, url: "foo" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "delete #2 - d",
  fn() {
    const args = ["-d", "foo", "--with-path"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, delete: true, withPath: true };
    const expectedTarget = { ...defaultTarget, url: "foo" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "delete #3 - multiple urls",
  fn() {
    const args = ["baz", "-d", "foo", "bar"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, delete: true, withPath: true };
    const expectedTarget = { ...defaultTarget, url: "foo" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "delete #4 - without specific url",
  fn() {
    const args = ["-d"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, delete: true, withPath: true };
    const expectedTarget = { ...defaultTarget, url: undefined };
    const expectedInvalidArgs = { ...defaultInvalidArgs, noUrl: true };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "uses #1 - uses",
  fn() {
    const args = ["--uses"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, uses: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "uses #2 - disable with-path",
  fn() {
    const args = ["--uses", "--with-path"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, uses: true, withPath: false };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "leaves #1 - leaves",
  fn() {
    const args = ["--leaves"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, leaves: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "missing-url #1 - missing-url",
  fn() {
    const args = ["--missing-url"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, missingUrl: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "exclusive flags #1 - version",
  fn() {
    const args = ["-V", "-d", "-h", "--leaves", "--missing-url", "--uses"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, version: true };
    const expectedTarget = { ...defaultTarget };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "exclusive flags #2 - help",
  fn() {
    const args = ["-h", "--leaves", "--missing-url", "--uses", "-V", "-d", "-n", "foo"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, help: true, url: true };
    const expectedTarget = { ...defaultTarget, url: "foo" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "exclusive flags #3 - delete",
  fn() {
    const args = ["-d", "-h", "--leaves", "--missing-url", "--uses", "-V", "foo"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, delete: true, withPath: true };
    const expectedTarget = { ...defaultTarget, url: "foo" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "exclusive flags #4 - missing-url",
  fn() {
    const args = ["--missing-url", "--uses", "-V", "-d", "-h", "--leaves", "--newer", "2022-01"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, missingUrl: true, newer: true };
    const expectedTarget = { ...defaultTarget, newer: "2022-01-01T00:00:00.000Z" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "exclusive flags #5 - leaves",
  fn() {
    const args = ["--leaves", "--missing-url", "--uses", "-V", "-d", "-h", "--older", "2022-01"];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, leaves: true, older: true };
    const expectedTarget = { ...defaultTarget, older: "2022-01-01T00:00:00.000Z" };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});

Deno.test({
  name: "exclusive flags #6 - uses",
  fn() {
    const args = [
      "--uses",
      "-V",
      "-d",
      "-h",
      "--leaves",
      "--missing-url",
      "--import-map",
      "./import_map.json",
    ];
    const { optionFlags, target, invalidArgs } = sortOutArgs(args);

    const expectedOptionFlags = { ...defaultOptionFlags, importMap: true, uses: true };
    const expectedTarget = { ...defaultTarget, importMap: new Set(["./import_map.json"]) };
    const expectedInvalidArgs = { ...defaultInvalidArgs };

    assertEquals(optionFlags, expectedOptionFlags);
    assertEquals(target, expectedTarget);
    assertEquals(invalidArgs, expectedInvalidArgs);
  },
});
