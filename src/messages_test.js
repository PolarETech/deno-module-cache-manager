// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals, assertThrows } from "../tests/deps.ts";
import { MockConsole, MockStdin, MockStdout } from "../tests/mocks/io.ts";
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

const mock = {
  console: new MockConsole(),
  stdout: new MockStdout(),
  stdin: new MockStdin(),
  addSignalListener: {
    output: [],
    _originalListener: Deno.addSignalListener,
    resetOutput() {
      this.output.length = 0;
    },
    replaceListenerFn() {
      this.resetOutput();
      Deno.addSignalListener = (...args) => {
        this.output.push(args);
      };
    },
    restoreListenerFn() {
      Deno.addSignalListener = this._originalListener;
      this.resetOutput();
    },
  },
  removeSignalListener: {
    output: [],
    _originalListener: Deno.removeSignalListener,
    resetOutput() {
      this.output.length = 0;
    },
    replaceListenerFn() {
      this.resetOutput();
      Deno.removeSignalListener = (...args) => {
        this.output.push(args);
      };
    },
    restoreListenerFn() {
      Deno.removeSignalListener = this._originalListener;
      this.resetOutput();
    },
  },
};

const restoreProperties = () => {
  location.baseDepsPath = "";
  location.baseGenPath = "";
  updateOutputMode({ quiet: false, verbose: false });
};

Deno.test({
  name: "display confirmation #1 - long time",
  fn() {
    const expected = [
      "It may take a very long time. " +
      "Are you sure you want to start the process? (y/N): ",
    ];

    mock.stdout.replaceWriteSyncFn();
    mock.stdin.replaceReadSyncFn();

    displayConfirmationMessage({ id: ConfirmationId.LongTime });
    assertEquals(mock.stdout.output, expected);

    // cleanup
    mock.stdout.restoreWriteSyncFn();
    mock.stdin.restoreReadSyncFn();
  },
});

Deno.test({
  name: "display confirmation #2 - delete 1 file",
  fn() {
    const fileCount = 1;
    const expected = [
      "\nThis operation cannot be undone.\n" +
      `Are you sure you want to delete the above ${fileCount} file? (y/N): `,
    ];

    mock.stdout.replaceWriteSyncFn();
    mock.stdin.replaceReadSyncFn();

    displayConfirmationMessage({ id: ConfirmationId.Delete, fileCount });
    assertEquals(mock.stdout.output, expected);

    // cleanup
    mock.stdout.restoreWriteSyncFn();
    mock.stdin.restoreReadSyncFn();
  },
});

Deno.test({
  name: "display confirmation #3 - delete multiple files",
  fn() {
    const fileCount = 2;
    const expected = [
      "\nThis operation cannot be undone.\n" +
      `Are you sure you want to delete the above ${fileCount} files? (y/N): `,
    ];

    mock.stdout.replaceWriteSyncFn();
    mock.stdin.replaceReadSyncFn();

    displayConfirmationMessage({ id: ConfirmationId.Delete, fileCount });
    assertEquals(mock.stdout.output, expected);

    // cleanup
    mock.stdout.restoreWriteSyncFn();
    mock.stdin.restoreReadSyncFn();
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
    mock.stdout.replaceWriteSyncFn();
    mock.stdin.replaceReadSyncFn("n\n");

    const actual = displayConfirmationMessage({ id: ConfirmationId.LongTime });
    assertEquals(actual, false);

    // cleanup
    mock.stdout.restoreWriteSyncFn();
    mock.stdin.restoreReadSyncFn();
  },
});

Deno.test({
  name: "display confirmation #6 - answer y",
  fn() {
    mock.stdout.replaceWriteSyncFn();
    mock.stdin.replaceReadSyncFn("y\n");

    const actual = displayConfirmationMessage({ id: ConfirmationId.LongTime });
    assertEquals(actual, true);

    // cleanup
    mock.stdout.restoreWriteSyncFn();
    mock.stdin.restoreReadSyncFn();
  },
});

Deno.test({
  name: "display confirmation #7 - answer Y",
  fn() {
    mock.stdout.replaceWriteSyncFn();
    mock.stdin.replaceReadSyncFn("Y\n");

    const actual = displayConfirmationMessage({ id: ConfirmationId.LongTime });
    assertEquals(actual, true);

    // cleanup
    mock.stdout.restoreWriteSyncFn();
    mock.stdin.restoreReadSyncFn();
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

    const expected = [`Deno module cache manager ${version}`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.Version, version });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #2 - version error",
  fn() {
    const version = "0.1.2";
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [`INFO: Deno version ${version} or later is required`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.VersionError, version });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #3 - invalid date",
  fn() {
    const option = "newer";
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [`INFO: The specified ${option} date is invalid`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.InvalidDate, option });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #4 - date required",
  fn() {
    const option = "older";
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [`INFO: Please specify the ${option} date`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.DateRequired, option });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #5 - url required",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    const expected = ["INFO: Please specify the module url"];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.ModuleUrlRequired });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #6 - modules not found",
  fn() {
    const moduleCount = 0;
    updateOutputMode({ quiet: false, verbose: false });

    const expected = ["INFO: No modules are found"];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.FoundModule, moduleCount });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #7 - 1 module found",
  fn() {
    const moduleCount = 1;
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [`\nTotal: ${moduleCount} module is found`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.FoundModule, moduleCount });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #8 - multiple modules found",
  fn() {
    const moduleCount = 2;
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [`\nTotal: ${moduleCount} modules are found`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.FoundModule, moduleCount });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #9 - module found with 1 file",
  fn() {
    const moduleCount = 1;
    const fileCount = 1;
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [`\nTotal: ${moduleCount} module is found (${fileCount} file)`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.FoundModule, moduleCount, fileCount });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #10 - modules found with multiple files",
  fn() {
    const moduleCount = 2;
    const fileCount = 2;
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [`\nTotal: ${moduleCount} modules are found (${fileCount} files)`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.FoundModule, moduleCount, fileCount });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #11 - files not found",
  fn() {
    const fileCount = 0;
    updateOutputMode({ quiet: false, verbose: false });

    const expected = ["INFO: No files are found"];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.FoundFile, fileCount });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #12 - 1 file found",
  fn() {
    const fileCount = 1;
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [`\nTotal: ${fileCount} file is found`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.FoundFile, fileCount });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #13 - multiple files found",
  fn() {
    const fileCount = 2;
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [`\nTotal: ${fileCount} files are found`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.FoundFile, fileCount });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #14 - deleted file",
  fn() {
    const filePath = "/foo/bar.js";
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [`DELETED: ${filePath}`];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.DeletedFile, filePath });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display result #15 - quiet true",
  fn() {
    updateOutputMode({ quiet: true, verbose: false });

    const expected = [];

    mock.console.replaceLogFn();

    displayResultMessage({ id: ResultId.ModuleUrlRequired });
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    // cleanup
    restoreProperties();
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

    const expected = ["INFO: Please specify the module url"];

    mock.console.replaceLogFn();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = ["INFO: Please specify the newer date"];

    mock.console.replaceLogFn();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = ["INFO: Please specify the older date"];

    mock.console.replaceLogFn();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = ["INFO: The specified newer date is invalid"];

    mock.console.replaceLogFn();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = ["INFO: The specified older date is invalid"];

    mock.console.replaceLogFn();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = [
      "INFO: Please specify the module url",
      "INFO: Please specify the older date",
      "INFO: The specified newer date is invalid",
    ];

    mock.console.replaceLogFn();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = [];

    mock.console.replaceLogFn();

    displayInvalidArgsMessage(invalidArgs);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #1 - All",
  fn() {
    updateOutputMode({ quiet: false, verbose: true });

    const expected = [
      "Search criteria:\n" +
      " - All cached modules",
    ];

    mock.console.replaceLogFn();

    displaySearchCriteria({}, {});
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = [
      "Search criteria:\n" +
      ` - Search with option "--missing-url"`,
    ];

    mock.console.replaceLogFn();

    displaySearchCriteria(option, target);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = [
      "Search criteria:\n" +
      ` - Search with option "--leaves"`,
    ];

    mock.console.replaceLogFn();

    displaySearchCriteria(option, target);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = [
      "Search criteria:\n" +
      ` - Search with option "--uses"`,
    ];

    mock.console.replaceLogFn();

    displaySearchCriteria(option, target);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = [
      "Search criteria:\n" +
      ` - Module URL contains "example.com"`,
    ];

    mock.console.replaceLogFn();

    displaySearchCriteria(option, target);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = [
      "Search criteria:\n" +
      ` - Download date is equal to or newer than "2022-01-02T03:45:06.000Z"`,
    ];

    mock.console.replaceLogFn();

    displaySearchCriteria(option, target);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = [
      "Search criteria:\n" +
      ` - Download date is equal to or older than "2022-01-02T03:45:06.000Z"`,
    ];

    mock.console.replaceLogFn();

    displaySearchCriteria(option, target);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
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

    const expected = [
      "Search criteria:\n" +
      ` - Search with option "--leaves"\n` +
      ` - Module URL contains "example.com"\n` +
      ` - Download date is equal to or newer than "2021-12-11T10:09:58.000Z"\n` +
      ` - Download date is equal to or older than "2022-01-02T03:45:06.000Z"`,
    ];

    mock.console.replaceLogFn();

    displaySearchCriteria(option, target);
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display search criteria #9 - verbose false",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [];

    mock.console.replaceLogFn();

    displaySearchCriteria({}, {});
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display search location #1 - cache locations",
  fn() {
    location.baseDepsPath = "/foo/bar";
    location.baseGenPath = "/bar/baz";
    updateOutputMode({ quiet: false, verbose: true });

    const expected = [
      "Search locations:\n" +
      " - /foo/bar\n" +
      " - /bar/baz",
    ];

    mock.console.replaceLogFn();

    displaySearchLocation();
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display search location #2 - verbose false",
  fn() {
    location.baseDepsPath = "/foo/bar";
    location.baseGenPath = "/bar/baz";
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [];

    mock.console.replaceLogFn();

    displaySearchLocation();
    assertEquals(mock.console.output, expected);

    // cleanup
    mock.console.restoreLogFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display progress #1 - message",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [" *  2 / 10 completed\r"];

    mock.stdout.replaceWriteSyncFn();

    displayProgress(2, 10, "completed");
    assertEquals(mock.stdout.output, expected);

    // cleanup
    mock.stdout.restoreWriteSyncFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display progress #2 - quiet true",
  fn() {
    updateOutputMode({ quiet: true, verbose: false });

    const expected = [];

    mock.stdout.replaceWriteSyncFn();

    displayProgress(2, 10);
    assertEquals(mock.stdout.output, expected);

    // cleanup
    mock.stdout.restoreWriteSyncFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display progress #3 - hide cursor",
  ignore: Deno.build.os === "windows",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [
      "\x1b[?25l",
      " *  0 / 10 done\r",
    ];

    mock.stdout.replaceWriteSyncFn();
    mock.addSignalListener.replaceListenerFn();

    displayProgress(0, 10);
    assertEquals(mock.stdout.output, expected);

    assertEquals(mock.addSignalListener.output[0][0], "SIGINT");
    assertEquals(mock.addSignalListener.output[0][1].name, "showCursor");
    assertEquals(mock.addSignalListener.output[1][0], "SIGTERM");
    assertEquals(mock.addSignalListener.output[1][1].name, "showCursor");

    // cleanup
    mock.stdout.restoreWriteSyncFn();
    mock.addSignalListener.restoreListenerFn();
    restoreProperties();
  },
});

Deno.test({
  name: "display progress #4 - show cursor",
  ignore: Deno.build.os === "windows",
  fn() {
    updateOutputMode({ quiet: false, verbose: false });

    const expected = [
      " * 10 / 10 done\r",
      "\x1b[2K",
      "\x1b[?25h",
    ];

    mock.stdout.replaceWriteSyncFn();
    mock.removeSignalListener.replaceListenerFn();
    mock.addSignalListener.replaceListenerFn();

    displayProgress(10, 10);
    assertEquals(mock.stdout.output, expected);

    assertEquals(mock.removeSignalListener.output[0][0], "SIGINT");
    assertEquals(mock.removeSignalListener.output[0][1].name, "showCursor");
    assertEquals(mock.removeSignalListener.output[1][0], "SIGTERM");
    assertEquals(mock.removeSignalListener.output[1][1].name, "showCursor");

    assertEquals(mock.addSignalListener.output[0][0], "SIGINT");
    assertEquals(mock.addSignalListener.output[0][1].name, "");
    assertEquals(mock.addSignalListener.output[1][0], "SIGTERM");
    assertEquals(mock.addSignalListener.output[1][1].name, "");

    // cleanup
    mock.stdout.restoreWriteSyncFn();
    mock.removeSignalListener.restoreListenerFn();
    mock.addSignalListener.restoreListenerFn();
    restoreProperties();
  },
});
