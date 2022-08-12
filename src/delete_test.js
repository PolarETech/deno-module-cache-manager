// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { assertEquals, assertThrows } from "../tests/deps.ts";
import { deleteFile } from "./delete.ts";

const testdataDir = (() => {
  const testdataUrl = new URL("../tests/testdata/", import.meta.url);
  return Deno.build.os === "windows"
    ? testdataUrl.pathname.slice(1) // remove leading letter "/"
    : testdataUrl.pathname;
})();

const fileExistence = (path) => {
  try {
    return Deno.lstatSync(path).isFile;
  } catch (_e) {
    return false;
  }
};

Deno.test({
  name: "delete #1 - existing file",
  permissions: { read: true, write: true },
  fn() {
    const filePath = testdataDir + "delete_test.txt";
    Deno.writeTextFileSync(filePath, "dummy");
    assertEquals(fileExistence(filePath), true);

    let result = "";
    deleteFile([filePath], (path) => result = `DELETED: ${path}`);

    assertEquals(fileExistence(filePath), false);
    assertEquals(result, `DELETED: ${filePath}`);
  },
});

Deno.test({
  name: "delete #2 - multiple existing files",
  permissions: { read: true, write: true },
  fn() {
    const filePath1 = testdataDir + "delete_test1.txt";
    Deno.writeTextFileSync(filePath1, "dummy");
    assertEquals(fileExistence(filePath1), true);

    const filePath2 = testdataDir + "delete_test2.txt";
    Deno.writeTextFileSync(filePath2, "dummy");
    assertEquals(fileExistence(filePath2), true);

    const result = [];
    deleteFile([filePath1, filePath2], (path) => result.push(`DELETED: ${path}`));

    assertEquals(fileExistence(filePath1), false);
    assertEquals(fileExistence(filePath2), false);
    assertEquals(result, [`DELETED: ${filePath1}`, `DELETED: ${filePath2}`]);
  },
});

Deno.test({
  name: "delete #3 - non-existing file",
  permissions: { read: true, write: true },
  fn() {
    const filePath = testdataDir + "non-existing.txt";
    assertEquals(fileExistence(filePath), false);

    assertThrows(
      () => deleteFile([filePath]),
      Error,
      "No such file or directory",
    );
  },
});
