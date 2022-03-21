// Copyright 2022 Polar Tech. All rights reserved. MIT license.

const requiredMinDenoVer = "1.2.0";
const { baseDepsPath, baseGenPath } = await obtainCacheLocation();

function collectModuleData(depsPath, targetUrl, moduleData) {
  if (depsPath.endsWith("/")) depsPath = depsPath.slice(0, -1);

  for (const dirEntry of Deno.readDirSync(depsPath)) {
    if (dirEntry.isDirectory) {
      const subDir = `${depsPath}/${dirEntry.name}`;
      moduleData = collectModuleData(subDir, targetUrl, moduleData);
    } else if (dirEntry.isFile && dirEntry.name.endsWith(".metadata.json")) {
      const url = obtainURLValueFromMetadata(`${depsPath}/${dirEntry.name}`);
      if (url.includes(targetUrl) || targetUrl === undefined) {
        moduleData[url] = { hash: dirEntry.name.replace(".metadata.json", "") };
      }
    }
  }

  return moduleData;
}

function obtainURLValueFromMetadata(metadataFilePath) {
  const text = Deno.readTextFileSync(metadataFilePath);
  const jsonData = JSON.parse(text);
  return jsonData.url;
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

function collectRelatedFilePath(moduleData) {
  for (const url of Object.keys(moduleData)) {
    const {
      depsHashedPath,
      genHashedPath,
      genUrlPath,
    } = buildBaseFilePath(url, moduleData[url].hash);

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

    moduleData[url].relatedFilePath = pathList.filter((path) => isFileExist(path));
  }

  return moduleData;
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
  const deleteFilePathList = [];
  for (const url of Object.keys(moduleData)) {
    deleteFilePathList.push(moduleData[url].relatedFilePath);
  }

  const fileCount = deleteFilePathList.flat().length;

  let message;
  if (fileCount === 0) {
    return;
  } else if (fileCount === 1) {
    message = "\nThis operation cannot be undone.\n" +
      `Are you sure you want to delete the above ${fileCount} file? (y/N): `;
  } else {
    message = "\nThis operation cannot be undone.\n" +
      `Are you sure you want to delete the above ${fileCount} files? (y/N): `;
  }

  Deno.stdout.writeSync(new TextEncoder().encode(message));

  const buf = new Uint8Array(1024);
  const n = Deno.stdin.readSync(buf);
  const input = new TextDecoder().decode(buf.subarray(0, n)).trim();

  if (input.toLowerCase() !== "y") {
    Deno.exit();
  }

  for (const path of deleteFilePathList.flat()) {
    try {
      Deno.removeSync(path);
      console.log(`DELETED: ${path}`);
    } catch (e) {
      console.error(e);
      Deno.exit(1);
    }
  }
}

function displayCachedModuleList(moduleData, withPath = false) {
  for (const url of Object.keys(moduleData).sort()) {
    if (withPath && Deno.noColor === false) {
      console.log(`\x1b[1m${url}\x1b[0m`);
    } else {
      console.log(url);
    }

    if (withPath) {
      for (const path of moduleData[url].relatedFilePath) {
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
    console.log("INFO: No files are found");
  } else if (fileCount === 1) {
    console.log(`\nTotal: ${fileCount} file is found`);
  } else {
    console.log(`\nTotal: ${fileCount} files are found`);
  }
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
  console.log(`${t}    --missing-url             ${t}Print paths of cached module files whose URLs are missing`);
  console.log(`${t}-n, --name, --url <MODULE_URL>${t}Print URLs of cached modules`);
  console.log(`${t}                              ${t}Perform a substring search for MODULE_URL`);
  console.log(`${t}                              ${t}and the matched module URLs are objects of printing`);
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
    missingUrl: false,
    name: false,
    withPath: false,
  };

  if (Deno.args.length === 0) return args;

  const availableArgs = {
    "--delete": "delete",
    "-d": "delete",
    "--help": "help",
    "-h": "help",
    "--missing-url": "missingUrl",
    "--name": "name",
    "-n": "name",
    "--url": "name",
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

function main() {
  if (checkDenoVersion(requiredMinDenoVer) === false) {
    console.log(`INFO: Deno version ${requiredMinDenoVer} or later is required`);
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
    console.log("INFO: Please specify the module name");
    Deno.exit();
  }

  let moduleData = {};
  moduleData = collectModuleData(baseDepsPath, args.targetUrl, moduleData);

  const moduleCount = Object.keys(moduleData).length;
  if (moduleCount === 0) {
    console.log("INFO: No modules are found");
    Deno.exit();
  }

  if (args.withPath) {
    moduleData = collectRelatedFilePath(moduleData);
  }

  displayCachedModuleList(moduleData, args.withPath);

  switch (true) {
    case args.delete:
      deleteFile(moduleData);
      break;
    default:
      if (moduleCount === 1) {
        console.log(`\nTotal: ${moduleCount} module is found`);
      } else {
        console.log(`\nTotal: ${moduleCount} modules are found`);
      }
  }
}

main();
