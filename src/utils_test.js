// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals, assertRejects, assertThrows } from "../tests/deps.ts";
import {
  fetchJsonFile,
  formatDateString,
  isDirectoryExist,
  isFileExist,
  isValidUrl,
  mergeObject,
  obtainValueFromMetadata,
  readJsonFile,
  Semaphore,
  switchObjectKeyAndValue,
} from "./utils.ts";

const testdataDir = (() => {
  const testdataUrl = new URL("../tests/testdata/", import.meta.url);
  return Deno.build.os === "windows"
    ? testdataUrl.pathname.slice(1) // remove leading letter "/"
    : testdataUrl.pathname;
})();

Deno.test({
  name: "semaphore #1 - aquire",
  async fn() {
    const semaphore = new Semaphore();
    assertEquals(semaphore.counter, 1);
    assertEquals(semaphore.queue.length, 0);
    await semaphore.acquire();
    assertEquals(semaphore.counter, 0);
    assertEquals(semaphore.queue.length, 0);
  },
});

Deno.test({
  name: "semaphore #2 - release",
  async fn() {
    const semaphore = new Semaphore();
    await semaphore.acquire();
    assertEquals(semaphore.counter, 0);
    assertEquals(semaphore.queue.length, 0);
    semaphore.release();
    assertEquals(semaphore.counter, 1);
    assertEquals(semaphore.queue.length, 0);
  },
});

Deno.test({
  name: "semaphore #3 - enqueue",
  fn() {
    const semaphore = new Semaphore();
    semaphore.acquire();
    assertEquals(semaphore.counter, 0);
    assertEquals(semaphore.queue.length, 0);
    semaphore.acquire();
    assertEquals(semaphore.counter, 0);
    assertEquals(semaphore.queue.length, 1);
  },
});

Deno.test({
  name: "semaphore #4 - dequeue",
  fn() {
    const semaphore = new Semaphore();
    semaphore.acquire();
    semaphore.acquire();
    assertEquals(semaphore.counter, 0);
    assertEquals(semaphore.queue.length, 1);
    semaphore.release();
    assertEquals(semaphore.counter, 0);
    assertEquals(semaphore.queue.length, 0);
  },
});

Deno.test({
  name: "semaphore #5 - multiple queues",
  fn() {
    const semaphore = new Semaphore(2);
    assertEquals(semaphore.counter, 2);
    semaphore.acquire();
    semaphore.acquire();
    assertEquals(semaphore.counter, 0);
    assertEquals(semaphore.queue.length, 0);
    semaphore.acquire();
    semaphore.acquire();
    assertEquals(semaphore.counter, 0);
    assertEquals(semaphore.queue.length, 2);
    semaphore.release();
    semaphore.release();
    assertEquals(semaphore.counter, 0);
    assertEquals(semaphore.queue.length, 0);
    semaphore.release();
    semaphore.release();
    assertEquals(semaphore.counter, 2);
    assertEquals(semaphore.queue.length, 0);
  },
});

Deno.test({
  name: "obtain value from metadata #1 - url only",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/url_only.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data.url, "https://example.com/foo/bar.ts");
    assertEquals(data.date, undefined);
    assertEquals(data.location, undefined);
    assertEquals(data.types, undefined);
  },
});

Deno.test({
  name: "obtain value from metadata #2 - url and now",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/url_now.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data.url, "https://example.com/foo/bar.ts");
    assertEquals(data.date, "2022-03-31T13:09:14.000Z");
    assertEquals(data.location, undefined);
    assertEquals(data.types, undefined);
  },
});

Deno.test({
  name: "obtain value from metadata #3 - url and date",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/url_date.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data.url, "https://example.com/foo/bar.ts");
    assertEquals(data.date, "2022-03-31T13:09:14.000Z");
    assertEquals(data.location, undefined);
    assertEquals(data.types, undefined);
  },
});

Deno.test({
  name: "obtain value from metadata #4 - url and location absolute uri",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/url_location_abs.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data.url, "https://example.com/foo/bar.ts");
    assertEquals(data.date, undefined);
    assertEquals(data.location, "https://example.net/foo@1.0.0/bar.ts");
    assertEquals(data.types, undefined);
  },
});

Deno.test({
  name: "obtain value from metadata #5 - url and location relative uri",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/url_location_rel.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data.url, "https://example.com/foo/bar.ts");
    assertEquals(data.date, undefined);
    assertEquals(data.location, "https://example.com/foo@1.0.0/bar.ts");
    assertEquals(data.types, undefined);
  },
});

Deno.test({
  name: "obtain value from metadata #6 - url and location invalid uri",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/url_location_invalid.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data.url, "https://example.com/foo/bar.ts");
    assertEquals(data.date, undefined);
    assertEquals(data.location, undefined);
    assertEquals(data.types, undefined);
  },
});

Deno.test({
  name: "obtain value from metadata #7 - url and types absolute uri",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/url_types_abs.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data.url, "https://example.com/foo/bar.ts");
    assertEquals(data.date, undefined);
    assertEquals(data.location, undefined);
    assertEquals(data.types, "https://example.net/foo@1.0.0/bar.d.ts");
  },
});

Deno.test({
  name: "obtain value from metadata #8 - url and types relative uri",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/url_types_rel.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data.url, "https://example.com/foo/bar.ts");
    assertEquals(data.date, undefined);
    assertEquals(data.location, undefined);
    assertEquals(data.types, "https://example.com/foo@1.0.0/bar.d.ts");
  },
});

Deno.test({
  name: "obtain value from metadata #9 - url and types invalid uri",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/url_types_invalid.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data.url, "https://example.com/foo/bar.ts");
    assertEquals(data.date, undefined);
    assertEquals(data.location, undefined);
    assertEquals(data.types, undefined);
  },
});

Deno.test({
  name: "obtain value from metadata #10 - all properties",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/all.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data.url, "https://example.com/foo/bar.ts");
    assertEquals(data.date, "2022-03-31T13:09:14.000Z");
    assertEquals(data.location, "https://example.net/foo@1.0.0/bar.ts");
    assertEquals(data.types, "https://example.com/foo@1.0.0/bar.d.ts");
  },
});

Deno.test({
  name: "obtain value from metadata #11 - invalid metadata file",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/invalid.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data, {});
  },
});

Deno.test({
  name: "obtain value from metadata #12 - non-existing metadata file",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/non-existing.metadata.json";
    const data = obtainValueFromMetadata(path);
    assertEquals(data, {});
  },
});

Deno.test({
  name: "fetch json file #1 - valid json file",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}utils/import_maps/valid.json`;
    const data = await fetchJsonFile(url);
    assertEquals(typeof data, "object");
  },
});

Deno.test({
  name: "fetch json file #2 - invalid json file",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}utils/import_maps/invalid.json`;
    await assertRejects(
      () => fetchJsonFile(url),
      Error,
      "The specified resource is not a valid JSON file",
    );
  },
});

Deno.test({
  name: "fetch json file #3 - non-existing json file",
  permissions: { read: true },
  async fn() {
    const url = `file://${testdataDir}utils/import_maps/non-existing.json`;
    await assertRejects(
      () => fetchJsonFile(url),
      Error,
      "NetworkError when attempting to fetch resource.",
    );
  },
});

Deno.test({
  name: "fetch json file #4 - invalid url",
  async fn() {
    const url = "http://";
    await assertRejects(
      () => fetchJsonFile(url),
      Error,
      "Invalid URL",
    );
  },
});

Deno.test({
  name: "using HTTP test server",
  permissions: { net: true },
  async fn(t) {
    // test server listener
    const server = Deno.listen({ port: 8088 });

    await t.step({
      name: "fetch json file #5 - HTTP Timeout",
      async fn() {
        const timeout = 10;
        const url = "http://127.0.0.1:8088/timeout";

        // test server connection
        (async () => {
          const conn = await server.accept();
          setTimeout(() => conn.close(), timeout);
        })();

        await assertRejects(
          () => fetchJsonFile(url, timeout),
          Error,
          "Fetch request has timed out",
        );
      },
    });

    await t.step({
      name: "fetch json file #6 - HTTP Error",
      async fn() {
        const url = "http://127.0.0.1:8088/not_found";

        // test server connection and the response
        (async () => {
          const conn = await server.accept();
          const httpConn = Deno.serveHttp(conn);
          const requestEvent = await httpConn.nextRequest();
          const res = new Response("", { status: 404, statusText: "Not Found" });
          await requestEvent.respondWith(res);
          httpConn.close();
        })();

        await assertRejects(
          () => fetchJsonFile(url),
          Error,
          "Failed to fetch\nResponse Status: 404 Not Found",
        );
      },
    });

    server.close();
  },
});

Deno.test({
  name: "read json file #1 - valid json file",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/import_maps/valid.json";
    const data = readJsonFile(path);
    assertEquals(typeof data, "object");
  },
});

Deno.test({
  name: "read json file #2 - invalid json file",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/import_maps/invalid.json";
    assertThrows(
      () => readJsonFile(path),
      Error,
      "The specified resource is not a valid JSON file",
    );
  },
});

Deno.test({
  name: "read json file #3 - non-existing json file",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/import_maps/non-existing.json";
    assertThrows(
      () => readJsonFile(path),
      Error,
      "No such file or directory",
    );
  },
});

Deno.test({
  name: "verify file exists #1 - exist",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/all.metadata.json";
    assertEquals(isFileExist(path), true);
  },
});

Deno.test({
  name: "verify file exists #2 - not exist",
  permissions: { read: true },
  fn() {
    const path = testdataDir + "utils/metadata/non-existing.metadata.json";
    assertEquals(isFileExist(path), false);
  },
});

Deno.test({
  name: "verify directory exists #1 - exist",
  permissions: { read: true },
  fn() {
    assertEquals(isDirectoryExist(testdataDir), true);
  },
});

Deno.test({
  name: "verify directory exists #2 - not exist",
  permissions: { read: true },
  fn() {
    assertEquals(isDirectoryExist(testdataDir + "non-existing"), false);
  },
});

Deno.test({
  name: "verify url string #1 - valid url",
  fn() {
    const url = "https://example.com/foo.html";
    assertEquals(isValidUrl(url), true);
  },
});

Deno.test({
  name: "verify url string #2 - invalid url",
  fn() {
    const url = "./foo/bar.js";
    assertEquals(isValidUrl(url), false);
  },
});

Deno.test({
  name: "format date string #1 - yyyy-MM-ddTHH:mm:ss.fffZ",
  fn() {
    const input = "2022-12-31T10:23:45.678Z";
    const expected = "2022-12-31T10:23:45.678Z";
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #2 - yyyy/M/d H:m:s.fZ",
  fn() {
    const input = "2022/1/2 3:4:5.6Z";
    const expected = "2022-01-02T03:04:05.006Z";
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #3 - yyyy-MM-ddTHH:mm:ss",
  fn() {
    const input = "2022-01-02T09:10:23";
    const expected = "2022-01-02T09:10:23.000Z";
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #4 - yyyy-MM-ddTHH:mm",
  fn() {
    const input = "2022-01-02T09:10";
    const expected = "2022-01-02T09:10:00.000Z";
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #5 - yyyy-MM-ddTHH",
  fn() {
    const input = "2022-01-02T09";
    const expected = "2022-01-02T09:00:00.000Z";
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #6 - yyyy-MM-dd",
  fn() {
    const input = "2022-01-02";
    const expected = "2022-01-02T00:00:00.000Z";
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #7 - yyyy-MM",
  fn() {
    const input = "2022-01";
    const expected = "2022-01-01T00:00:00.000Z";
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #8 - yyyy",
  fn() {
    const input = "2022";
    const expected = undefined;
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #9 - undefined",
  fn() {
    const input = undefined;
    const expected = undefined;
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #10 - word + yyyy-MM-dd",
  fn() {
    const input = "abc-2022-01-02";
    const expected = undefined;
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #11 - yyyy-MM-ddTHH:mm:ss.sssZ + number + word",
  fn() {
    const input = "2022-01-02T09:10:23.456Z012abc";
    const expected = undefined;
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #12 - yyyy-MMTHH:mm:",
  fn() {
    const input = "2022-01T09:10";
    const expected = undefined;
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #13 - yyyy-MM-ddTHH:mm.sss",
  fn() {
    const input = "2022-01-02T09:10.456";
    const expected = undefined;
    assertEquals(formatDateString(input) === expected, true);
  },
});
Deno.test({
  name: "format date string #14 - yyyy-MM-dd + number",
  fn() {
    const input = "2022-01-023";
    const expected = undefined;
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "format date string #15 - yyyyMMdd",
  fn() {
    const input = "20220102";
    const expected = undefined;
    assertEquals(formatDateString(input) === expected, true);
  },
});

Deno.test({
  name: "merge object #1 - string",
  fn() {
    const o1 = { "a": "v-a11", "b": "v-b11" };
    const o2 = { "a": "v-a21", "c": "v-c21" };
    const actual = mergeObject(o1, o2);

    assertEquals(Object.keys(actual).length, 3);
    assertEquals(actual["a"].size, 2);
    assertEquals(actual["b"].size, 1);
    assertEquals(actual["c"].size, 1);
    assertEquals(actual["a"].has("v-a11"), true);
    assertEquals(actual["a"].has("v-a21"), true);
    assertEquals(actual["b"].has("v-b11"), true);
    assertEquals(actual["c"].has("v-c21"), true);
  },
});

Deno.test({
  name: "merge object #2 - Set",
  fn() {
    const o1 = { "a": new Set(["v-a00", "v-a11"]), "b": new Set(["v-b11", "v-b12"]) };
    const o2 = { "a": new Set(["v-a00", "v-a21", "v-a22"]), "c": new Set(["v-c21"]) };
    const actual = mergeObject(o1, o2);

    assertEquals(Object.keys(actual).length, 3);
    assertEquals(actual["a"].size, 4);
    assertEquals(actual["b"].size, 2);
    assertEquals(actual["c"].size, 1);
    assertEquals(actual["a"].has("v-a00"), true);
    assertEquals(actual["a"].has("v-a11"), true);
    assertEquals(actual["a"].has("v-a21"), true);
    assertEquals(actual["a"].has("v-a22"), true);
    assertEquals(actual["b"].has("v-b11"), true);
    assertEquals(actual["b"].has("v-b12"), true);
    assertEquals(actual["c"].has("v-c21"), true);
  },
});

Deno.test({
  name: "merge object #3 - string & Set",
  fn() {
    const o1 = { "a": "v-a11", "b": "v-b11" };
    const o2 = { "a": new Set(["v-a11", "v-a21", "v-a22"]), "b": new Set(["v-b21", "v-b22"]) };
    const actual = mergeObject(o1, o2);

    assertEquals(Object.keys(actual).length, 2);
    assertEquals(actual["a"].size, 3);
    assertEquals(actual["b"].size, 3);
    assertEquals(actual["a"].has("v-a11"), true);
    assertEquals(actual["a"].has("v-a21"), true);
    assertEquals(actual["a"].has("v-a22"), true);
    assertEquals(actual["b"].has("v-b11"), true);
    assertEquals(actual["b"].has("v-b21"), true);
    assertEquals(actual["b"].has("v-b22"), true);
  },
});

Deno.test({
  name: "merge object #4 - Set & string",
  fn() {
    const o1 = { "a": new Set(["v-a11", "v-a12"]), "b": new Set(["v-b11", "v-b12"]) };
    const o2 = { "a": "v-a21", "b": "v-b11" };
    const actual = mergeObject(o1, o2);

    assertEquals(Object.keys(actual).length, 2);
    assertEquals(actual["a"].size, 3);
    assertEquals(actual["b"].size, 2);
    assertEquals(actual["a"].has("v-a11"), true);
    assertEquals(actual["a"].has("v-a12"), true);
    assertEquals(actual["a"].has("v-a21"), true);
    assertEquals(actual["b"].has("v-b11"), true);
    assertEquals(actual["b"].has("v-b12"), true);
  },
});

Deno.test({
  name: "merge object #5 - mixed",
  fn() {
    const o1 = { "a": new Set(["v-a11", "v-a12"]), "b": "v-b11" };
    const o2 = { "a": "v-a21", "c": new Set(["v-c21", "v-c22"]) };
    const o3 = { "a": new Set(["v-a21", "v-a31"]), "b": "v-b11" };
    const actual = mergeObject(o1, o2, o3);

    assertEquals(Object.keys(actual).length, 3);
    assertEquals(actual["a"].size, 4);
    assertEquals(actual["b"].size, 1);
    assertEquals(actual["c"].size, 2);
    assertEquals(actual["a"].has("v-a11"), true);
    assertEquals(actual["a"].has("v-a12"), true);
    assertEquals(actual["a"].has("v-a21"), true);
    assertEquals(actual["a"].has("v-a31"), true);
    assertEquals(actual["b"].has("v-b11"), true);
    assertEquals(actual["c"].has("v-c21"), true);
    assertEquals(actual["c"].has("v-c22"), true);
  },
});

Deno.test({
  name: "switch object key and value #1",
  fn() {
    const o = { "k1": new Set(["v1", "v2"]), "k2": new Set(["v2", "v3"]) };
    const actual = switchObjectKeyAndValue(o);

    assertEquals(Object.keys(actual).length, 3);
    assertEquals(actual["v1"].size, 1);
    assertEquals(actual["v2"].size, 2);
    assertEquals(actual["v3"].size, 1);
    assertEquals(actual["v1"].has("k1"), true);
    assertEquals(actual["v2"].has("k1"), true);
    assertEquals(actual["v2"].has("k2"), true);
    assertEquals(actual["v3"].has("k2"), true);
  },
});
