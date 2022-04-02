// Copyright 2022 Polar Tech. All rights reserved. MIT license.

const version = "0.2.1";
const requiredMinDenoVer = "1.2.0";
const { baseDepsPath, baseGenPath } = await obtainCacheLocation();

class ModuleData {
  data = {};

  get allUrlList() {
    return Object.keys(this.data);
  }

  get targetedUrlList() {
    return Object.keys(this.data).filter((v) => this.data[v].target);
  }

  get sortedUrlList() {
    return this.targetedUrlList.sort();
  }

  get sortedUrlListByDate() {
    return this.sortedUrlList
      .sort((v1, v2) => {
        return (this.data[v1].date ?? "0") > (this.data[v2].date ?? "0") ? -1 : 1;
      });
  }

  get targetedUrlListLength() {
    return this.targetedUrlList.length;
  }

  get maxUrlStringLength() {
    return this.targetedUrlList
      .reduce((v1, v2) => Math.max(v1, v2.length), 0);
  }

  get relatedFilePathList() {
    return this.targetedUrlList
      .flatMap((v) => this.data[v].relatedFilePath);
  }

  get relatedFilePathListLength() {
    try {
      return this.targetedUrlList
        .reduce((v1, v2) => v1 + this.data[v2].relatedFilePath.length, 0);
    } catch (_e) {
      return undefined;
    }
  }

  get typesDataSpecifiedInHeader() {
    return this.allUrlList
      .filter((v) => this.data[v].types)
      .reduce((object, v) => {
        object[v] = this.data[v].types;
        return object;
      }, {});
  }

  date(url) {
    return this.data[url].date;
  }

  relatedFilePath(url) {
    return this.data[url].relatedFilePath;
  }

  uses(url) {
    return this.data[url].uses.sort();
  }

  collectModule(depsPath, targetUrl) {
    if (depsPath.endsWith("/")) depsPath = depsPath.slice(0, -1);
    if (isDirectoryExist(depsPath) === false) return;

    for (const dirEntry of Deno.readDirSync(depsPath)) {
      if (dirEntry.isDirectory) {
        const subDir = `${depsPath}/${dirEntry.name}`;
        this.collectModule(subDir, targetUrl);
        continue;
      }

      if (dirEntry.isFile && dirEntry.name.endsWith(".metadata.json")) {
        const metadata = obtainValueFromMetadata(`${depsPath}/${dirEntry.name}`);
        if (metadata.url === undefined) continue;

        this.data[metadata.url] = {
          hash: dirEntry.name.replace(".metadata.json", ""),
          target: metadata.url.includes(targetUrl) || targetUrl === undefined,
          date: metadata.date,
          types: metadata.types,
        };
      }
    }
  }

  collectRelatedFilePath() {
    const extentionsInDeps = ["", ".metadata.json"];

    // REVIEW:
    // I have never seen .d.ts file created in the gen/http(s) directory.
    // Is it necessary to handle the .d.ts extention?
    // https://github.com/denoland/deno/blob/v1.20.1/cli/cache.rs#L186
    const extentionsInGen = [".d.ts", ".js", ".js.map", ".buildinfo", ".meta"];

    for (const url of this.targetedUrlList) {
      const {
        depsHashedPath,
        genHashedPath,
        genUrlPath,
      } = buildBaseFilePath(url, this.data[url].hash);

      const pathList = [];

      for (const ext of extentionsInDeps) {
        pathList.push(depsHashedPath + ext);
      }

      for (const path of [genHashedPath, genUrlPath]) {
        for (const ext of extentionsInGen) {
          pathList.push(path + ext);
        }
      }

      this.data[url].relatedFilePath = pathList.filter((path) => isFileExist(path));
    }
  }

  async collectUsesModule() {
    const deps1 = await obtainDepsData(this.allUrlList);
    const deps2 = this.typesDataSpecifiedInHeader;
    const usesData = switchObjectKeyAndValue(mergeObject(deps1, deps2));

    for (const url of this.targetedUrlList) {
      this.data[url].uses = usesData[url] ? [...usesData[url]] : [];
    }
  }

  async extractLeavesModule() {
    await this.collectUsesModule();
    for (const url of this.targetedUrlList) {
      if (this.data[url].uses.length > 0) {
        this.data[url].target = false;
      }
    }
  }
}

class Semaphore {
  constructor(maxConcurrent = 1) {
    this.counter = maxConcurrent;
    this.queue = [];
  }

  try() {
    if (this.counter === 0) return;
    if (this.queue.length === 0) return;
    this.counter--;
    const resolve = this.queue.shift();
    resolve();
  }

  acquire() {
    if (this.counter > 0) {
      this.counter--;
      return new Promise((resolve) => resolve());
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    this.counter++;
    this.try();
  }
}

function obtainValueFromMetadata(metadataFilePath) {
  const metadata = {};

  const jsonData = (() => {
    try {
      const text = Deno.readTextFileSync(metadataFilePath);
      return JSON.parse(text);
    } catch (_e) {
      return undefined;
    }
  })();

  if (jsonData === undefined) return metadata;

  metadata.url = jsonData.url;

  metadata.date = (() => {
    try {
      // NOTE:
      // SystemTime is not stored in metadata created by Deno v1.16.4 or earlier
      // https://github.com/denoland/deno/pull/13010
      return new Date(jsonData.now.secs_since_epoch * 1000).toISOString();
    } catch (_e) {
      // Proceed to read a date header instead of using SystemTime
    }
    try {
      return new Date(jsonData.headers.date).toISOString();
    } catch (_e) {
      return undefined;
    }
  })();

  // URL of .d.ts file specified in x-typescript-types header
  metadata.types = (() => {
    if (/javascript|jsx/.test(jsonData.headers?.["content-type"])) {
      return jsonData.headers?.["x-typescript-types"];
    } else {
      return undefined;
    }
  })();

  return metadata;
}

async function obtainCacheLocation() {
  // NOTE:
  // "--json" option with "deno info" was unstable before Deno v1.10
  const process = Deno.run({
    cmd: ["deno", "info", "--json", "--unstable"],
    stdout: "piped",
    stderr: "piped",
  });

  const [stderr, stdout, status] = await Promise.all([
    process.stderrOutput(),
    process.output(),
    process.status(),
  ]);

  let output;

  if (status.success) {
    output = new TextDecoder().decode(stdout);
    process.close();
  } else {
    const errorString = new TextDecoder().decode(stderr);
    console.log(errorString);
    process.close();
    Deno.exit(status.code);
  }

  const jsonData = JSON.parse(output);
  return { baseDepsPath: jsonData.modulesCache, baseGenPath: jsonData.typescriptCache };
}

async function obtainDenoInfo(url) {
  // NOTE:
  // Output with "--json" option is difficult to use
  // because the format changes significantly depending on the Deno version.
  const process = Deno.run({
    cmd: ["deno", "info", url],
    env: { NO_COLOR: "1" },
    stdout: "piped",
    stderr: "piped",
  });

  // NOTE:
  // https://github.com/denoland/deno/issues/4568
  const [stderr, stdout, status] = await Promise.all([
    process.stderrOutput(),
    process.output(),
    process.status(),
  ]);

  if (status.success) {
    const output = new TextDecoder().decode(stdout);
    process.close();
    return output;
  } else {
    const errorString = new TextDecoder().decode(stderr);
    console.log(`\n\n${errorString.trim()}`);
    displayCursor();

    process.close();
    Deno.exit(status.code);
  }
}

// OPTIMIZE:
// If the number of cached modules is large,
// execution will take noticeably longer.
async function obtainDepsData(urlList) {
  const collectedData = {};

  const regexpToFilterUrl = (() => {
    // NOTE:
    // The output format of "deno info" has been changed since Deno v1.4.0
    if (checkDenoVersion("1.4.0")) {
      return new RegExp("^\\S{3}\\shttps?://");
    } else {
      return new RegExp("^\\s{2}\\S{3}\\shttps?://");
    }
  })();

  const regexpToRemoveBeforeUrl = new RegExp("^.*?\\shttp");
  const regexpToRemoveAfterUrl = new RegExp("\\s.*$");

  let counter = 0;
  const total = urlList.length;
  displayProgress(counter, total, "modules checked");

  const semaphore = new Semaphore(5);

  await Promise.all(urlList.map(async (url) => {
    await semaphore.acquire();

    const denoInfo = await obtainDenoInfo(url);

    // WARNING:
    // If the output format of "deno info" changes in the future,
    // this function may not work as expected.
    const depsUrlList = new Set(
      denoInfo
        .split("\n")
        .filter((line) => regexpToFilterUrl.test(line))
        .map((line) => {
          return line
            .trim()
            .replace(regexpToRemoveBeforeUrl, "http")
            .replace(regexpToRemoveAfterUrl, "");
        }),
    );

    collectedData[url] = new Set(depsUrlList);

    semaphore.release();

    displayProgress(++counter, total, "modules checked");
  }));

  return collectedData;
}

function isFileExist(path) {
  try {
    return Deno.lstatSync(path).isFile;
  } catch (_e) {
    return false;
  }
}

function isDirectoryExist(path) {
  try {
    return Deno.lstatSync(path).isDirectory;
  } catch (_e) {
    return false;
  }
}

/**
 * Merge two objects.
 * @param {Object.<string, (string|Set.<string>)>} obj1
 * @param {Object.<string, (string|Set.<string>)>} obj2
 * @returns {Object.<string, Set.<string>>} Object merging obj1 and obj2
 */
function mergeObject(obj1, obj2) {
  const mergedObj = {};
  for (const obj of [obj1, obj2]) {
    for (const [key, value] of Object.entries(obj)) {
      if (mergedObj[key] === undefined) mergedObj[key] = new Set();
      if (typeof value === "string") {
        mergedObj[key].add(value);
      } else {
        value.forEach(mergedObj[key].add, mergedObj[key]);
      }
    }
  }
  return mergedObj;
}

/**
 * Switch key and value of an object.
 * @param {Object.<string, (string|Set.<string>)>} obj
 * @returns {Object.<string, Set.<string>>} Switched object
 */
function switchObjectKeyAndValue(obj) {
  const switchedObj = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      if (switchedObj[value] === undefined) switchedObj[value] = new Set();
      switchedObj[value].add(key);
    } else {
      for (const v of value) {
        if (switchedObj[v] === undefined) switchedObj[v] = new Set();
        switchedObj[v].add(key);
      }
    }
  }
  return switchedObj;
}

function buildBaseFilePath(url, hash) {
  url = new URL("", url);

  const protocolDirName = url.protocol.slice(0, -1); // delete trailing letter ":"
  const hostDirName = url.hostname + (url.port ? `_PORT${url.port}` : "");
  const pathName = url.pathname.slice(1); // delete leading letter "/"

  const depsHashedPath = [baseDepsPath, protocolDirName, hostDirName, hash].join("/");
  const genHashedPath = [baseGenPath, protocolDirName, hostDirName, hash].join("/");

  // For compiler cache files created by Deno v1.2.2 or earlier
  // https://github.com/denoland/deno/pull/6911
  const genUrlPath = [baseGenPath, protocolDirName, hostDirName, pathName].join("/");

  return { depsHashedPath, genHashedPath, genUrlPath };
}

// WARNING:
// This function does not collect compiled files
// created by Deno v1.2.2 or earlier, whose file names are not hashed.
// If it eventually becomes necessary, its implementation should be considered separately.
// https://github.com/denoland/deno/pull/6911
function collectAllHashedFilePath(type = "") {
  const baseDirList = (() => {
    switch (type) {
      case "modulesCache":
        return [`${baseDepsPath}/https`, `${baseDepsPath}/http`];
      case "typescriptCache":
        return [`${baseGenPath}/https`, `${baseGenPath}/http`];
      default:
        return [`${baseDepsPath}/https`, `${baseDepsPath}/http`, `${baseGenPath}/https`, `${baseGenPath}/http`];
    }
  })();

  const hostDirList = [];
  for (const baseDir of baseDirList) {
    if (isDirectoryExist(baseDir) === false) continue;
    for (const dirEntry of Deno.readDirSync(baseDir)) {
      if (dirEntry.isDirectory === false) continue;
      hostDirList.push(`${baseDir}/${dirEntry.name}`);
    }
  }

  const pathList = [];
  for (const hostDir of hostDirList) {
    for (const dirEntry of Deno.readDirSync(hostDir)) {
      if (dirEntry.isDirectory) continue;
      if (dirEntry.name.startsWith(".")) continue;
      pathList.push(`${hostDir}/${dirEntry.name}`);
    }
  }

  return pathList;
}

// TODO:
// Empty folders are not deleted
function deleteFile(moduleData) {
  const filePathList = moduleData.relatedFilePathList;
  const fileCount = moduleData.relatedFilePathListLength;

  if (fileCount === 0) return;

  if (displayConfirmationMessage({ name: "delete", fileCount }) === false) {
    Deno.exit();
  }

  for (const path of filePathList) {
    try {
      Deno.removeSync(path);
      console.log(`DELETED: ${path}`);
    } catch (e) {
      console.error(e);
      Deno.exit(1);
    }
  }
}

function displayCachedModuleList(moduleData, args) {
  const sortedUrlList = args.sortDate ? moduleData.sortedUrlListByDate : moduleData.sortedUrlList;
  const maxUrlLength = args.withDate ? moduleData.maxUrlStringLength : undefined;

  for (const url of sortedUrlList) {
    const urlString = (() => {
      if ((args.withPath || args.uses) && Deno.noColor === false) {
        return `\x1b[1m${url}\x1b[0m`;
      } else {
        return url;
      }
    })();

    const dateString = (() => {
      if (args.withDate) {
        const padding = " ".repeat(maxUrlLength - url.length + 2);
        return padding + (moduleData.date(url) ?? "Unknown");
      } else {
        return "";
      }
    })();

    console.log(urlString + dateString);

    if (args.withPath || args.uses) {
      const list = (() => {
        switch (true) {
          case args.withPath:
            return moduleData.relatedFilePath(url);
          case args.uses:
            return moduleData.uses(url);
        }
      })();

      for (const value of list) {
        console.log(` - ${value}`);
      }
    }
  }
}

function displayPathOfFileWithMissingURL() {
  const pathList = collectAllHashedFilePath();

  const metadataExt = ".metadata.json";

  // REVIEW:
  // I have never seen .d.ts file created in the gen/http(s) directory.
  // Is it necessary to handle the .d.ts extention?
  // https://github.com/denoland/deno/blob/v1.20.1/cli/cache.rs#L186
  const regexpToRemoveExt = new RegExp(/\.d\.ts$|\.js$|\.js\.map$|\.buildinfo$|\.meta$/);

  let fileCount = 0;

  for (const path of pathList) {
    if (path.startsWith(baseDepsPath) && path.endsWith(".metadata.json")) continue;

    const adjustedPath = path.replace(regexpToRemoveExt, "");
    const depsMetadataFilePath = adjustedPath.replace(baseGenPath, baseDepsPath) + metadataExt;

    if (isFileExist(depsMetadataFilePath)) continue;

    console.log(path);
    fileCount++;
  }

  if (fileCount === 0) {
    displayResultMessage({ name: "foundNoFile" });
  } else {
    displayResultMessage({ name: "foundFile", fileCount });
  }
}

function displayCursor(show = true) {
  // NOTE:
  // Before Deno v1.14.0, handling OS signals was unstable.
  // To ensure that the cursor is recovered when SIGINT etc. occurs,
  // cursor display control only be performed in Deno v1.14.0 or later.
  // https://github.com/denoland/deno/pull/12512
  //
  // Handling OS signals is currently not available on Windows.
  // Therefore, Windows is also excluded.
  // https://deno.land/manual@v1.20.1/examples/os_signals
  if (checkDenoVersion("1.14.0") === false) return;
  if (Deno.build.os === "windows") return;

  const showCursor = () => {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?25h"));
  };

  const hideCursor = () => {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?25l"));
  };

  // NOTE:
  // Deno (Rust) cannot catch SIGKILL
  // https://github.com/denoland/deno/blob/v1.20.1/runtime/js/40_signals.js#L12-L14
  // https://github.com/denoland/deno/blob/v1.20.1/runtime/ops/signal.rs#L183-L188
  // https://github.com/vorner/signal-hook/blob/v0.3.13/signal-hook-registry/src/lib.rs#L392
  if (show) {
    showCursor();
    Deno.removeSignalListener("SIGINT", showCursor);
    Deno.removeSignalListener("SIGTERM", showCursor);
  } else {
    hideCursor();
    Deno.addSignalListener("SIGINT", showCursor);
    Deno.addSignalListener("SIGTERM", showCursor);
  }
}

function displayProgress(current, total, suffix = "done") {
  const digits = String(total).length;
  const text = ` * ${String(current).padStart(digits, " ")} / ${total} ${suffix}`;

  if (current === 0) {
    displayCursor(false);
  }

  Deno.stdout.writeSync(new TextEncoder().encode(`${text}\r`));

  if (current >= total) {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[2K"));
    displayCursor(true);
  }
}

function displayConfirmationMessage(type) {
  const message = (() => {
    switch (type.name) {
      case "delete":
        if (type.fileCount === 1) {
          return "\nThis operation cannot be undone.\n" +
            `Are you sure you want to delete the above ${type.fileCount} file? (y/N): `;
        } else {
          return "\nThis operation cannot be undone.\n" +
            `Are you sure you want to delete the above ${type.fileCount} files? (y/N): `;
        }
      case "longTime":
        return "It may take a very long time. Are you sure you want to start the process? (y/N): ";
      default:
        return undefined;
    }
  })();

  if (message === undefined) return false;

  Deno.stdout.writeSync(new TextEncoder().encode(message));

  const buf = new Uint8Array(1024);
  const n = Deno.stdin.readSync(buf);
  const input = new TextDecoder().decode(buf.subarray(0, n)).trim();

  return input.toLowerCase() === "y";
}

function displayResultMessage(type) {
  const message = (() => {
    switch (type.name) {
      case "version":
        return `Deno module cache manager ${type.version}`;
      case "versionError":
        return `INFO: Deno version ${type.version} or later is required`;
      case "moduleNameRequired":
        return "INFO: Please specify the module name";
      case "foundNoModule":
        return "INFO: No modules are found";
      case "foundModule": {
        const moduleMessage = (() => {
          if (type.moduleCount === 1) {
            return `\nTotal: ${type.moduleCount} module is found`;
          } else {
            return `\nTotal: ${type.moduleCount} modules are found`;
          }
        })();

        if (type.fileCount === undefined) return moduleMessage;

        if (type.fileCount === 1) {
          return `${moduleMessage} (${type.fileCount} file)`;
        } else {
          return `${moduleMessage} (${type.fileCount} files)`;
        }
      }
      case "foundNoFile":
        return "INFO: No files are found";
      case "foundFile":
        if (type.fileCount === 1) {
          return `\nTotal: ${type.fileCount} file is found`;
        } else {
          return `\nTotal: ${type.fileCount} files are found`;
        }
      default:
        return undefined;
    }
  })();

  if (message) console.log(message);
}

function displayHelp() {
  const t = " ".repeat(4);
  console.log(
    `Deno module cache manager ${version}\n\n` +
      `USAGE:\n` +
      `${t}deno install --allow-run --allow-read --allow-write -n deno-module-cache-manager https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js\n` +
      `${t}deno-module-cache-manager [OPTIONS]\n\n` +
      `OPTIONS:\n` +
      `${t}-d, --delete <MODULE_URL>     ${t}Delete cached module files\n` +
      `${t}                              ${t}Perform a substring search for MODULE_URL\n` +
      `${t}                              ${t}and files related to the matched module URLs are objects of deletion\n` +
      `${t}-h, --help                    ${t}Print help information\n` +
      `${t}    --leaves                  ${t}Print cached module URLs that are not dependencies of another cached module\n` +
      `${t}    --missing-url             ${t}Print cached module file paths whose URLs are missing\n` +
      `${t}-n, --name, --url <MODULE_URL>${t}Print cached module URLs\n` +
      `${t}                              ${t}Perform a substring search for MODULE_URL\n` +
      `${t}                              ${t}and the matched module URLs are objects of printing\n` +
      `${t}    --sort-date               ${t}Print cached module URLs in order of their download date and time\n` +
      `${t}    --uses                    ${t}Print cached module URLs along with other cached modules depending on them\n` +
      `${t}-V, --version                 ${t}Print version information\n` +
      `${t}    --with-date               ${t}Print cached module URLs along with their download date and time\n` +
      `${t}    --with-path               ${t}Print cached module URLs along with paths of files related to them`,
  );
}

function checkDenoVersion(version) {
  const requiredVersion = version.split(".").map((n) => Number(n));
  const currentVersion = Deno.version.deno.split(".").map((n) => Number(n));

  for (let i = 0; i <= 2; i++) {
    if (currentVersion[i] > requiredVersion[i]) return true;
    if (currentVersion[i] < requiredVersion[i]) return false;
  }
  return true;
}

function sortOutArgs() {
  const args = {
    targetUrl: undefined,
    delete: false,
    help: false,
    leaves: false,
    missingUrl: false,
    name: false,
    sortDate: false,
    uses: false,
    version: false,
    withDate: false,
    withPath: false,
  };

  if (Deno.args.length === 0) return args;

  const availableArgs = {
    "--delete": "delete",
    "-d": "delete",
    "--help": "help",
    "-h": "help",
    "--leaves": "leaves",
    "--missing-url": "missingUrl",
    "--name": "name",
    "-n": "name",
    "--url": "name",
    "--sort-date": "sortDate",
    "--uses": "uses",
    "--version": "version",
    "-V": "version",
    "--with-date": "withDate",
    "--with-path": "withPath",
  };

  const exclusiveArgs = new Set([
    "delete",
    "help",
    "leaves",
    "missingUrl",
    "uses",
    "version",
  ]);

  let setExclusive = false;

  let key = "";
  for (const arg of Deno.args) {
    if (availableArgs[arg]) {
      key = availableArgs[arg];

      if (exclusiveArgs.has(key)) {
        if (setExclusive === false) {
          args[key] = true;
          setExclusive = true;
        } else {
          key = "";
        }
      } else {
        args[key] = true;
      }

      continue;
    }

    // Priority when multiple URLs are specified in arguments:
    // - 1. The URL specified immediately after the delete argument when executing the delete function
    // - 2. The URL specified first
    args.targetUrl = (key === "delete") ? arg : args.targetUrl ?? arg;
    key = "";
  }

  args.withPath = args.delete ? true : args.withPath;
  args.withPath = args.uses ? false : args.withPath;

  return args;
}

async function main() {
  if (checkDenoVersion(requiredMinDenoVer) === false) {
    displayResultMessage({ name: "versionError", version: requiredMinDenoVer });
    Deno.exit();
  }

  const args = sortOutArgs();

  if (args.version) {
    displayResultMessage({ name: "version", version: version });
    Deno.exit();
  }

  if (args.help) {
    displayHelp();
    Deno.exit();
  }

  if (args.missingUrl) {
    displayPathOfFileWithMissingURL();
    Deno.exit();
  }

  if ((args.name || args.delete) && args.targetUrl === undefined) {
    displayResultMessage({ name: "moduleNameRequired" });
    Deno.exit();
  }

  if (args.leaves || args.uses) {
    if (displayConfirmationMessage({ name: "longTime" }) === false) {
      Deno.exit();
    }
  }

  const moduleData = new ModuleData();
  moduleData.collectModule(baseDepsPath, args.targetUrl);

  if (args.leaves) await moduleData.extractLeavesModule();

  const moduleCount = moduleData.targetedUrlListLength;
  if (moduleCount === 0) {
    displayResultMessage({ name: "foundNoModule" });
    Deno.exit();
  }

  if (args.withPath) moduleData.collectRelatedFilePath();

  if (args.uses) await moduleData.collectUsesModule();

  displayCachedModuleList(moduleData, args);

  switch (true) {
    case args.delete:
      deleteFile(moduleData);
      break;
    default:
      displayResultMessage({
        name: "foundModule",
        moduleCount,
        fileCount: moduleData.relatedFilePathListLength,
      });
  }
}

main();
