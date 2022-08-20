// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals } from "../tests/deps.ts";
import { MockConsole } from "../tests/mocks/io.ts";
import { displayCachedModuleList } from "./list.ts";

const mock = new MockConsole();

Deno.test({
  name: "display list #1 - url",
  fn() {
    const moduleData = {
      sortedUrlList: [
        "https://example.com/dummy1/mod.ts",
        "https://example.com/dummy2/mod.ts",
      ],
    };

    const optionFlags = {
      sortDate: false,
      uses: false,
      withDate: false,
      withPath: false,
    };

    const expected = moduleData.sortedUrlList;

    mock.replaceLogFn();

    displayCachedModuleList(moduleData, optionFlags);
    assertEquals(mock.output, expected);

    // cleanup
    mock.restoreLogFn();
  },
});

Deno.test({
  name: "display list #2 - with date",
  fn() {
    const moduleData = {
      data: {
        "https://example.com/dummy2/mod.ts": {
          date: undefined,
        },
        "https://example.com/dummy1/mod.ts": {
          date: "2022-12-30T11:07:50.000Z",
        },
        "https://example.com/dummy1/dummy2/mod.ts": {
          date: "2022-01-02T03:45:06.000Z",
        },
      },
      sortedUrlList: [
        "https://example.com/dummy1/dummy2/mod.ts",
        "https://example.com/dummy1/mod.ts",
        "https://example.com/dummy2/mod.ts",
      ],
      maxUrlStringLength: 40,
      date: (url) => moduleData.data[url].date,
    };

    const optionFlags = {
      sortDate: false,
      uses: false,
      withDate: true,
      withPath: false,
    };

    const expected = [
      "https://example.com/dummy1/dummy2/mod.ts  2022-01-02T03:45:06.000Z",
      "https://example.com/dummy1/mod.ts         2022-12-30T11:07:50.000Z",
      "https://example.com/dummy2/mod.ts         Unknown",
    ];

    mock.replaceLogFn();

    displayCachedModuleList(moduleData, optionFlags);
    assertEquals(mock.output, expected);

    // cleanup
    mock.restoreLogFn();
  },
});

Deno.test({
  name: "display list #3 - sort date",
  fn() {
    const moduleData = {
      sortedUrlListByDate: [
        "https://example.com/dummy1/mod.ts",
        "https://example.com/dummy2/mod.ts",
      ],
    };

    const optionFlags = {
      sortDate: true,
      uses: false,
      withDate: false,
      withPath: false,
    };

    const expected = moduleData.sortedUrlListByDate;

    mock.replaceLogFn();

    displayCachedModuleList(moduleData, optionFlags);
    assertEquals(mock.output, expected);

    // cleanup
    mock.restoreLogFn();
  },
});

Deno.test({
  name: "display list #4 - with path",
  fn() {
    const moduleData = {
      data: {
        "https://example.com/dummy2/mod.ts": {
          relatedFilePath: ["bar1", "bar2", "bar3"],
        },
        "https://example.com/dummy1/mod.ts": {
          relatedFilePath: ["foo1", "foo2"],
        },
      },
      sortedUrlList: [
        "https://example.com/dummy1/mod.ts",
        "https://example.com/dummy2/mod.ts",
      ],
      relatedFilePath: (url) => moduleData.data[url].relatedFilePath,
    };

    const optionFlags = {
      sortDate: false,
      uses: false,
      withDate: false,
      withPath: true,
    };

    const expected = [
      "\x1b[1mhttps://example.com/dummy1/mod.ts\x1b[0m",
      " - foo1",
      " - foo2",
      "\x1b[1mhttps://example.com/dummy2/mod.ts\x1b[0m",
      " - bar1",
      " - bar2",
      " - bar3",
    ];

    mock.replaceLogFn();

    displayCachedModuleList(moduleData, optionFlags);
    assertEquals(mock.output, expected);

    // cleanup
    mock.restoreLogFn();
  },
});

Deno.test({
  name: "display list #5 - uses",
  fn() {
    const moduleData = {
      data: {
        "https://example.com/dummy2/mod.ts": {
          uses: ["bar1", "bar2", "bar3"],
        },
        "https://example.com/dummy1/mod.ts": {
          uses: ["foo1", "foo2"],
        },
      },
      sortedUrlList: [
        "https://example.com/dummy1/mod.ts",
        "https://example.com/dummy2/mod.ts",
      ],
      uses: (url) => moduleData.data[url].uses,
    };

    const optionFlags = {
      sortDate: false,
      uses: true,
      withDate: false,
      withPath: false,
    };

    const expected = [
      "\x1b[1mhttps://example.com/dummy1/mod.ts\x1b[0m",
      " - foo1",
      " - foo2",
      "\x1b[1mhttps://example.com/dummy2/mod.ts\x1b[0m",
      " - bar1",
      " - bar2",
      " - bar3",
    ];

    mock.replaceLogFn();

    displayCachedModuleList(moduleData, optionFlags);
    assertEquals(mock.output, expected);

    // cleanup
    mock.restoreLogFn();
  },
});
