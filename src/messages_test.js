// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals, assertThrows } from "../tests/deps.ts";
import { location } from "./location.ts";
import {
  ConfirmationId,
  displayConfirmationMessage,
  displayInvalidArgsMessage,
  displayProgress,
  displayResultMessage,
  displaySearchCriteria,
  displaySearchLocation,
  ResultId,
  updateOutputMode,
} from "./messages.ts";

let output = "";

const originalConsoleLog = console.log;
const originalWriteSync = Deno.stdout.writeSync;
const originalReadSync = Deno.stdin.readSync;

const replaceConsoleLog = () => {
  console.log = (message) => output += message;
};
const replaceWriteSync = () => {
  Deno.stdout.writeSync = (message) => {
    output += new TextDecoder().decode(message);
  };
};
const replaceReadSync = (input) => {
  Deno.stdin.readSync = (p) => {
    p.set(new TextEncoder().encode(input));
    return input.length;
  };
};

const restoreConsoleLog = () => console.log = originalConsoleLog;
const restoreWriteSync = () => Deno.stdout.writeSync = originalWriteSync;
const restoreReadSync = () => Deno.stdin.readSync = originalReadSync;

const restoreProperties = () => {
  output = "";
  location.baseDepsPath = "";
  location.baseGenPath = "";
  updateOutputMode({ quiet: false, verbose: false });
};

Deno.test({
  name: "display confirmation #1 - long time",
  fn() {
    const expected = "It may take a very long time. " +
      "Are you sure you want to start the process? (y/N): ";

    output = "";
    replaceWriteSync();
    replaceReadSync("\n");

    displayConfirmationMessage({ id: ConfirmationId.LongTime });
    assertEquals(output, expected);

    // cleanup
    restoreWriteSync();
    restoreReadSync();
    restoreProperties();
  },
});

Deno.test({
  name: "display confirmation #2 - delete 1 file",
  fn() {
    const fileCount = 1;
    const expected = "\nThis operation cannot be undone.\n" +
      `Are you sure you want to delete the above ${fileCount} file? (y/N): `;

    output = "";
    replaceWriteSync();
    replaceReadSync("\n");

    displayConfirmationMessage({ id: ConfirmationId.Delete, fileCount });
    assertEquals(output, expected);

    // cleanup
    restoreWriteSync();
    restoreReadSync();
    restoreProperties();
  },
});

Deno.test({
  name: "display confirmation #3 - delete multiple files",
  fn() {
    const fileCount = 2;
    const expected = "\nThis operation cannot be undone.\n" +
      `Are you sure you want to delete the above ${fileCount} files? (y/N): `;

    output = "";
    replaceWriteSync();
    replaceReadSync("\n");

    displayConfirmationMessage({ id: ConfirmationId.Delete, fileCount });
    assertEquals(output, expected);

    // cleanup
    restoreWriteSync();
    restoreReadSync();
    restoreProperties();
  },
});

Deno.test({
  name: "display confirmation #4 - delete 0 file",
  fn() {
    const fileCount = 0;

    assertThrows(
      () => displayConfirmationMessage({ id: ConfirmationId.Delete, fileCount }),
      Error,
      "There are no files to delete",
    );
  },
});

Deno.test({
  name: "display confirmation #5 - answer n",
  fn() {
    replaceWriteSync();
    replaceReadSync("n\n");

    const actual = displayConfirmationMessage({ id: ConfirmationId.LongTime });
    assertEquals(actual, false);

    // cleanup
    restoreWriteSync();
    restoreReadSync();
    restoreProperties();
  },
});

Deno.test({
  name: "display confirmation #6 - answer y",
  fn() {
    replaceWriteSync();
    replaceReadSync("y\n");

    const actual = displayConfirmationMessage({ id: ConfirmationId.LongTime });
    assertEquals(actual, true);

    // cleanup
    restoreWriteSync();
    restoreReadSync();
    restoreProperties();
  },
});

Deno.test({
  name: "display confirmation #7 - answer Y",
  fn() {
    replaceWriteSync();
    replaceReadSync("Y\n");

    const actual = displayConfirmationMessage({ id: ConfirmationId.LongTime });
    assertEquals(actual, true);

    // cleanup
    restoreWriteSync();
    restoreReadSync();
    restoreProperties();
  },
});

Deno.test({
  name: "display confirmation #8 - skip",
  fn() {
    const actual = displayConfirmationMessage({ id: ConfirmationId.LongTime }, true);
    assertEquals(actual, true);
  },
});

Deno.test({
  name: "display result #1 - version",
  fn() {
    const version = "0.1.2";
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.Version, version });
    assertEquals(output, `Deno module cache manager ${version}`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #2 - version error",
  fn() {
    const version = "0.1.2";
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.VersionError, version });
    assertEquals(output, `INFO: Deno version ${version} or later is required`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #3 - invalid date",
  fn() {
    const option = "newer";
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.InvalidDate, option });
    assertEquals(output, `INFO: The specified ${option} date is invalid`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #4 - date required",
  fn() {
    const option = "older";
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.DateRequired, option });
    assertEquals(output, `INFO: Please specify the ${option} date`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #5 - url required",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.ModuleUrlRequired });
    assertEquals(output, "INFO: Please specify the module url");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #6 - modules not found",
  fn() {
    const moduleCount = 0;
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.FoundModule, moduleCount });
    assertEquals(output, "INFO: No modules are found");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #7 - 1 module found",
  fn() {
    const moduleCount = 1;
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.FoundModule, moduleCount });
    assertEquals(output, `\nTotal: ${moduleCount} module is found`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #8 - multiple modules found",
  fn() {
    const moduleCount = 2;
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.FoundModule, moduleCount });
    assertEquals(output, `\nTotal: ${moduleCount} modules are found`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #9 - module found with 1 file",
  fn() {
    const moduleCount = 1;
    const fileCount = 1;
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.FoundModule, moduleCount, fileCount });
    assertEquals(output, `\nTotal: ${moduleCount} module is found (${fileCount} file)`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #10 - modules found with multiple files",
  fn() {
    const moduleCount = 2;
    const fileCount = 2;
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.FoundModule, moduleCount, fileCount });
    assertEquals(output, `\nTotal: ${moduleCount} modules are found (${fileCount} files)`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #11 - files not found",
  fn() {
    const fileCount = 0;
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.FoundFile, fileCount });
    assertEquals(output, "INFO: No files are found");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #12 - 1 file found",
  fn() {
    const fileCount = 1;
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.FoundFile, fileCount });
    assertEquals(output, `\nTotal: ${fileCount} file is found`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #13 - multiple files found",
  fn() {
    const fileCount = 2;
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.FoundFile, fileCount });
    assertEquals(output, `\nTotal: ${fileCount} files are found`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #14 - deleted file",
  fn() {
    const filePath = "/foo/bar.js";
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.DeletedFile, filePath });
    assertEquals(output, `DELETED: ${filePath}`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #15 - quiet true",
  fn() {
    updateOutputMode({ quiet: true, verbose: false });

    output = "";
    replaceConsoleLog();

    displayResultMessage({ id: ResultId.ModuleUrlRequired });
    assertEquals(output, "");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #16 - invalid args",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    assertThrows(
      () => displayResultMessage({ id: "invalid" }),
      Error,
      `{"id":"invalid"} is invalid`,
    );
  },
});

Deno.test({
  name: "display invalid args #1 - no url",
  fn() {
    const invalidArgs = {
      noUrl: true,
      noNewer: false,
      noOlder: false,
      invalidNewer: false,
      invalidOlder: false,
    };

    output = "";
    replaceConsoleLog();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(output, "INFO: Please specify the module url");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display invalid args #2 - no newer",
  fn() {
    const invalidArgs = {
      noUrl: false,
      noNewer: true,
      noOlder: false,
      invalidNewer: false,
      invalidOlder: false,
    };

    output = "";
    replaceConsoleLog();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(output, "INFO: Please specify the newer date");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display invalid args #3 - no older",
  fn() {
    const invalidArgs = {
      noUrl: false,
      noNewer: false,
      noOlder: true,
      invalidNewer: false,
      invalidOlder: false,
    };

    output = "";
    replaceConsoleLog();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(output, "INFO: Please specify the older date");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display invalid args #4 - invalid newer date",
  fn() {
    const invalidArgs = {
      noUrl: false,
      noNewer: false,
      noOlder: false,
      invalidNewer: true,
      invalidOlder: false,
    };

    output = "";
    replaceConsoleLog();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(output, "INFO: The specified newer date is invalid");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display invalid args #5 - invalid older date",
  fn() {
    const invalidArgs = {
      noUrl: false,
      noNewer: false,
      noOlder: false,
      invalidNewer: false,
      invalidOlder: true,
    };

    output = "";
    replaceConsoleLog();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(output, "INFO: The specified older date is invalid");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display invalid args #6 - multiple errors",
  fn() {
    const invalidArgs = {
      noUrl: true,
      noNewer: false,
      noOlder: true,
      invalidNewer: true,
      invalidOlder: false,
    };

    const expected = "INFO: Please specify the module url" +
      "INFO: Please specify the older date" +
      "INFO: The specified newer date is invalid";

    output = "";
    replaceConsoleLog();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(output, expected);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display invalid args #7 - quiet true",
  fn() {
    const invalidArgs = {
      noUrl: true,
      noNewer: false,
      noOlder: false,
      invalidNewer: false,
      invalidOlder: false,
    };
    updateOutputMode({ quiet: true, verbose: false });

    output = "";
    replaceConsoleLog();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(output, "");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #1 - All",
  fn() {
    updateOutputMode({ quiet: false, verbose: true });

    output = "";
    replaceConsoleLog();

    displaySearchCriteria({}, {});
    assertEquals(output, "Search criteria:\n - All cached modules");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #2 - missing url",
  fn() {
    const option = {
      missingUrl: true,
      leaves: false,
      uses: false,
    };
    const target = {
      url: undefined,
      newer: undefined,
      older: undefined,
    };
    updateOutputMode({ quiet: false, verbose: true });

    output = "";
    replaceConsoleLog();

    displaySearchCriteria(option, target);
    assertEquals(output, `Search criteria:\n - Search with option "--missing-url"`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #3 - leaves",
  fn() {
    const option = {
      missingUrl: false,
      leaves: true,
      uses: false,
    };
    const target = {
      url: undefined,
      newer: undefined,
      older: undefined,
    };
    updateOutputMode({ quiet: false, verbose: true });

    output = "";
    replaceConsoleLog();

    displaySearchCriteria(option, target);
    assertEquals(output, `Search criteria:\n - Search with option "--leaves"`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #4 - uses",
  fn() {
    const option = {
      missingUrl: false,
      leaves: false,
      uses: true,
    };
    const target = {
      url: undefined,
      newer: undefined,
      older: undefined,
    };
    updateOutputMode({ quiet: false, verbose: true });

    output = "";
    replaceConsoleLog();

    displaySearchCriteria(option, target);
    assertEquals(output, `Search criteria:\n - Search with option "--uses"`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #5 - url",
  fn() {
    const option = {
      missingUrl: false,
      leaves: false,
      uses: false,
    };
    const target = {
      url: "example.com",
      newer: undefined,
      older: undefined,
    };
    updateOutputMode({ quiet: false, verbose: true });

    output = "";
    replaceConsoleLog();

    displaySearchCriteria(option, target);
    assertEquals(output, `Search criteria:\n - Module URL contains "example.com"`);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #6 - newer",
  fn() {
    const option = {
      missingUrl: false,
      leaves: false,
      uses: false,
    };
    const target = {
      url: undefined,
      newer: "2022-01-02T03:45:06.000Z",
      older: undefined,
    };
    updateOutputMode({ quiet: false, verbose: true });

    const expected = "Search criteria:\n" +
      ` - Download date is equal to or newer than "2022-01-02T03:45:06.000Z"`;

    output = "";
    replaceConsoleLog();

    displaySearchCriteria(option, target);
    assertEquals(output, expected);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #7 - older",
  fn() {
    const option = {
      missingUrl: false,
      leaves: false,
      uses: false,
    };
    const target = {
      url: undefined,
      newer: undefined,
      older: "2022-01-02T03:45:06.000Z",
    };
    updateOutputMode({ quiet: false, verbose: true });

    const expected = "Search criteria:\n" +
      ` - Download date is equal to or older than "2022-01-02T03:45:06.000Z"`;

    output = "";
    replaceConsoleLog();

    displaySearchCriteria(option, target);
    assertEquals(output, expected);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #8 - multiple criteria",
  fn() {
    const option = {
      missingUrl: false,
      leaves: true,
      uses: false,
    };
    const target = {
      url: "example.com",
      newer: "2021-12-11T10:09:58.000Z",
      older: "2022-01-02T03:45:06.000Z",
    };
    updateOutputMode({ quiet: false, verbose: true });

    const expected = "Search criteria:\n" +
      ` - Search with option "--leaves"\n` +
      ` - Module URL contains "example.com"\n` +
      ` - Download date is equal to or newer than "2021-12-11T10:09:58.000Z"\n` +
      ` - Download date is equal to or older than "2022-01-02T03:45:06.000Z"`;

    output = "";
    replaceConsoleLog();

    displaySearchCriteria(option, target);
    assertEquals(output, expected);

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #9 - verbose false",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displaySearchCriteria({}, {});
    assertEquals(output, "");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search location #1 - cache locations",
  fn() {
    location.baseDepsPath = "/foo/bar";
    location.baseGenPath = "/bar/baz";
    updateOutputMode({ quiet: false, verbose: true });

    output = "";
    replaceConsoleLog();

    displaySearchLocation();
    assertEquals(output, "Search locations:\n - /foo/bar\n - /bar/baz");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display search location #2 - verbose false",
  fn() {
    location.baseDepsPath = "/foo/bar";
    location.baseGenPath = "/bar/baz";
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceConsoleLog();

    displaySearchLocation();
    assertEquals(output, "");

    // cleanup
    restoreConsoleLog();
    restoreProperties();
  },
});

Deno.test({
  name: "display progress #1 - message",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceWriteSync();

    displayProgress(2, 10, "completed");
    assertEquals(output, " *  2 / 10 completed\r");

    // cleanup
    restoreWriteSync();
    restoreProperties();
  },
});

Deno.test({
  name: "display progress #2 - quiet true",
  fn() {
    updateOutputMode({ quiet: true, verbose: false });

    output = "";
    replaceWriteSync();

    displayProgress(2, 10, "completed");
    assertEquals(output, "");

    // cleanup
    restoreWriteSync();
    restoreProperties();
  },
});

Deno.test({
  name: "display progress #3 - hide cursor",
  ignore: Deno.build.os === "windows",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceWriteSync();

    const addSignal = [];
    const originalAddSignalListener = Deno.addSignalListener;
    Deno.addSignalListener = (...args) => {
      addSignal.push(args);
    };

    displayProgress(0, 10, "completed");
    assertEquals(output, "\x1b[?25l *  0 / 10 completed\r");

    assertEquals(addSignal[0][0], "SIGINT");
    assertEquals(addSignal[0][1].name, "showCursor");
    assertEquals(addSignal[1][0], "SIGTERM");
    assertEquals(addSignal[1][1].name, "showCursor");

    // cleanup
    restoreWriteSync();
    restoreProperties();
    Deno.addSignalListener = originalAddSignalListener;
  },
});

Deno.test({
  name: "display progress #4 - show cursor",
  ignore: Deno.build.os === "windows",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    output = "";
    replaceWriteSync();

    const removeSignal = [];
    const originalRemoveSignalListener = Deno.removeSignalListener;
    Deno.removeSignalListener = (...args) => {
      removeSignal.push(args);
    };

    const addSignal = [];
    const originalAddSignalListener = Deno.addSignalListener;
    Deno.addSignalListener = (...args) => {
      addSignal.push(args);
    };

    displayProgress(10, 10, "completed");
    assertEquals(output, " * 10 / 10 completed\r\x1b[2K\x1b[?25h");

    assertEquals(removeSignal[0][0], "SIGINT");
    assertEquals(removeSignal[0][1].name, "showCursor");
    assertEquals(removeSignal[1][0], "SIGTERM");
    assertEquals(removeSignal[1][1].name, "showCursor");

    assertEquals(addSignal[0][0], "SIGINT");
    assertEquals(addSignal[0][1].name, "");
    assertEquals(addSignal[1][0], "SIGTERM");
    assertEquals(addSignal[1][1].name, "");

    // cleanup
    restoreWriteSync();
    restoreProperties();
    Deno.addSignalListener = originalAddSignalListener;
    Deno.removeSignalListener = originalRemoveSignalListener;
  },
});
