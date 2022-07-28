import { assertEquals } from "https://deno.land/std@0.130.0/testing/asserts.ts";
import {
  formatDateString,
  isDirectoryExist,
  isFileExist,
  mergeObject,
  switchObjectKeyAndValue,
} from "./utils.ts";

Deno.test({
  name: "verify file exists #1 - exist",
  permissions: { read: true },
  fn() {
    const url = new URL("./utils_test.js", import.meta.url);
    assertEquals(isFileExist(url.pathname), true);
  },
});

Deno.test({
  name: "verify file exists #2 - not exist",
  permissions: { read: true },
  fn() {
    const url = new URL("./utils_test.dummy", import.meta.url);
    assertEquals(isFileExist(url.pathname), false);
  },
});

Deno.test({
  name: "verify directory exists #1 - exist",
  permissions: { read: true },
  fn() {
    const url = new URL("./", import.meta.url);
    assertEquals(isDirectoryExist(url.pathname), true);
  },
});

Deno.test({
  name: "verify directory exists #2 - not exist",
  permissions: { read: true },
  fn() {
    const url = new URL("./dummy-dummy-dummy", import.meta.url);
    assertEquals(isDirectoryExist(url.pathname), false);
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
    const actual = mergeObject(o1, o2);

    assertEquals(Object.keys(actual).length, 3);
    assertEquals(actual["a"].size, 3);
    assertEquals(actual["b"].size, 1);
    assertEquals(actual["c"].size, 2);
    assertEquals(actual["a"].has("v-a11"), true);
    assertEquals(actual["a"].has("v-a12"), true);
    assertEquals(actual["a"].has("v-a21"), true);
    assertEquals(actual["b"].has("v-b11"), true);
    assertEquals(actual["c"].has("v-c21"), true);
    assertEquals(actual["c"].has("v-c22"), true);
  },
});

Deno.test({
  name: "switch object key and value #1 - string",
  fn() {
    const o = { "k1": "v1", "k2": "v2", "k3": "v2" };
    const actual = switchObjectKeyAndValue(o);

    assertEquals(Object.keys(actual).length, 2);
    assertEquals(actual["v1"].size, 1);
    assertEquals(actual["v2"].size, 2);
    assertEquals(actual["v1"].has("k1"), true);
    assertEquals(actual["v2"].has("k2"), true);
    assertEquals(actual["v2"].has("k3"), true);
  },
});

Deno.test({
  name: "switch object key and value #2 - Set",
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

Deno.test({
  name: "switch object key and value #3 - mixed",
  fn() {
    const o = { "k1": new Set(["v1", "v2"]), "k2": "v2", "k3": "v3" };
    const actual = switchObjectKeyAndValue(o);

    assertEquals(Object.keys(actual).length, 3);
    assertEquals(actual["v1"].size, 1);
    assertEquals(actual["v2"].size, 2);
    assertEquals(actual["v3"].size, 1);
    assertEquals(actual["v1"].has("k1"), true);
    assertEquals(actual["v2"].has("k1"), true);
    assertEquals(actual["v2"].has("k2"), true);
    assertEquals(actual["v3"].has("k3"), true);
  },
});
