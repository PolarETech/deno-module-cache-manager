// Copyright 2022 Polar Tech. All rights reserved. MIT license.

const version = "0.2.3";
const requiredMinDenoVer = "1.2.0";
const { baseDepsPath, baseGenPath } = await obtainCacheLocation();

let quietMode = false;
let verboseMode = false;

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

  collectModule(depsPath, target) {
    if (depsPath.endsWith("/")) depsPath = depsPath.slice(0, -1);
    if (isDirectoryExist(depsPath) === false) return;

    for (const dirEntry of Deno.readDirSync(depsPath)) {
      if (dirEntry.isDirectory) {
        const subDir = `${depsPath}/${dirEntry.name}`;
        this.collectModule(subDir, target);
        continue;
      }

      if (dirEntry.isFile && dirEntry.name.endsWith(".metadata.json")) {
        const metadata = obtainValueFromMetadata(`${depsPath}/${dirEntry.name}`);
        const url = metadata.url;
        if (url === undefined) continue;

        this.data[url] = {
          hash: dirEntry.name.replace(".metadata.json", ""),
          target: url.includes(target.url) || target.url === undefined,
          date: metadata.date,
          types: metadata.types,
        };

        if (this.data[url].target === false) continue;
        if (target.newer === undefined && target.older === undefined) continue;

        if (this.data[url].date === undefined) {
          this.data[url].target = false;
          continue;
        }
        if (target.newer && this.data[url].date < target.newer) {
          this.data[url].target = false;
          continue;
        }
        if (target.older && this.data[url].date > target.older) {
          this.data[url].target = false;
          continue;
        }
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
 * Convert string representing date and time to ISO format date string.
 * If the given string cannot be converted to Date object, return undefined.
 * @param {string} dateString
 * @returns {(string|undefined)} ISO format date string or undefined
 */
function formatDateString(dateString) {
  // Two values, year and monthIndex, are required
  const validInput = /^\d{1,4}[-/]\d{1,2}(([-/]\d{1,2})?|[-/]\d{1,2}[T ]\d{1,2}((:\d{1,2}){0,2}|(:\d{1,2}){2}\.\d{1,3}))\D*$/;
  if (validInput.test(dateString) === false) return undefined;

  const re = /\d+/g;
  const dateArray = dateString
    .match(re)
    .map((v) => Number.parseInt(v, 10));

  dateArray[1] -= 1; // adjust for monthIndex

  const dateObject = new Date(Date.UTC(...dateArray));
  return dateObject.toISOString();
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

function collectPathOfFileWithMissingURL() {
  const pathList = collectAllHashedFilePath();

  const metadataExt = ".metadata.json";

  // REVIEW:
  // I have never seen .d.ts file created in the gen/http(s) directory.
  // Is it necessary to handle the .d.ts extention?
  // https://github.com/denoland/deno/blob/v1.20.1/cli/cache.rs#L186
  const regexpToRemoveExt = new RegExp(/\.d\.ts$|\.js$|\.js\.map$|\.buildinfo$|\.meta$/);

  const pathListWithMissingURL = [];
  for (const path of pathList) {
    if (path.startsWith(baseDepsPath) && path.endsWith(".metadata.json")) continue;

    const adjustedPath = path.replace(regexpToRemoveExt, "");
    const depsMetadataFilePath = adjustedPath.replace(baseGenPath, baseDepsPath) + metadataExt;

    if (isFileExist(depsMetadataFilePath)) continue;
    pathListWithMissingURL.push(path);
  }

  return pathListWithMissingURL;
}

// TODO:
// Empty folders are not deleted
function deleteFile(moduleData) {
  const filePathList = moduleData.relatedFilePathList;

  for (const path of filePathList) {
    try {
      Deno.removeSync(path);
      displayResultMessage({ name: "deleteFile", filePath: path });
    } catch (e) {
      console.error(e);
      Deno.exit(1);
    }
  }
}

function displayCachedModuleList(moduleData, optionFlags) {
  const sortedUrlList = optionFlags.sortDate ? moduleData.sortedUrlListByDate : moduleData.sortedUrlList;
  const maxUrlLength = optionFlags.withDate ? moduleData.maxUrlStringLength : undefined;

  for (const url of sortedUrlList) {
    const urlString = (() => {
      if ((optionFlags.withPath || optionFlags.uses) && Deno.noColor === false) {
        return `\x1b[1m${url}\x1b[0m`;
      } else {
        return url;
      }
    })();

    const dateString = (() => {
      if (optionFlags.withDate) {
        const padding = " ".repeat(maxUrlLength - url.length + 2);
        return padding + (moduleData.date(url) ?? "Unknown");
      } else {
        return "";
      }
    })();

    console.log(urlString + dateString);

    if (optionFlags.withPath || optionFlags.uses) {
      const list = (() => {
        switch (true) {
          case optionFlags.withPath:
            return moduleData.relatedFilePath(url);
          case optionFlags.uses:
            return moduleData.uses(url);
        }
      })();

      for (const value of list) {
        console.log(` - ${value}`);
      }
    }
  }
}

function displayCursor(show = true) {
  // NOTE:
  // Before Deno v1.19.0, handling OS signals was unstable.
  // To ensure that the cursor is recovered when SIGINT etc. occurs,
  // cursor display control only be performed in Deno v1.19.0 or later.
  // https://github.com/denoland/deno/pull/13438
  //
  // Handling OS signals is currently not available on Windows.
  // Therefore, Windows is also excluded.
  // https://deno.land/manual@v1.20.1/examples/os_signals
  if (checkDenoVersion("1.19.0") === false) return;
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
  if (quietMode) return;

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

function displayConfirmationMessage(type, skip = false) {
  if (skip) return true;

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
  if (quietMode) return;

  const message = (() => {
    switch (type.name) {
      case "version":
        return `Deno module cache manager ${type.version}`;
      case "versionError":
        return `INFO: Deno version ${type.version} or later is required`;
      case "invalidDate":
        return "INFO: The specified date is invalid";
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
      case "deleteFile":
        return `DELETED: ${type.filePath}`;
      default:
        return undefined;
    }
  })();

  if (message) console.log(message);
}

function displaySearchCriteria(option, target) {
  if (verboseMode === false) return;

  let message = "";

  if (option.missingUrl) {
    message += ` - Search with option "--missing-url"\n`;
  }
  if (option.leaves) {
    message += ` - Search with option "--leaves"\n`;
  }
  if (option.uses) {
    message += ` - Search with option "--uses"\n`;
  }

  if (target.url) {
    message += ` - Module URL contains "${target.url}"\n`;
  }
  if (target.newer) {
    message += ` - Download date is equal to or newer than "${target.newer}"\n`;
  }
  if (target.older) {
    message += ` - Download date is equal to or older than "${target.older}"\n`;
  }

  if (message === "") {
    message = " - All cached modules\n";
  }

  message = `Search criteria:\n${message}`;

  Deno.stdout.writeSync(new TextEncoder().encode(message));
}

function displaySearchLocation() {
  if (verboseMode === false) return;
  console.log(`Search locations:\n - ${baseDepsPath}\n - ${baseGenPath}`);
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
      `${t}    --newer <DATE_STRING>     ${t}Print cached module URLs whose download date and time is\n` +
      `${t}                              ${t}equal to or newer than <DATE_STRING>\n` +
      `${t}                              ${t}The format of <DATE_STRING> is like yyyy-MM-dd, yyyy-MM-ddTHH:mm:ss, etc.\n` +
      `${t}    --older <DATE_STRING>     ${t}Print cached module URLs whose download date and time is\n` +
      `${t}                              ${t}equal to or older than <DATE_STRING>\n` +
      `${t}                              ${t}The format of <DATE_STRING> is like yyyy-MM-dd, yyyy-MM-ddTHH:mm:ss, etc.\n` +
      `${t}-q, --quiet                   ${t}Suppress result output\n` +
      `${t}    --sort-date               ${t}Print cached module URLs in order of their download date and time\n` +
      `${t}    --uses                    ${t}Print cached module URLs along with other cached modules depending on them\n` +
      `${t}-v, --verbose                 ${t}Print additional information in result output\n` +
      `${t}-V, --version                 ${t}Print version information\n` +
      `${t}    --with-date               ${t}Print cached module URLs along with their download date and time\n` +
      `${t}    --with-path               ${t}Print cached module URLs along with paths of files related to them\n` +
      `${t}-y, --yes                     ${t}Automatically answer yes for confirmation`,
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

function sortOutArgs(args) {
  const flags = {
    delete: false,
    help: false,
    leaves: false,
    missingUrl: false,
    name: false,
    newer: false,
    older: false,
    quiet: false,
    skipConfirmation: false,
    sortDate: false,
    uses: false,
    verbose: false,
    version: false,
    withDate: false,
    withPath: false,
  };

  const target = {
    url: undefined,
    newer: undefined,
    older: undefined,
  };

  const invalidArgs = {
    url: false,
    date: false,
  };

  if (args.length === 0) {
    return { optionFlags: flags, target, invalidArgs };
  }

  const availableFlags = {
    "--delete": "delete",
    "-d": "delete",
    "--help": "help",
    "-h": "help",
    "--leaves": "leaves",
    "--missing-url": "missingUrl",
    "--name": "name",
    "-n": "name",
    "--url": "name",
    "--newer": "newer",
    "--older": "older",
    "--quiet": "quiet",
    "-q": "quiet",
    "--sort-date": "sortDate",
    "--uses": "uses",
    "--verbose": "verbose",
    "-v": "verbose",
    "--version": "version",
    "-V": "version",
    "--with-date": "withDate",
    "--with-path": "withPath",
    "--yes": "skipConfirmation",
    "-y": "skipConfirmation",
  };

  const exclusiveFlags = new Set([
    "delete",
    "help",
    "leaves",
    "missingUrl",
    "uses",
    "version",
  ]);

  let setExclusive = false;

  let key = "";
  for (const arg of args) {
    if (availableFlags[arg]) {
      key = availableFlags[arg];

      if (exclusiveFlags.has(key)) {
        if (setExclusive === false) {
          flags[key] = true;
          setExclusive = true;
        } else {
          key = "";
        }
      } else {
        flags[key] = true;
      }

      continue;
    }

    // Priority when multiple URLs are specified in arguments:
    // - 1. The URL specified immediately after the delete argument when executing the delete function
    // - 2. The URL specified first
    switch (key) {
      case "newer": {
        target.newer = formatDateString(arg);
        break;
      }
      case "older": {
        target.older = formatDateString(arg);
        break;
      }
      case "delete":
        target.url = arg;
        break;
      default:
        target.url = target.url ?? arg;
    }

    key = "";
  }

  flags.withPath = flags.delete ? true : flags.withPath;
  flags.withPath = flags.uses ? false : flags.withPath;

  flags.verbose = flags.quiet ? false : flags.verbose; // Priority: quiet > verbose

  invalidArgs.url = (flags.name || flags.delete) && target.url === undefined;
  invalidArgs.date = (flags.newer && target.newer === undefined) ||
    (flags.older && target.older === undefined);

  return { optionFlags: flags, target, invalidArgs };
}

async function main() {
  if (checkDenoVersion(requiredMinDenoVer) === false) {
    displayResultMessage({ name: "versionError", version: requiredMinDenoVer });
    Deno.exit();
  }

  const { optionFlags, target, invalidArgs } = sortOutArgs(Deno.args);

  if (optionFlags.version) {
    displayResultMessage({ name: "version", version: version });
    Deno.exit();
  }

  if (optionFlags.help) {
    displayHelp();
    Deno.exit();
  }

  quietMode = optionFlags.quiet;
  verboseMode = optionFlags.verbose;

  // Output file list and results for missing url option
  if (optionFlags.missingUrl) {
    const filePathList = collectPathOfFileWithMissingURL();
    const fileCount = filePathList.length;

    if (fileCount === 0) {
      displayResultMessage({ name: "foundNoFile" });
    } else {
      filePathList.forEach((path) => console.log(path));
      displayResultMessage({ name: "foundFile", fileCount });
    }

    displaySearchCriteria(optionFlags, {});
    displaySearchLocation();
    Deno.exit();
  }

  // Output invalid argument error
  if (invalidArgs.url || invalidArgs.date) {
    if (invalidArgs.url) displayResultMessage({ name: "moduleNameRequired" });
    if (invalidArgs.date) displayResultMessage({ name: "invalidDate" });
    Deno.exit();
  }

  // Confirmation for leaves and uses options
  if (optionFlags.leaves || optionFlags.uses) {
    displayConfirmationMessage(
      { name: "longTime" },
      optionFlags.skipConfirmation,
    ) ||
      Deno.exit();
  }

  // Collect basic information on cached modules
  const moduleData = new ModuleData();
  moduleData.collectModule(baseDepsPath, target);

  if (optionFlags.leaves) await moduleData.extractLeavesModule();

  const moduleCount = moduleData.targetedUrlListLength;

  // Output no module error
  if (moduleCount === 0) {
    displayResultMessage({ name: "foundNoModule" });
    displaySearchCriteria(optionFlags, target);
    displaySearchLocation();
    Deno.exit();
  }

  // Collect additional information on cached modules
  if (optionFlags.withPath) moduleData.collectRelatedFilePath();
  if (optionFlags.uses) await moduleData.collectUsesModule();

  // Process for delete option
  if (optionFlags.delete) {
    optionFlags.skipConfirmation ||
      displayCachedModuleList(moduleData, optionFlags);

    displayConfirmationMessage({
      name: "delete",
      fileCount: moduleData.relatedFilePathListLength,
    }, optionFlags.skipConfirmation) &&
      deleteFile(moduleData);

    Deno.exit();
  }

  // Output module list and results for name, leaves, and uses options
  displayCachedModuleList(moduleData, optionFlags);
  displayResultMessage({
    name: "foundModule",
    moduleCount,
    fileCount: moduleData.relatedFilePathListLength,
  });
  displaySearchCriteria(optionFlags, target);
  displaySearchLocation();
}

main();
