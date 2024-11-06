# Deno Module Cache Manager

CLI tool to manage Deno cached modules which are stored in DENO_DIR by remote imports.

## Features

- List cached module URLs
- Substring search of cached module URLs
- Print file paths of cached modules
- Print download date and time of cached modules
- Search by download date and time of cached modules
- Print which modules depend on it
- Delete cached module files by specifying URL
- List cached modules that are not dependencies of another cached module
- List file paths of cached modules whose URLs are missing

## Requirements

Deno version __^1.2.0__.

___Deno version 2.x.x are currently not supported___.

## Installation

Install the script with the following command:

```bash
deno install --allow-run --allow-read --allow-write --allow-net -n deno-module-cache-manager https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js
```

___NOTE:___

The directory where the script is installed must be added to your $PATH.  
For more information, please refer to the [Deno Manual](https://deno.land/manual/tools/script_installer).

### Required Permissions

| Permissions | Level    | Purpose                                      |
| ----------- | -------- | -------------------------------------------- |
| run         | must     | To run the "deno info" command in the script |
| read        | must     | To read cached module files                  |
| write       | optional | To delete cached module files                |
| net         | optional | To fetch import map files on remote servers  |

## Upgrade

```bash
deno install --allow-run --allow-read --allow-write --allow-net -f -n deno-module-cache-manager https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js
deno cache -r https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js
```

## Usage

```bash
deno-module-cache-manager [OPTIONS]
```

## Examples

``` bash
# List all cached module URLs
deno-module-cache-manager

# Substring search of cached module URLs ("-n" can be omitted)
deno-module-cache-manager -n <MODULE_URL>

deno-module-cache-manager <MODULE_URL>

# Print file paths of cached modules
deno-module-cache-manager -n <MODULE_URL> --with-path

# Print download date and time of chached modules
deno-module-cache-manager -n <MODULE_URL> --with-date

# Print download date and time of chached modules (sorted)
deno-module-cache-manager -n <MODULE_URL> --with-date --sort-date

# Search by download date and time of cached modules
deno-module-cache-manager --newer yyyy-MM-ddTHH:mm:ss --older yyyy-MM-dd

# Print which modules depend on it
deno-module-cache-manager -n <MODULE_URL> --uses

# Print which modules depend on it (with import map option)
deno-module-cache-manager --uses <MODULE_URL> --import-map <URL>

# Delete cached module files by specifying URL
deno-module-cache-manager -d <MODULE_URL>

# List cached modules that are not dependencies of another cached module
deno-module-cache-manager --leaves

# List file paths of cached modules whose URLs are missing
deno-module-cache-manager --missing-url

# Verbose mode
deno-module-cache-manager -v

# Suppress result output
deno-module-cache-manager -q

# Print help information
deno-module-cache-manager -h

# Print version information
deno-module-cache-manager -V
```

## Output Samples

```bash
# Cache the following modules in advance
# $ deno cache https://deno.land/std@0.150.0/examples/welcome.ts
# $ deno cache https://deno.land/std@0.150.0/examples/cat.ts


# List all cached modules
$ deno-module-cache-manager
https://deno.land/std@0.150.0/_util/assert.ts
https://deno.land/std@0.150.0/bytes/bytes_list.ts
https://deno.land/std@0.150.0/bytes/equals.ts
https://deno.land/std@0.150.0/bytes/mod.ts
https://deno.land/std@0.150.0/examples/cat.ts
https://deno.land/std@0.150.0/examples/welcome.ts
https://deno.land/std@0.150.0/io/buffer.ts
https://deno.land/std@0.150.0/io/types.d.ts
https://deno.land/std@0.150.0/streams/conversion.ts
https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js

Total: 10 modules are found


# Substring search of cached module URLs (verbose mode)
$ deno-module-cache-manager -n examples -v
https://deno.land/std@0.150.0/examples/cat.ts
https://deno.land/std@0.150.0/examples/welcome.ts

Total: 2 modules are found
Search criteria:
 - Module URL contains "examples"
Search locations:
 - /deno-dir/deps
 - /deno-dir/gen


# Print file paths ("-n" omitted)
$ deno-module-cache-manager welcome --with-path
https://deno.land/std@0.150.0/examples/welcome.ts
 - /deno-dir/deps/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9
 - /deno-dir/deps/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9.metadata.json
 - /deno-dir/gen/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9.js
 - /deno-dir/gen/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9.meta

Total: 1 module is found (4 files)


# Print download date and time (sorted)
$ deno-module-cache-manager -n std --with-date --sort-date
https://deno.land/std@0.150.0/bytes/equals.ts        2022-07-30T14:44:23.000Z
https://deno.land/std@0.150.0/_util/assert.ts        2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/bytes/bytes_list.ts    2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/bytes/mod.ts           2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/io/buffer.ts           2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/io/types.d.ts          2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/streams/conversion.ts  2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/examples/cat.ts        2022-07-30T14:44:21.000Z
https://deno.land/std@0.150.0/examples/welcome.ts    2022-07-29T15:38:13.000Z

Total: 9 modules are found


# Search by download date and time of cached modules
$ deno-module-cache-manager --newer 2022-07-30T14:44 --with-date
https://deno.land/std@0.150.0/_util/assert.ts        2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/bytes/bytes_list.ts    2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/bytes/equals.ts        2022-07-30T14:44:23.000Z
https://deno.land/std@0.150.0/bytes/mod.ts           2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/examples/cat.ts        2022-07-30T14:44:21.000Z
https://deno.land/std@0.150.0/io/buffer.ts           2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/io/types.d.ts          2022-07-30T14:44:22.000Z
https://deno.land/std@0.150.0/streams/conversion.ts  2022-07-30T14:44:22.000Z

Total: 8 modules are found


# Print which modules depend on it
$ deno-module-cache-manager -n bytes --uses
It may take a very long time. Are you sure you want to start the process? (y/N): y
https://deno.land/std@0.150.0/bytes/bytes_list.ts
 - https://deno.land/std@0.150.0/io/buffer.ts
https://deno.land/std@0.150.0/bytes/equals.ts
 - https://deno.land/std@0.150.0/bytes/mod.ts
https://deno.land/std@0.150.0/bytes/mod.ts
 - https://deno.land/std@0.150.0/io/buffer.ts

Total: 3 modules are found


# Print which modules depend on it (with import map and skip confirmation options)
#  * Sample contents of import_map.json
#  { "imports": { "buffer": "https://deno.land/std@0.150.0/io/buffer.ts" }}
$ deno-module-cache-manager --uses io -y --import-map https://example.com/foo/import_map.json
https://deno.land/std@0.150.0/io/buffer.ts
 - https://deno.land/std@0.150.0/streams/conversion.ts
 - https://example.com/foo/import_map.json
https://deno.land/std@0.150.0/io/types.d.ts
 - https://deno.land/std@0.150.0/io/buffer.ts
https://deno.land/std@0.150.0/streams/conversion.ts
 - https://deno.land/std@0.150.0/examples/cat.ts

Total: 3 modules are found


# Delete cached module files
$ deno-module-cache-manager -d welcome
https://deno.land/std@0.150.0/examples/welcome.ts
 - /deno-dir/deps/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9
 - /deno-dir/deps/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9.metadata.json
 - /deno-dir/gen/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9.js
 - /deno-dir/gen/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9.meta

This operation cannot be undone.
Are you sure you want to delete the above 4 files? (y/N): y
DELETED: /deno-dir/deps/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9
DELETED: /deno-dir/deps/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9.metadata.json
DELETED: /deno-dir/gen/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9.js
DELETED: /deno-dir/gen/https/deno.land/29ee14a4c880940977110456c78315e3dc45d9df7874f89926954968af933dc9.meta


# List cached modules that are not dependencies of another cached module
$ deno-module-cache-manager --leaves
It may take a very long time. Are you sure you want to start the process? (y/N): y
https://deno.land/std@0.150.0/examples/cat.ts
https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js

Total: 2 modules are found
```

## Uninstallation

In Deno version 1.15.0 or later:

```bash
deno uninstall deno-module-cache-manager
```

In Deno version 1.14.3 or earlier, remove the installed script file directly.
