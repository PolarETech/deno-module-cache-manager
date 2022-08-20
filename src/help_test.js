// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals } from "../tests/deps.ts";
import { MockConsole } from "../tests/mocks/io.ts";
import { displayHelp } from "./help.ts";

const mock = new MockConsole();

// TODO:
// Need to update this list along with implementation of options.
const OPTIONS = [
  "--delete",
  "-d",
  "--help",
  "-h",
  "--import-map",
  "--leaves",
  "--missing-url",
  "--newer",
  "--older",
  "--quiet",
  "-q",
  "--sort-date",
  "--url",
  "--name",
  "-n",
  "--uses",
  "--verbose",
  "-v",
  "--version",
  "-V",
  "--with-date",
  "--with-path",
  "--yes",
  "-y",
];

Deno.test({
  name: "display help #1 - name and version",
  fn() {
    const version = "0.1.2";
    const expected = `Deno module cache manager ${version}\n\n`;

    mock.replaceLogFn();

    displayHelp(version);
    assertEquals(mock.output[0].startsWith(expected), true);

    // cleanup
    mock.restoreLogFn();
  },
});

Deno.test({
  name: "display help #2 - each options",
  fn() {
    mock.replaceLogFn();

    displayHelp("");
    const outputOptions = mock.output[0]
      .split(/\n|\s{4,}|, | </)
      .filter((v) => v.startsWith("-"));

    OPTIONS.forEach((flag) => {
      assertEquals(
        outputOptions.includes(flag),
        true,
        `There is no description of flag "${flag}" in the help`,
      );
    });

    outputOptions.forEach((flag) => {
      assertEquals(
        OPTIONS.includes(flag),
        true,
        `Unknown flag "${flag}" is in the help`,
      );
    });

    // cleanup
    mock.restoreLogFn();
  },
});
