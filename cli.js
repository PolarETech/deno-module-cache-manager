// Copyright 2022 Polar Tech. All rights reserved. MIT license.

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
      .map((v) => {
        this.data[v].url = v;
        return this.data[v];
      })
      .sort((v1, v2) => (v1.date ?? "0") > (v2.date ?? "0") ? -1 : 1)
      .map((v) => v.url);
  }

  get targetedUrlListLength() {
    return this.targetedUrlList.length;
  }

  get maxUrlStringLength() {
    return this.targetedUrlList
      .map((v) => v.length)
      .reduce((v1, v2) => Math.max(v1, v2));
  }

  get deleteFilePathList() {
    return this.targetedUrlList
      .map((v) => this.data[v].relatedFilePath)
      .flat();
  }

  date(url) {
    return this.data[url].date;
  }

  relatedFilePath(url) {
    return this.data[url].relatedFilePath;
  }

  collectModule(depsPath, targetUrl) {
    if (depsPath.endsWith("/")) depsPath = depsPath.slice(0, -1);

    for (const dirEntry of Deno.readDirSync(depsPath)) {
      if (dirEntry.isDirectory) {
        const subDir = `${depsPath}/${dirEntry.name}`;
        this.collectModule(subDir, targetUrl);
        continue;
      }

      if (dirEntry.isFile && dirEntry.name.endsWith(".metadata.json")) {
        const url = obtainValueFromMetadata("url", `${depsPath}/${dirEntry.name}`);
        if (url === undefined) continue;

        this.data[url] = {
          hash: dirEntry.name.replace(".metadata.json", ""),
          target: url.includes(targetUrl) || targetUrl === undefined,
        };
      }
    }
  }

  collectRelatedFilePath() {
    for (const url of this.targetedUrlList) {
      const {
        depsHashedPath,
        genHashedPath,
        genUrlPath,
      } = buildBaseFilePath(url, this.data[url].hash);

      const extentionsInDeps = ["", ".metadata.json"];

      // REVIEW:
      // I have never seen .d.ts file created in the gen/http(s) directory.
      // Is it necessary to handle the .d.ts extention?
      // https://github.com/denoland/deno/blob/v1.20.1/cli/cache.rs#L186
      const extentionsInGen = [".d.ts", ".js", ".js.map", ".buildinfo", ".meta"];

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

  collectModuleDownloadDate() {
    for (const url of this.targetedUrlList) {
      const { depsHashedPath } = buildBaseFilePath(url, this.data[url].hash);
      this.data[url].date = obtainValueFromMetadata("date", `${depsHashedPath}.metadata.json`);
    }
  }

  async extractLeavesModule() {
    const depsModuleUrl = await collectAllDepsModuleURL(this.allUrlList);

    for (const url of this.targetedUrlList) {
      if (depsModuleUrl.has(url) === false) continue;
      this.data[url].target = false;
    }
  }
}

function obtainValueFromMetadata(type, metadataFilePath) {
  try {
    const text = Deno.readTextFileSync(metadataFilePath);
    const jsonData = JSON.parse(text);

    switch (type) {
      case "url":
        return jsonData.url;
      case "date":
        // NOTE:
        // SystemTime is not stored in metadata created by Deno v1.16.4 or earlier
        // https://github.com/denoland/deno/pull/13010
        if (jsonData.now && jsonData.now["secs_since_epoch"]) {
          return new Date(jsonData.now["secs_since_epoch"] * 1000).toISOString();
        }
        if (jsonData.headers && jsonData.headers.date) {
          return new Date(jsonData.headers.date).toISOString();
        }
        return undefined;
      default:
        return undefined;
    }
  } catch (_e) {
    return undefined;
  }
}

async function obtainCacheLocation() {
  // NOTE:
  // "--json" option with "deno info" was unstable before Deno v1.10
  const process = Deno.run({
    cmd: ["deno", "info", "--json", "--unstable"],
    stdout: "piped",
  });

  const jsonData = JSON.parse(new TextDecoder().decode(await process.output()));

  process.close();

  return { baseDepsPath: jsonData.modulesCache, baseGenPath: jsonData.typescriptCache };
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

function buildBaseFilePath(url, hash) {
  url = new URL("", url);

  const protocolDirName = url.protocol.slice(0, -1); // delete trailing letter ":"
  const hostDirName = `${url.hostname}${url.port ? `_PORT${url.port}` : ""}`;
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

// OPTIMIZE:
// If the number of cached modules is large,
// execution will take noticeably longer.
async function collectAllDepsModuleURL(allUrlList) {
  const depsModuleUrl = new Set();

  const regexpToFilterUrl = new RegExp("\\shttps?://");
  const regexpToRemoveBeforeUrl = new RegExp("^.*?\\shttp");
  const regexpToRemoveAfterUrl = new RegExp("\\s.*$");

  let counter = 0;
  const total = allUrlList.length;
  displayProgress(counter, total, "modules checked");

  for (const url of allUrlList) {
    // WARNING:
    // If the output format of "deno info" changes in the future,
    // this function may not work as expected.

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
      const output = new TextDecoder()
        .decode(stdout)
        .split("\n")
        .filter((line) => regexpToFilterUrl.test(line))
        .map((line) => {
          return line
            .trim()
            .replace(regexpToRemoveBeforeUrl, "http")
            .replace(regexpToRemoveAfterUrl, "");
        });

      process.close();

      for (const url of output) {
        depsModuleUrl.add(url);
      }

      displayProgress(++counter, total, "modules checked");
    } else {
      const errorString = new TextDecoder().decode(stderr);
      console.log(errorString);
      displayCursor();

      process.close();
      Deno.exit(status.code);
    }
  }

  return depsModuleUrl;
}

// TODO:
// Empty folders are not deleted
function deleteFile(moduleData) {
  const deleteFilePathList = moduleData.deleteFilePathList;
  const fileCount = deleteFilePathList.length;

  if (fileCount === 0) return;

  if (displayConfirmationMessage({ name: "delete", fileCount }) === false) {
    Deno.exit();
  }

  for (const path of deleteFilePathList) {
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
    if (args.withPath && Deno.noColor === false) {
      Deno.stdout.writeSync(new TextEncoder().encode(`\x1b[1m${url}\x1b[0m`));
    } else {
      Deno.stdout.writeSync(new TextEncoder().encode(url));
    }

    if (args.withDate) {
      const prefix = " ".repeat(maxUrlLength - url.length + 2);
      const dateString = moduleData.date(url) ?? "Unknown";
      Deno.stdout.writeSync(new TextEncoder().encode(`${prefix}${dateString}\n`));
    } else {
      Deno.stdout.writeSync(new TextEncoder().encode("\n"));
    }

    if (args.withPath) {
      for (const path of moduleData.relatedFilePath(url)) {
        console.log(` - ${path}`);
      }
    }
  }
}

function displayPathOfFileWithMissingURL() {
  const pathList = collectAllHashedFilePath();

  let fileCount = 0;

  for (const path of pathList) {
    if (path.startsWith(baseDepsPath) && path.endsWith(".metadata.json")) continue;

    const adjustedPath = path.replace(/\.d\.ts$|\.js$|\.js\.map$|\.buildinfo$|\.meta$/, "");
    const depsMetadataFilePath = `${adjustedPath.replace(baseGenPath, baseDepsPath)}.metadata.json`;

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

  Deno.stdout.writeSync(new TextEncoder().encode(text));

  if (current < total) {
    Deno.stdout.writeSync(new TextEncoder().encode("\r"));
  } else {
    Deno.stdout.writeSync(new TextEncoder().encode("\r\x1b[2K"));
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
      case "leaves":
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
      case "versionError":
        return `INFO: Deno version ${type.version} or later is required`;
      case "moduleNameRequired":
        return "INFO: Please specify the module name";
      case "foundNoModule":
        return "INFO: No modules are found";
      case "foundModule":
        if (type.moduleCount === 1) {
          return `\nTotal: ${type.moduleCount} module is found`;
        } else {
          return `\nTotal: ${type.moduleCount} modules are found`;
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
  console.log("Deno module cache manager\n");
  console.log("USAGE:");
  console.log(`${t}deno install --allow-run --allow-read --allow-write -n deno-module-cache-manager <url-or-path-to-cli.js>`);
  console.log(`${t}deno-module-cache-manager [OPTIONS]\n`);
  console.log("OPTIONS:");
  console.log(`${t}-d, --delete <MODULE_URL>     ${t}Delete cached module files`);
  console.log(`${t}                              ${t}Perform a substring search for MODULE_URL`);
  console.log(`${t}                              ${t}and files related to the matched module URLs are objects of deletion`);
  console.log(`${t}-h, --help                    ${t}Print help information`);
  console.log(`${t}    --leaves                  ${t}Print URLs of cached modules that are not dependencies of another cached modules`);
  console.log(`${t}    --missing-url             ${t}Print paths of cached module files whose URLs are missing`);
  console.log(`${t}-n, --name, --url <MODULE_URL>${t}Print URLs of cached modules`);
  console.log(`${t}                              ${t}Perform a substring search for MODULE_URL`);
  console.log(`${t}                              ${t}and the matched module URLs are objects of printing`);
  console.log(`${t}    --sort-date               ${t}Print URLs of cached modules in order of their download date and time`);
  console.log(`${t}    --with-date               ${t}Print URLs of cached modules along with their download date and time`);
  console.log(`${t}    --with-path               ${t}Print URLs of cached modules along with paths of files related to them`);
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
    "--with-date": "withDate",
    "--with-path": "withPath",
  };

  const argsWithFileName = ["delete", "name"];

  const tempTargetUrl = {
    delete: undefined,
    name: undefined,
  };

  let key = "";
  for (const arg of Deno.args) {
    if (Object.keys(availableArgs).includes(arg)) {
      key = availableArgs[arg];
      args[key] = true;
      continue;
    }

    if (argsWithFileName.includes(key) === false) {
      key = "name";
    }

    // Give priority to the url specified first
    // NOTE:
    // ??= operator does not work properly on "deno run" before Deno v1.6.2
    // https://github.com/denoland/deno/issues/8627
    tempTargetUrl[key] = tempTargetUrl[key] ?? arg;
  }

  // Give priority to the url specified by the delete argument
  args.targetUrl = tempTargetUrl.delete ?? tempTargetUrl.name;

  args.withPath = args.delete ? true : args.withPath;

  return args;
}

async function main() {
  if (checkDenoVersion(requiredMinDenoVer) === false) {
    displayResultMessage({ name: "versionError", version: requiredMinDenoVer });
    Deno.exit();
  }

  const args = sortOutArgs();

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

  const moduleData = new ModuleData();
  moduleData.collectModule(baseDepsPath, args.targetUrl);

  if (args.leaves) {
    if (displayConfirmationMessage({ name: "leaves" }) === false) {
      Deno.exit();
    }
    await moduleData.extractLeavesModule();
  }

  const moduleCount = moduleData.targetedUrlListLength;
  if (moduleCount === 0) {
    displayResultMessage({ name: "foundNoModule" });
    Deno.exit();
  }

  if (args.withPath) {
    moduleData.collectRelatedFilePath();
  }

  if (args.withDate || args.sortDate) {
    moduleData.collectModuleDownloadDate();
  }

  displayCachedModuleList(moduleData, args);

  switch (true) {
    case args.delete:
      deleteFile(moduleData);
      break;
    default:
      displayResultMessage({ name: "foundModule", moduleCount });
  }
}

main();
