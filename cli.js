// Copyright 2022 Polar Tech. All rights reserved. MIT license.

// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

const SCRIPT_VERSION = "0.4.1";
const MIN_DENO_VERSION = "1.2.0";
function checkDenoVersion(version) {
    const requiredVersion = version.split(".").map((n)=>Number(n));
    const currentVersion = Deno.version.deno.split(".").map((n)=>Number(n));
    for(let i = 0; i <= 2; i++){
        if (currentVersion[i] > requiredVersion[i]) return true;
        if (currentVersion[i] < requiredVersion[i]) return false;
    }
    return true;
}
class DenoInfo {
    static execPath = Deno.execPath();
    static async obtainCacheLocation() {
        const process = Deno.run({
            cmd: [
                this.execPath,
                "info",
                "--json",
                "--unstable"
            ],
            stdout: "piped",
            stderr: "piped"
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
            console.error(errorString);
            process.close();
            Deno.exit(status.code);
        }
        const jsonData = JSON.parse(output);
        const baseDepsPath = jsonData.modulesCache;
        const baseGenPath = jsonData.typescriptCache;
        return {
            baseDepsPath,
            baseGenPath
        };
    }
    static async obtainModuleInfo(url, errorCallback) {
        const process = Deno.run({
            cmd: [
                this.execPath,
                "info",
                "--unstable",
                url
            ],
            env: {
                NO_COLOR: "1"
            },
            stdout: "piped",
            stderr: "piped"
        });
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
            console.error(`\n\n${errorString.trim()}`);
            errorCallback && errorCallback();
            process.close();
            Deno.exit(status.code);
        }
    }
}
class CacheLocation {
    baseDepsPath = "";
    baseGenPath = "";
    async storeCacheLocation() {
        const denoInfo = await DenoInfo.obtainCacheLocation();
        this.baseDepsPath = denoInfo.baseDepsPath;
        this.baseGenPath = denoInfo.baseGenPath;
    }
}
const location = new CacheLocation();
Object.seal(location);
function buildBaseFilePath(url, hash) {
    const parsedUrl = new URL(url);
    const protocolDirName = parsedUrl.protocol.slice(0, -1);
    const portString = parsedUrl.port ? `_PORT${parsedUrl.port}` : "";
    const hostDirName = parsedUrl.hostname + portString;
    const pathName = parsedUrl.pathname.slice(1);
    const depsHashedPath = [
        location.baseDepsPath,
        protocolDirName,
        hostDirName,
        hash
    ].join("/");
    const genHashedPath = [
        location.baseGenPath,
        protocolDirName,
        hostDirName,
        hash
    ].join("/");
    const genUrlPath = [
        location.baseGenPath,
        protocolDirName,
        hostDirName,
        pathName
    ].join("/");
    return {
        depsHashedPath,
        genHashedPath,
        genUrlPath
    };
}
class Semaphore {
    counter;
    queue;
    constructor(maxConcurrent = 1){
        this.counter = maxConcurrent;
        this.queue = [];
    }
    try() {
        if (this.counter === 0) return;
        if (this.queue.length === 0) return;
        this.counter--;
        const resolve = this.queue.shift();
        resolve && resolve();
    }
    acquire() {
        if (this.counter > 0) {
            this.counter--;
            return new Promise((resolve)=>resolve());
        }
        return new Promise((resolve)=>{
            this.queue.push(resolve);
        });
    }
    release() {
        this.counter++;
        this.try();
    }
}
function obtainValueFromMetadata(metadataFilePath) {
    const jsonData = (()=>{
        try {
            const text = Deno.readTextFileSync(metadataFilePath);
            return JSON.parse(text);
        } catch (_e) {
            return undefined;
        }
    })();
    if (jsonData === undefined) return {};
    const url = jsonData.url;
    const date = (()=>{
        try {
            return new Date(jsonData.now.secs_since_epoch * 1000).toISOString();
        } catch (_e) {}
        try {
            return new Date(jsonData.headers.date).toISOString();
        } catch (_e1) {
            return undefined;
        }
    })();
    const location = (()=>{
        if (jsonData.headers?.location === undefined) return undefined;
        try {
            return new URL(jsonData.headers.location, url).href;
        } catch (_e) {
            return undefined;
        }
    })();
    const types = (()=>{
        if (jsonData.headers?.["x-typescript-types"] === undefined) return undefined;
        try {
            return new URL(jsonData.headers["x-typescript-types"], url).href;
        } catch (_e) {
            return undefined;
        }
    })();
    return {
        url,
        date,
        location,
        types
    };
}
async function fetchJsonFile(url, timeout = 45000) {
    const res = await (async ()=>{
        let timer = 0;
        try {
            if (checkDenoVersion("1.11.0") === false) return await fetch(url);
            const controller = new AbortController();
            timer = setTimeout(()=>controller.abort(), timeout);
            return await fetch(url, {
                signal: controller.signal
            });
        } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") {
                const error = new Error("Fetch request has timed out");
                error.name = "TimeoutError";
                throw error;
            }
            throw e;
        } finally{
            timer && clearTimeout(timer);
        }
    })();
    if (res.ok) {
        try {
            return await res.json();
        } catch (_e) {
            const error = new Error("The specified resource is not a valid JSON file");
            error.name = "TypeError";
            throw error;
        }
    }
    res.body?.cancel();
    throw new Error("Failed to fetch\n" + `Response Status: ${res.status} ${res.statusText}`);
}
function readJsonFile(path) {
    const text = Deno.readTextFileSync(path);
    try {
        return JSON.parse(text);
    } catch (_e) {
        const error = new Error("The specified resource is not a valid JSON file");
        error.name = "TypeError";
        throw error;
    }
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
function isValidUrl(url) {
    const re = /^(?:blob:|data:|[A-Za-z][A-Za-z0-9.+-]*:\/\/)/;
    if (re.test(url) === false) return false;
    try {
        new URL(url);
        return true;
    } catch (_e) {
        return false;
    }
}
function formatDateString(dateString) {
    const regexpToVerifyDateString = /^\d{1,4}[-/]\d{1,2}(([-/]\d{1,2})?|[-/]\d{1,2}[T ]\d{1,2}((:\d{1,2}){0,2}|(:\d{1,2}){2}\.\d{1,3}))\D*$/;
    if (regexpToVerifyDateString.test(dateString) === false) return undefined;
    const re = /\d+/g;
    const dateArray = dateString.match(re).map((v)=>Number.parseInt(v, 10));
    dateArray[1] -= 1;
    const dateObject = new Date(Date.UTC(...dateArray));
    return dateObject.toISOString();
}
function mergeObject(...objArray) {
    const mergedObj = {};
    for (const obj of objArray){
        for (const [key, value] of Object.entries(obj)){
            mergedObj[key] ?? (mergedObj[key] = new Set());
            if (typeof value === "string") {
                mergedObj[key].add(value);
            } else {
                value.forEach(Set.prototype.add, mergedObj[key]);
            }
        }
    }
    return mergedObj;
}
function switchObjectKeyAndValue(obj) {
    const switchedObj = {};
    for (const [key, value] of Object.entries(obj)){
        for (const v of value){
            switchedObj[v] ?? (switchedObj[v] = new Set());
            switchedObj[v].add(key);
        }
    }
    return switchedObj;
}
function sortOutArgs(args) {
    const flags = {
        delete: false,
        help: false,
        importMap: false,
        leaves: false,
        missingUrl: false,
        newer: false,
        older: false,
        quiet: false,
        skipConfirmation: false,
        sortDate: false,
        url: false,
        uses: false,
        verbose: false,
        version: false,
        withDate: false,
        withPath: false
    };
    const target = {
        url: undefined,
        newer: undefined,
        older: undefined,
        importMap: undefined
    };
    const invalidArgs = {
        noUrl: false,
        noNewer: false,
        noOlder: false,
        invalidNewer: false,
        invalidOlder: false
    };
    if (args.length === 0) {
        return {
            optionFlags: flags,
            target,
            invalidArgs
        };
    }
    const flagKeyTable = {
        "--delete": "delete",
        "-d": "delete",
        "--help": "help",
        "-h": "help",
        "--import-map": "importMap",
        "--leaves": "leaves",
        "--missing-url": "missingUrl",
        "--name": "url",
        "-n": "url",
        "--url": "url",
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
        "-y": "skipConfirmation"
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
    let key = "url";
    for (const arg of args){
        if (flagKeyTable[arg]) {
            key = flagKeyTable[arg];
            if (exclusiveFlags.has(key)) {
                if (setExclusive === false) {
                    flags[key] = true;
                    setExclusive = true;
                } else {
                    key = "url";
                }
            } else {
                flags[key] = true;
            }
            continue;
        }
        switch(key){
            case "newer":
                target.newer ?? (target.newer = formatDateString(arg) ?? null);
                break;
            case "older":
                target.older ?? (target.older = formatDateString(arg) ?? null);
                break;
            case "delete":
                target.url = arg;
                break;
            case "importMap":
                target.importMap ?? (target.importMap = new Set());
                target.importMap.add(arg);
                break;
            default:
                target.url ?? (target.url = arg);
        }
        if (key === "importMap") continue;
        key = "url";
    }
    flags.delete && (flags.withPath = true);
    flags.uses && (flags.withPath = false);
    flags.quiet && (flags.verbose = false);
    invalidArgs.noUrl = (flags.url || flags.delete) && target.url === undefined;
    invalidArgs.noNewer = flags.newer && target.newer === undefined;
    invalidArgs.noOlder = flags.older && target.older === undefined;
    invalidArgs.invalidNewer = flags.newer && target.newer === null;
    invalidArgs.invalidOlder = flags.older && target.older === null;
    return {
        optionFlags: flags,
        target,
        invalidArgs
    };
}
let quietMode = false;
let verboseMode = false;
function updateOutputMode(mode) {
    quietMode = mode.quiet;
    verboseMode = mode.verbose;
}
var ConfirmationId;
(function(ConfirmationId) {
    ConfirmationId["Delete"] = "delete";
    ConfirmationId["LongTime"] = "longTime";
})(ConfirmationId || (ConfirmationId = {}));
var ResultId;
(function(ResultId) {
    ResultId["Version"] = "version";
    ResultId["VersionError"] = "versionError";
    ResultId["InvalidDate"] = "invalidDate";
    ResultId["DateRequired"] = "dateRequired";
    ResultId["ModuleUrlRequired"] = "moduleUrlRequired";
    ResultId["FoundModule"] = "foundModule";
    ResultId["FoundFile"] = "foundFile";
    ResultId["DeletedFile"] = "deletedFile";
})(ResultId || (ResultId = {}));
function generateMessage(type) {
    switch(type.id){
        case ConfirmationId.Delete:
            switch(type.fileCount){
                case 0:
                    throw new Error("There are no files to delete");
                case 1:
                    return "\nThis operation cannot be undone.\n" + `Are you sure you want to delete the above ${type.fileCount} file? (y/N): `;
                default:
                    return "\nThis operation cannot be undone.\n" + `Are you sure you want to delete the above ${type.fileCount} files? (y/N): `;
            }
        case ConfirmationId.LongTime:
            return "It may take a very long time. Are you sure you want to start the process? (y/N): ";
        case ResultId.Version:
            return `Deno module cache manager ${type.version}`;
        case ResultId.VersionError:
            return `INFO: Deno version ${type.version} or later is required`;
        case ResultId.InvalidDate:
            return `INFO: The specified ${type.option} date is invalid`;
        case ResultId.DateRequired:
            return `INFO: Please specify the ${type.option} date`;
        case ResultId.ModuleUrlRequired:
            return "INFO: Please specify the module url";
        case ResultId.FoundModule:
            {
                const moduleMessage = (()=>{
                    switch(type.moduleCount){
                        case 0:
                            return "INFO: No modules are found";
                        case 1:
                            return `\nTotal: ${type.moduleCount} module is found`;
                        default:
                            return `\nTotal: ${type.moduleCount} modules are found`;
                    }
                })();
                switch(type.fileCount){
                    case undefined:
                        return moduleMessage;
                    case 1:
                        return `${moduleMessage} (${type.fileCount} file)`;
                    default:
                        return `${moduleMessage} (${type.fileCount} files)`;
                }
            }
        case ResultId.FoundFile:
            switch(type.fileCount){
                case 0:
                    return "INFO: No files are found";
                case 1:
                    return `\nTotal: ${type.fileCount} file is found`;
                default:
                    return `\nTotal: ${type.fileCount} files are found`;
            }
        case ResultId.DeletedFile:
            return `DELETED: ${type.filePath}`;
        default:
            {
                const _invalidValue = type;
                throw new Error(`${JSON.stringify(_invalidValue)} is invalid`);
            }
    }
}
function displayConfirmationMessage(type, skip = false) {
    if (skip) return true;
    const message = generateMessage(type);
    Deno.stdout.writeSync(new TextEncoder().encode(message));
    const buf = new Uint8Array(1024);
    const n = Deno.stdin.readSync(buf);
    const input = new TextDecoder().decode(buf.subarray(0, n)).trim();
    return input.toLowerCase() === "y";
}
function displayResultMessage(type) {
    if (quietMode) return;
    const message = generateMessage(type);
    console.log(message);
}
function displayInvalidArgsMessage(invalidArgs) {
    invalidArgs.noUrl && displayResultMessage({
        id: ResultId.ModuleUrlRequired
    });
    invalidArgs.noNewer && displayResultMessage({
        id: ResultId.DateRequired,
        option: "newer"
    });
    invalidArgs.noOlder && displayResultMessage({
        id: ResultId.DateRequired,
        option: "older"
    });
    invalidArgs.invalidNewer && displayResultMessage({
        id: ResultId.InvalidDate,
        option: "newer"
    });
    invalidArgs.invalidOlder && displayResultMessage({
        id: ResultId.InvalidDate,
        option: "older"
    });
}
function displaySearchCriteria(option, target) {
    if (verboseMode === false) return;
    const criteria = (option.missingUrl ? ` - Search with option "--missing-url"\n` : "") + (option.leaves ? ` - Search with option "--leaves"\n` : "") + (option.uses ? ` - Search with option "--uses"\n` : "") + (target.url ? ` - Module URL contains "${target.url}"\n` : "") + (target.newer ? ` - Download date is equal to or newer than "${target.newer}"\n` : "") + (target.older ? ` - Download date is equal to or older than "${target.older}"\n` : "") || " - All cached modules";
    const message = `Search criteria:\n${criteria}`.trimEnd();
    console.log(message);
}
function displaySearchLocation() {
    if (verboseMode === false) return;
    const message = "Search locations:\n" + ` - ${location.baseDepsPath}\n` + ` - ${location.baseGenPath}`;
    console.log(message);
}
function displayCursor(show = true) {
    if (checkDenoVersion("1.19.0") === false) return;
    if (Deno.build.os === "windows") return;
    const showCursor = ()=>{
        Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?25h"));
    };
    const hideCursor = ()=>{
        Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?25l"));
    };
    if (show) {
        showCursor();
        Deno.removeSignalListener("SIGINT", showCursor);
        Deno.removeSignalListener("SIGTERM", showCursor);
        Deno.addSignalListener("SIGINT", ()=>Deno.exit(1));
        Deno.addSignalListener("SIGTERM", ()=>Deno.exit(1));
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
    if (current === 0) displayCursor(false);
    Deno.stdout.writeSync(new TextEncoder().encode(`${text}\r`));
    if (current >= total) {
        Deno.stdout.writeSync(new TextEncoder().encode("\x1b[2K"));
        displayCursor(true);
    }
}
async function obtainDepsData(urlList) {
    const collectedData = {};
    const regexpToFilterUrl = (()=>{
        if (checkDenoVersion("1.4.0")) {
            return /^\S{3}\shttps?:\/\//;
        } else {
            return /^\s{2}\S{3}\shttps?:\/\//;
        }
    })();
    const regexpToRemoveBeforeUrl = /^.*?\shttp/;
    const regexpToRemoveAfterUrl = /\s.*$/;
    let counter = 0;
    const total = urlList.length;
    displayProgress(counter, total, "modules checked");
    const semaphore = new Semaphore(5);
    await Promise.all(urlList.map(async (url)=>{
        await semaphore.acquire();
        const denoInfo = await DenoInfo.obtainModuleInfo(url, displayCursor);
        const depsUrlList = new Set(denoInfo.split("\n").filter((line)=>regexpToFilterUrl.test(line)).map((line)=>{
            return line.trim().replace(regexpToRemoveBeforeUrl, "http").replace(regexpToRemoveAfterUrl, "");
        }));
        collectedData[url] = depsUrlList;
        semaphore.release();
        displayProgress(++counter, total, "modules checked");
    }));
    return collectedData;
}
function extractUrlFromImportMapData(jsonData, ignoreError = false) {
    const collectedList = new Set();
    const isNotKeyValueObject = (data)=>typeof data !== "object" || data === null || Array.isArray(data);
    (()=>{
        if (jsonData.imports === undefined) return;
        if (isNotKeyValueObject(jsonData.imports)) {
            if (ignoreError) return;
            throw new TypeError(`The "imports" top-level key should be a JSON object\n` + `"imports":${JSON.stringify(jsonData.imports)}`);
        }
        Object.values(jsonData.imports).filter((v)=>typeof v === "string" && isValidUrl(v)).forEach(Set.prototype.add, collectedList);
    })();
    (()=>{
        if (jsonData.scopes === undefined) return;
        if (isNotKeyValueObject(jsonData.scopes)) {
            if (ignoreError) return;
            throw new TypeError(`The "scopes" top-level key should be a JSON object\n` + `"scopes":${JSON.stringify(jsonData.scopes)}`);
        }
        for (const [prefix, map] of Object.entries(jsonData.scopes)){
            if (isNotKeyValueObject(map)) {
                if (ignoreError) continue;
                throw new TypeError(`The value of the scope should be a JSON object\n` + `"${prefix}":${JSON.stringify(map)} in ` + `"scopes":${JSON.stringify(jsonData.scopes)}`);
            }
            Object.values(map).filter((v)=>typeof v === "string" && isValidUrl(v)).forEach(Set.prototype.add, collectedList);
        }
    })();
    return collectedList;
}
async function obtainDepsDataFromSpecifiedImportMap(importMapLocationList) {
    const collectedData = {};
    for (const loc of importMapLocationList){
        try {
            const jsonData = await (async ()=>{
                if (isValidUrl(loc)) return await fetchJsonFile(loc);
                if (isFileExist(loc)) return readJsonFile(loc);
                throw new Error("The specified import map URL or path is invalid");
            })();
            collectedData[loc] = extractUrlFromImportMapData(jsonData);
        } catch (e) {
            console.error(`Loading import map: ${loc}`);
            console.error(e);
            Deno.exit(1);
        }
    }
    return collectedData;
}
function obtainDepsDataFromCachedImportMap(jsonFileList) {
    const collectedData = {};
    for (const file of jsonFileList){
        const importMapFilePath = buildBaseFilePath(file.url, file.hash).depsHashedPath;
        try {
            const jsonData = readJsonFile(importMapFilePath);
            collectedData[file.url] = extractUrlFromImportMapData(jsonData, true);
        } catch (_e) {
            continue;
        }
    }
    return collectedData;
}
class ModuleData {
    data = {};
    get allUrlList() {
        return Object.keys(this.data);
    }
    get targetedUrlList() {
        return this.allUrlList.filter((v)=>this.data[v].target);
    }
    get sortedUrlList() {
        return this.targetedUrlList.sort();
    }
    get sortedUrlListByDate() {
        return this.sortedUrlList.sort((v1, v2)=>{
            return (this.data[v1].date ?? "0") > (this.data[v2].date ?? "0") ? -1 : 1;
        });
    }
    get targetedUrlListLength() {
        return this.targetedUrlList.length;
    }
    get maxUrlStringLength() {
        return this.targetedUrlList.reduce((v1, v2)=>Math.max(v1, v2.length), 0);
    }
    get relatedFilePathList() {
        return this.targetedUrlList.flatMap((v)=>this.data[v].relatedFilePath ?? []);
    }
    get relatedFilePathListLength() {
        return this.targetedUrlList.reduce((v1, v2)=>v1 + (this.data[v2].relatedFilePath?.length ?? 0), 0);
    }
    get locationDataSpecifiedInHeader() {
        return this.allUrlList.filter((v)=>this.data[v].location).reduce((object, v)=>{
            object[v] = this.data[v].location;
            return object;
        }, {});
    }
    get typesDataSpecifiedInHeader() {
        return this.allUrlList.filter((v)=>this.data[v].types).reduce((object, v)=>{
            object[v] = this.data[v].types;
            return object;
        }, {});
    }
    get cachedJsonFileUrlAndHashList() {
        return this.allUrlList.filter((v)=>v.endsWith(".json")).map((v)=>({
                url: v,
                hash: this.data[v].hash
            }));
    }
    date(url) {
        return this.data[url].date;
    }
    relatedFilePath(url) {
        return this.data[url].relatedFilePath ?? [];
    }
    uses(url) {
        return this.data[url].uses?.sort() ?? [];
    }
    collectModule(depsPath, target) {
        if (depsPath.endsWith("/")) depsPath = depsPath.slice(0, -1);
        if (isDirectoryExist(depsPath) === false) return;
        for (const dirEntry of Deno.readDirSync(depsPath)){
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
                    target: target.url === undefined || url.includes(target.url),
                    date: metadata.date,
                    location: metadata.location,
                    types: metadata.types
                };
                if (this.data[url].target === false) continue;
                if (((target.newer ?? target.older) ?? false) === false) continue;
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
        const extensionsInDeps = [
            "",
            ".metadata.json"
        ];
        const extensionsInGen = [
            ".d.ts",
            ".js",
            ".js.map",
            ".buildinfo",
            ".meta"
        ];
        for (const url of this.targetedUrlList){
            const { depsHashedPath , genHashedPath , genUrlPath ,  } = buildBaseFilePath(url, this.data[url].hash);
            const depsPathList = extensionsInDeps.map((ext)=>depsHashedPath + ext);
            const genPathList = [
                genHashedPath,
                genUrlPath
            ].flatMap((path)=>extensionsInGen.map((ext)=>path + ext));
            this.data[url].relatedFilePath = [
                ...depsPathList,
                ...genPathList
            ].filter((path)=>isFileExist(path));
        }
    }
    async collectUsesModule(importMapLocationList) {
        const cachedJsonFileList = this.cachedJsonFileUrlAndHashList;
        const mapDeps1 = cachedJsonFileList.length ? obtainDepsDataFromCachedImportMap(cachedJsonFileList) : {};
        const mapDeps2 = importMapLocationList ? await obtainDepsDataFromSpecifiedImportMap(importMapLocationList) : {};
        const mapsData = switchObjectKeyAndValue(mergeObject(mapDeps1, mapDeps2));
        const deps1 = await obtainDepsData(this.allUrlList);
        const deps2 = this.locationDataSpecifiedInHeader;
        const deps3 = this.typesDataSpecifiedInHeader;
        const usesData = switchObjectKeyAndValue(mergeObject(deps1, deps2, deps3));
        for (const url of this.targetedUrlList){
            const collectedDepsData = usesData[url] ?? new Set();
            for (const [key, value] of Object.entries(mapsData)){
                if (url.startsWith(key)) {
                    value.forEach(Set.prototype.add, collectedDepsData);
                }
            }
            this.data[url].uses = [
                ...collectedDepsData
            ];
        }
    }
    async extractLeavesModule(importMapLocationList) {
        await this.collectUsesModule(importMapLocationList);
        for (const url of this.targetedUrlList){
            if (this.data[url].uses?.length) {
                this.data[url].target = false;
            }
        }
    }
}
function collectAllHashedFilePath() {
    const baseDirList = [
        `${location.baseDepsPath}/https`,
        `${location.baseDepsPath}/http`,
        `${location.baseGenPath}/https`,
        `${location.baseGenPath}/http`,
    ];
    const hostDirList = [];
    for (const baseDir of baseDirList){
        if (isDirectoryExist(baseDir) === false) continue;
        for (const dirEntry of Deno.readDirSync(baseDir)){
            if (dirEntry.isDirectory === false) continue;
            hostDirList.push(`${baseDir}/${dirEntry.name}`);
        }
    }
    const pathList = [];
    for (const hostDir of hostDirList){
        for (const dirEntry1 of Deno.readDirSync(hostDir)){
            if (dirEntry1.isDirectory) continue;
            if (dirEntry1.name.startsWith(".")) continue;
            pathList.push(`${hostDir}/${dirEntry1.name}`);
        }
    }
    return pathList;
}
function collectPathOfFileWithMissingURL() {
    const pathList = collectAllHashedFilePath();
    const metadataExt = ".metadata.json";
    const regexpToRemoveExt = /\.d\.ts$|\.js$|\.js\.map$|\.buildinfo$|\.meta$/;
    const pathListWithMissingURL = [];
    for (const path of pathList){
        if (path.startsWith(location.baseDepsPath) && path.endsWith(".metadata.json")) continue;
        const adjustedPath = path.replace(regexpToRemoveExt, "");
        const depsMetadataFilePath = adjustedPath.replace(location.baseGenPath, location.baseDepsPath) + metadataExt;
        if (isFileExist(depsMetadataFilePath)) continue;
        pathListWithMissingURL.push(path);
    }
    return pathListWithMissingURL;
}
function displayCachedModuleList(moduleData, optionFlags) {
    const sortedUrlList = optionFlags.sortDate ? moduleData.sortedUrlListByDate : moduleData.sortedUrlList;
    const maxUrlLength = optionFlags.withDate ? moduleData.maxUrlStringLength : 0;
    const { startBold , endBold  } = (()=>{
        if (Deno.noColor === false && (optionFlags.withPath || optionFlags.uses)) {
            return {
                startBold: "\x1b[1m",
                endBold: "\x1b[0m"
            };
        }
        return {
            startBold: "",
            endBold: ""
        };
    })();
    for (const url of sortedUrlList){
        const urlString = `${startBold}${url}${endBold}`;
        const dateString = (()=>{
            if (optionFlags.withDate) {
                const padding = " ".repeat(maxUrlLength - url.length + 2);
                return padding + (moduleData.date(url) ?? "Unknown");
            }
            return "";
        })();
        console.log(urlString + dateString);
        if (optionFlags.withPath || optionFlags.uses) {
            const list = (()=>{
                switch(true){
                    case optionFlags.withPath:
                        return moduleData.relatedFilePath(url);
                    case optionFlags.uses:
                        return moduleData.uses(url);
                    default:
                        return [];
                }
            })();
            list.forEach((v)=>console.log(` - ${v}`));
        }
    }
}
function deleteFile(pathList, callback) {
    pathList.forEach((path)=>{
        Deno.removeSync(path);
        callback && callback(path);
    });
}
function displayHelp(version) {
    const t = " ".repeat(4);
    console.log(`Deno module cache manager ${version}\n\n` + `USAGE:\n` + `${t}deno install --allow-run --allow-read --allow-write -n deno-module-cache-manager https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js\n` + `${t}deno-module-cache-manager [OPTIONS]\n\n` + `OPTIONS:\n` + `${t}-d, --delete <MODULE_URL>     ${t}Delete cached module files\n` + `${t}                              ${t}Perform a substring search for MODULE_URL\n` + `${t}                              ${t}and files related to the matched module URLs are objects of deletion\n` + `${t}-h, --help                    ${t}Print help information\n` + `${t}    --import-map <URL>        ${t}Load import map\n` + `${t}                              ${t}One or more URLs or file paths can be specified\n` + `${t}    --leaves                  ${t}Print cached module URLs that are not dependencies of another cached module\n` + `${t}    --missing-url             ${t}Print cached module file paths whose URLs are missing\n` + `${t}-n, --name, --url <MODULE_URL>${t}Print cached module URLs\n` + `${t}                              ${t}Perform a substring search for MODULE_URL\n` + `${t}                              ${t}and the matched module URLs are objects of printing\n` + `${t}    --newer <DATE_STRING>     ${t}Print cached module URLs whose download date and time is\n` + `${t}                              ${t}equal to or newer than <DATE_STRING>\n` + `${t}                              ${t}The format of <DATE_STRING> is like yyyy-MM-dd, yyyy-MM-ddTHH:mm:ss, etc.\n` + `${t}    --older <DATE_STRING>     ${t}Print cached module URLs whose download date and time is\n` + `${t}                              ${t}equal to or older than <DATE_STRING>\n` + `${t}                              ${t}The format of <DATE_STRING> is like yyyy-MM-dd, yyyy-MM-ddTHH:mm:ss, etc.\n` + `${t}-q, --quiet                   ${t}Suppress result output\n` + `${t}    --sort-date               ${t}Print cached module URLs in order of their download date and time\n` + `${t}    --uses                    ${t}Print cached module URLs along with other cached modules depending on them\n` + `${t}-v, --verbose                 ${t}Print additional information in result output\n` + `${t}-V, --version                 ${t}Print version information\n` + `${t}    --with-date               ${t}Print cached module URLs along with their download date and time\n` + `${t}    --with-path               ${t}Print cached module URLs along with paths of files related to them\n` + `${t}-y, --yes                     ${t}Automatically answer yes for confirmation`);
}
async function main() {
    if (checkDenoVersion(MIN_DENO_VERSION) === false) {
        displayResultMessage({
            id: ResultId.VersionError,
            version: MIN_DENO_VERSION
        });
        Deno.exit();
    }
    const { optionFlags , target , invalidArgs  } = sortOutArgs(Deno.args);
    if (optionFlags.version) {
        displayResultMessage({
            id: ResultId.Version,
            version: SCRIPT_VERSION
        });
        Deno.exit();
    }
    if (optionFlags.help) {
        displayHelp(SCRIPT_VERSION);
        Deno.exit();
    }
    await location.storeCacheLocation();
    updateOutputMode({
        quiet: optionFlags.quiet,
        verbose: optionFlags.verbose
    });
    if (optionFlags.missingUrl) {
        const filePathList = collectPathOfFileWithMissingURL();
        const fileCount = filePathList.length;
        filePathList.forEach((path)=>console.log(path));
        displayResultMessage({
            id: ResultId.FoundFile,
            fileCount
        });
        displaySearchCriteria(optionFlags, {});
        displaySearchLocation();
        Deno.exit();
    }
    if (Object.values(invalidArgs).includes(true)) {
        displayInvalidArgsMessage(invalidArgs);
        Deno.exit();
    }
    if (optionFlags.leaves || optionFlags.uses) {
        displayConfirmationMessage({
            id: ConfirmationId.LongTime
        }, optionFlags.skipConfirmation) || Deno.exit();
    }
    const moduleData = new ModuleData();
    moduleData.collectModule(location.baseDepsPath, target);
    if (optionFlags.leaves) await moduleData.extractLeavesModule(target.importMap);
    const moduleCount = moduleData.targetedUrlListLength;
    if (moduleCount === 0) {
        displayResultMessage({
            id: ResultId.FoundModule,
            moduleCount
        });
        displaySearchCriteria(optionFlags, target);
        displaySearchLocation();
        Deno.exit();
    }
    if (optionFlags.withPath) moduleData.collectRelatedFilePath();
    if (optionFlags.uses) await moduleData.collectUsesModule(target.importMap);
    if (optionFlags.delete) {
        optionFlags.skipConfirmation || displayCachedModuleList(moduleData, optionFlags);
        displayConfirmationMessage({
            id: ConfirmationId.Delete,
            fileCount: moduleData.relatedFilePathListLength
        }, optionFlags.skipConfirmation) && deleteFile(moduleData.relatedFilePathList, (filePath)=>{
            displayResultMessage({
                id: ResultId.DeletedFile,
                filePath
            });
        });
        Deno.exit();
    }
    displayCachedModuleList(moduleData, optionFlags);
    displayResultMessage({
        id: ResultId.FoundModule,
        moduleCount,
        fileCount: optionFlags.withPath ? moduleData.relatedFilePathListLength : undefined
    });
    displaySearchCriteria(optionFlags, target);
    displaySearchLocation();
}
main();
