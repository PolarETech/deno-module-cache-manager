// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals } from "../tests/deps.ts";
import { location } from "./location.ts";
import { ModuleData } from "./module_data.ts";

const testdataDir = (() => {
  const testdataUrl = new URL("../tests/testdata/", import.meta.url);
  return Deno.build.os === "windows"
    ? testdataUrl.pathname.slice(1) // remove leading letter "/"
    : testdataUrl.pathname;
})();

const sampleData = {
  "https://example.com/dummy1/mod.ts": {
    hash: "70df6afede37c85584cf771fb66c04e0b987a763032b012d3b750ee214130d19",
    target: true,
    date: undefined,
    location: undefined,
    types: undefined,
    relatedFilePath: [
      `${testdataDir}module_data/cache/deps/https/example.com/70df6afede37c85584cf771fb66c04e0b987a763032b012d3b750ee214130d19.metadata.json`,
    ],
    uses: [],
  },
  "https://example.com/dummy1/dummy2/mod.ts": {
    hash: "2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927",
    target: true,
    date: "2022-01-02T03:45:03.000Z",
    location: undefined,
    types: undefined,
    relatedFilePath: [
      `${testdataDir}module_data/cache/deps/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927`,
      `${testdataDir}module_data/cache/deps/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.metadata.json`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.d.ts`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.js`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.js.map`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.buildinfo`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.meta`,
    ],
    uses: [],
  },
  "https://example.com/dummy1/import_map.json": {
    hash: "c76db2b1d4a778ac0d2c9732cacd6661370b171efa5af1a2f7170fb4ca7b52d2",
    target: false,
    date: undefined,
    location: undefined,
    types: undefined,
    relatedFilePath: undefined,
    uses: undefined,
  },
  "https://example.com/dummy2/index.js": {
    hash: "8e47dd97f39f2fc1e75e7ea97f38ac5a2de5c3f97a5f2eb1ce9a12b4f0e91145",
    target: false,
    date: "2022-02-03T14:50:01.000Z",
    location: "https://example.com/dummy2@1.0.0/index.js",
    types: undefined,
    relatedFilePath: undefined,
    uses: [
      "https://example.com/dummy1/dummy2/mod.ts",
    ],
  },
  "https://example.com/dummy2@1.0.0/index.js": {
    hash: "d2744402f776b54828373a9ef1b8155aae2f60a38c20963399a6a1e2b665c516",
    target: false,
    date: "2022-02-03T14:50:01.000Z",
    location: undefined,
    types: undefined,
    relatedFilePath: undefined,
    uses: [
      "https://example.com/dummy2/index.js",
    ],
  },
  "https://example.com/dummy3/mod.js": {
    hash: "2594da3b61c98fedfbc0226b38b63a588a28ce87d179c4fae902adbb5d673541",
    target: true,
    date: "2022-01-03T20:00:02.000Z",
    location: undefined,
    types: "https://example.com/dummy3/mod.d.ts",
    relatedFilePath: [
      `${testdataDir}module_data/cache/deps/https/example.com/2594da3b61c98fedfbc0226b38b63a588a28ce87d179c4fae902adbb5d673541`,
      `${testdataDir}module_data/cache/deps/https/example.com/2594da3b61c98fedfbc0226b38b63a588a28ce87d179c4fae902adbb5d673541.metadata.json`,
    ],
    uses: [
      `file://${testdataDir}module_data/import_map.json`,
      "https://example.com/dummy1/dummy2/mod.ts",
      "https://example.com/dummy1/import_map.json",
      "https://example.com/dummy2@1.0.0/index.js",
    ],
  },
  "https://example.com/dummy3/mod.d.ts": {
    hash: "72a60a436a92f6d6aa57946c1c9e46157fdc0d8d69786f40f16ec8648ac5241e",
    target: true,
    date: "2022-01-03T20:00:02.000Z",
    location: undefined,
    types: undefined,
    relatedFilePath: [
      `${testdataDir}module_data/cache/deps/https/example.com/72a60a436a92f6d6aa57946c1c9e46157fdc0d8d69786f40f16ec8648ac5241e`,
      `${testdataDir}module_data/cache/deps/https/example.com/72a60a436a92f6d6aa57946c1c9e46157fdc0d8d69786f40f16ec8648ac5241e.metadata.json`,
    ],
    uses: [
      "https://example.com/dummy3/mod.js",
    ],
  },
};

const sampleDataMinimum = {
  "https://example.com/dummy1/mod.ts": {
    hash: "70df6afede37c85584cf771fb66c04e0b987a763032b012d3b750ee214130d19",
    target: true,
    date: undefined,
    location: undefined,
    types: undefined,
    relatedFilePath: undefined,
    uses: undefined,
  },
};

Deno.test({
  name: "get data #1 - all url list",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = [
      "https://example.com/dummy1/mod.ts",
      "https://example.com/dummy1/dummy2/mod.ts",
      "https://example.com/dummy1/import_map.json",
      "https://example.com/dummy2/index.js",
      "https://example.com/dummy2@1.0.0/index.js",
      "https://example.com/dummy3/mod.js",
      "https://example.com/dummy3/mod.d.ts",
    ];

    const actual = moduleData.allUrlList;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #2 - targeted url list",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = [
      "https://example.com/dummy1/mod.ts",
      "https://example.com/dummy1/dummy2/mod.ts",
      "https://example.com/dummy3/mod.js",
      "https://example.com/dummy3/mod.d.ts",
    ];

    const actual = moduleData.targetedUrlList;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #3 - sorted url list",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = [
      "https://example.com/dummy1/dummy2/mod.ts",
      "https://example.com/dummy1/mod.ts",
      "https://example.com/dummy3/mod.d.ts",
      "https://example.com/dummy3/mod.js",
    ];

    const actual = moduleData.sortedUrlList;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #4 - sorted url list by date",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = [
      "https://example.com/dummy3/mod.d.ts",
      "https://example.com/dummy3/mod.js",
      "https://example.com/dummy1/dummy2/mod.ts",
      "https://example.com/dummy1/mod.ts",
    ];

    const actual = moduleData.sortedUrlListByDate;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #5 - targeted url list length",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = 4;

    const actual = moduleData.targetedUrlListLength;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #6 - max url string length",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = 40;

    const actual = moduleData.maxUrlStringLength;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #7 - related file path list",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = [
      `${testdataDir}module_data/cache/deps/https/example.com/70df6afede37c85584cf771fb66c04e0b987a763032b012d3b750ee214130d19.metadata.json`,
      `${testdataDir}module_data/cache/deps/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927`,
      `${testdataDir}module_data/cache/deps/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.metadata.json`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.d.ts`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.js`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.js.map`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.buildinfo`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.meta`,
      `${testdataDir}module_data/cache/deps/https/example.com/2594da3b61c98fedfbc0226b38b63a588a28ce87d179c4fae902adbb5d673541`,
      `${testdataDir}module_data/cache/deps/https/example.com/2594da3b61c98fedfbc0226b38b63a588a28ce87d179c4fae902adbb5d673541.metadata.json`,
      `${testdataDir}module_data/cache/deps/https/example.com/72a60a436a92f6d6aa57946c1c9e46157fdc0d8d69786f40f16ec8648ac5241e`,
      `${testdataDir}module_data/cache/deps/https/example.com/72a60a436a92f6d6aa57946c1c9e46157fdc0d8d69786f40f16ec8648ac5241e.metadata.json`,
    ];

    const actual = moduleData.relatedFilePathList;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #8 - related file path list (undefined)",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleDataMinimum;

    const expected = [];

    const actual = moduleData.relatedFilePathList;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #9 - related file list length",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = 12;

    const actual = moduleData.relatedFilePathListLength;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #10 - related file list length (undefined)",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleDataMinimum;

    const expected = 0;

    const actual = moduleData.relatedFilePathListLength;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #11 - location data specified in header",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = {
      "https://example.com/dummy2/index.js": "https://example.com/dummy2@1.0.0/index.js",
    };

    const actual = moduleData.locationDataSpecifiedInHeader;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #12 - types data specified in header",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = {
      "https://example.com/dummy3/mod.js": "https://example.com/dummy3/mod.d.ts",
    };

    const actual = moduleData.typesDataSpecifiedInHeader;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #13 - cached json file url and hash list",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = [{
      url: "https://example.com/dummy1/import_map.json",
      hash: "c76db2b1d4a778ac0d2c9732cacd6661370b171efa5af1a2f7170fb4ca7b52d2",
    }];

    const actual = moduleData.cachedJsonFileUrlAndHashList;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #14 - date by url",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = "2022-01-03T20:00:02.000Z";

    const actual = moduleData.date("https://example.com/dummy3/mod.js");
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #15 - date by url",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = "2022-01-03T20:00:02.000Z";

    const actual = moduleData.date("https://example.com/dummy3/mod.js");
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #16 - relatedFilePath by url",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = [
      `${testdataDir}module_data/cache/deps/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927`,
      `${testdataDir}module_data/cache/deps/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.metadata.json`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.d.ts`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.js`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.js.map`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.buildinfo`,
      `${testdataDir}module_data/cache/gen/https/example.com/2955ec43d130f10a87829226e582570396e789acb3eb8cf022eaf54fd55c3927.meta`,
    ];

    const actual = moduleData.relatedFilePath("https://example.com/dummy1/dummy2/mod.ts");
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #17 - relatedFilePath by url (undefined)",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleDataMinimum;

    const expected = [];

    const actual = moduleData.relatedFilePath("https://example.com/dummy1/mod.ts");
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #18 - uses with url",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleData;

    const expected = [
      `file://${testdataDir}module_data/import_map.json`,
      "https://example.com/dummy1/dummy2/mod.ts",
      "https://example.com/dummy1/import_map.json",
      "https://example.com/dummy2@1.0.0/index.js",
    ];

    const actual = moduleData.uses("https://example.com/dummy3/mod.js");
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "get data #19 - uses with url (undefined)",
  fn() {
    const moduleData = new ModuleData();
    moduleData.data = sampleDataMinimum;

    const expected = [];

    const actual = moduleData.uses("https://example.com/dummy1/mod.ts");
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "collect module data #1 - with url target",
  permissions: { read: true },
  fn() {
    const depsPath = testdataDir + "module_data/cache/deps/";
    const target = { url: "mod" };

    const expected = {};
    for (const url of Object.keys(sampleData)) {
      expected[url] = {
        hash: sampleData[url].hash,
        target: sampleData[url].target,
        date: sampleData[url].date,
        location: sampleData[url].location,
        types: sampleData[url].types,
      };
    }

    const moduleData = new ModuleData();
    moduleData.collectModule(depsPath, target);

    const actual = moduleData.data;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "collect module data #2 - with newer and older target",
  permissions: { read: true },
  fn() {
    const depsPath = testdataDir + "module_data/cache/deps";
    const target = { newer: "2022-01-03", older: "2022-01-04" };

    const expected = {};
    for (const url of Object.keys(sampleData)) {
      expected[url] = {
        hash: sampleData[url].hash,
        target: url.includes("dummy3") ? true : false,
        date: sampleData[url].date,
        location: sampleData[url].location,
        types: sampleData[url].types,
      };
    }

    const moduleData = new ModuleData();
    moduleData.collectModule(depsPath, target);

    const actual = moduleData.data;
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "collect module data #3 - related file path",
  permissions: { read: true },
  fn() {
    location.baseDepsPath = testdataDir + "module_data/cache/deps";
    location.baseGenPath = testdataDir + "module_data/cache/gen";
    const target = { url: "mod" };

    const expected = {};
    for (const url of Object.keys(sampleData)) {
      expected[url] = {
        hash: sampleData[url].hash,
        target: sampleData[url].target,
        date: sampleData[url].date,
        location: sampleData[url].location,
        types: sampleData[url].types,
      };
      if (url.includes("mod")) {
        expected[url].relatedFilePath = sampleData[url].relatedFilePath;
      }
    }

    const moduleData = new ModuleData();
    moduleData.collectModule(location.baseDepsPath, target);
    moduleData.collectRelatedFilePath();

    const actual = moduleData.data;
    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
    location.baseGenPath = "";
  },
});

Deno.test({
  name: "collect module data #4 - uses module with import-maps",
  permissions: { read: true },
  async fn() {
    location.baseDepsPath = testdataDir + "module_data/cache/deps";
    const target = { url: "mod" };
    const importMaps = new Set([`file://${testdataDir}module_data/import_map.json`]);

    const expected = {};
    for (const url of Object.keys(sampleData)) {
      expected[url] = {
        hash: sampleData[url].hash,
        target: sampleData[url].target,
        date: sampleData[url].date,
        location: sampleData[url].location,
        types: sampleData[url].types,
      };
      if (url.includes("mod")) {
        expected[url].uses = sampleData[url].uses;
        expected[url].uses.sort();
      }
    }

    const moduleData = new ModuleData();
    moduleData.collectModule(location.baseDepsPath, target);
    await moduleData.collectUsesModule(importMaps);

    const actual = moduleData.data;
    for (const url of Object.keys(actual)) {
      actual[url].uses?.sort();
    }

    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
  },
});

Deno.test({
  name: "collect module data #5 - uses module without import-maps",
  permissions: { read: true },
  async fn() {
    location.baseDepsPath = testdataDir + "module_data/cache_min/deps";
    const target = {};

    const expected = {};
    for (const url of Object.keys(sampleDataMinimum)) {
      expected[url] = {
        hash: sampleDataMinimum[url].hash,
        target: sampleDataMinimum[url].target,
        date: sampleDataMinimum[url].date,
        location: sampleDataMinimum[url].location,
        types: sampleDataMinimum[url].types,
        uses: [],
      };
    }

    const moduleData = new ModuleData();
    moduleData.collectModule(location.baseDepsPath, target);
    await moduleData.collectUsesModule();

    const actual = moduleData.data;

    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
  },
});

Deno.test({
  name: "collect module data #6 - leaves module",
  permissions: { read: true },
  async fn() {
    location.baseDepsPath = testdataDir + "module_data/cache/deps";
    const target = { url: "mod" };
    const importMaps = new Set([`file://${testdataDir}module_data/import_map.json`]);

    const expected = {};
    for (const url of Object.keys(sampleData)) {
      expected[url] = {
        hash: sampleData[url].hash,
        target: sampleData[url].target,
        date: sampleData[url].date,
        location: sampleData[url].location,
        types: sampleData[url].types,
      };
      if (url.includes("mod")) {
        expected[url].uses = sampleData[url].uses;
        expected[url].uses.sort();
      }
      if (expected[url].uses?.length > 0) {
        expected[url].target = false;
      }
    }

    const moduleData = new ModuleData();
    moduleData.collectModule(location.baseDepsPath, target);
    await moduleData.extractLeavesModule(importMaps);

    const actual = moduleData.data;
    for (const url of Object.keys(actual)) {
      actual[url].uses?.sort();
    }

    assertEquals(actual, expected);

    // cleanup
    location.baseDepsPath = "";
  },
});
