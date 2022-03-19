// Deno version: v1.2.0 or later

// Permission:
// --allow-run and --allow-read permissions are required

const requiredMinDenoVer = "1.2.0";
const { baseDepsPath, baseGenPath } = await obtainCacheLocation();

function collectURLAndHashData(depsPath, targetUrl, urlAndHashData) {
  if (depsPath.endsWith("/")) depsPath = depsPath.slice(0, -1);

  for (const dirEntry of Deno.readDirSync(depsPath)) {
    if (dirEntry.isDirectory) {
      const subDir = `${depsPath}/${dirEntry.name}`;
      urlAndHashData = collectURLAndHashData(subDir, targetUrl, urlAndHashData);
    } else if (dirEntry.isFile && dirEntry.name.endsWith(".metadata.json")) {
      const url = obtainURLValueFromMetadata(`${depsPath}/${dirEntry.name}`);
      if (url.includes(targetUrl) || targetUrl === undefined) {
        urlAndHashData[url] = dirEntry.name.replace(".metadata.json", "");
      }
    }
  }

  return urlAndHashData;
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

function collectRelatedFilePath(url, hash) {
  const {
    depsHashedPath,
    genHashedPath,
    genUrlPath,
  } = buildBaseFilePath(url, hash);

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

  return pathList.filter((path) => isFileExist(path));
}

function displayCachedModuleList(urlAndHashData, withPath = false) {
  for (const url of Object.keys(urlAndHashData).sort()) {
    if (withPath && Deno.noColor === false) {
      console.log(`\x1b[1m${url}\x1b[0m`);
    } else {
      console.log(url);
    }

    if (withPath) {
      displayRelatedFilePathList(url, urlAndHashData[url]);
    }
  }
}

function displayRelatedFilePathList(url, hash) {
  for (const path of collectRelatedFilePath(url, hash)) {
    console.log(` - ${path}`);
  }
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

function main() {
  if (checkDenoVersion(requiredMinDenoVer) === false) {
    console.log(`INFO: Deno version ${requiredMinDenoVer} or later is required`);
    Deno.exit();
  }

  const targetUrl = (() => {
    let nameIndex;
    if (Deno.args.includes("--name")) {
      nameIndex = Deno.args.indexOf("--name") + 1;
    } else {
      return undefined;
    }

    if (Deno.args.length > nameIndex) {
      return Deno.args[nameIndex];
    } else {
      console.log("INFO: Please specify the module name");
      Deno.exit();
    }
  })();

  let urlAndHashData = {};
  urlAndHashData = collectURLAndHashData(baseDepsPath, targetUrl, urlAndHashData);

  const moduleCount = Object.keys(urlAndHashData).length;
  if (moduleCount === 0) {
    console.log("INFO: No modules are found");
    Deno.exit();
  }

  displayCachedModuleList(urlAndHashData, Deno.args.includes("--with-path"));

  if (moduleCount === 1) {
    console.log(`\nTotal: ${moduleCount} module is found`);
  } else {
    console.log(`\nTotal: ${moduleCount} modules are found`);
  }
}

main();
