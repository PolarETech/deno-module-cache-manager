// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals } from "../tests/deps.ts";
import { displayHelp } from "./help.ts";

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

let output = "";

const originalConsoleLog = console.log;
const replaceConsoleLog = () => {
  console.log = (message) => output += message;
};
const restoreConsoleLog = () => console.log = originalConsoleLog;

Deno.test({
  name: "display help #1 - name and version",
  fn() {
    const version = "0.1.2";
    const expected = `Deno module cache manager ${version}\n\n`;

    output = "";
    replaceConsoleLog();

    displayHelp(version);
    assertEquals(output.startsWith(expected), true);

    // cleanup
    restoreConsoleLog();
    output = "";
  },
});

Deno.test({
  name: "display help #2 - each options",
  fn() {
    output = "";
    replaceConsoleLog();

    displayHelp("");
    const outputOptions = output
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
    restoreConsoleLog();
    output = "";
  },
});
