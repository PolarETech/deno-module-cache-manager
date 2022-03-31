# Deno Module Cache Manager

CLI tool to manage Deno cached modules which are stored in DENO_DIR by remote imports.

## Features

- List cached module URLs
- Search for cached module URLs
- Print file paths of cached modules
- Print download date and time of chached modules
- Print which modules depend on it
- Delete cached module files by specifying URL
- List cached modules that are not dependencies of another cached module
- List file paths of cached modules whose URLs are missing

## Requirements

Deno version 1.2.0 or later.

## Installation

Install the script with the following command:

```bash
deno install --allow-run --allow-read --allow-write -n deno-module-cache-manager https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js
```

___NOTE:___

The directory where the script is installed must be added to your $PATH.  
For more information, please refer to the [Deno Manual](https://deno.land/manual/tools/script_installer).

## Usage

```bash
deno-module-cache-manager [OPTIONS]
```

## Examples

``` bash
# List all cached module URLs
deno-module-cache-manager

# Search for cached module URLs (substring match)
deno-module-cache-manager -n <MODULE_URL>

# Print file paths of cached modules
deno-module-cache-manager -n <MODULE_URL> --with-path

# Print download date and time of chached modules
deno-module-cache-manager -n <MODULE_URL> --with-date

# Print download date and time of chached modules (sorted)
deno-module-cache-manager -n <MODULE_URL> --with-date --sort-date

# Print which modules depend on it
deno-module-cache-manager -n <MODULE_URL> --uses

# Delete cached module files by specifying URL
deno-module-cache-manager -d <MODULE_URL>

# List cached modules that are not dependencies of another cached module
deno-module-cache-manager --leaves

# List file paths of cached modules whose URLs are missing
deno-module-cache-manager --missing-url

# Print help information
deno-module-cache-manager -h

# Print version information
deno-module-cache-manager -V
```

## Output Samples

```bash
# Cache the following modules in advance
# $ deno cache https://deno.land/std@0.130.0/examples/welcome.ts
# $ deno cache https://deno.land/std@0.130.0/examples/cat.ts


# List all cached modules
$ deno-module-cache-manager
https://deno.land/std@0.130.0/_util/assert.ts
https://deno.land/std@0.130.0/bytes/bytes_list.ts
https://deno.land/std@0.130.0/bytes/equals.ts
https://deno.land/std@0.130.0/bytes/mod.ts
https://deno.land/std@0.130.0/examples/cat.ts
https://deno.land/std@0.130.0/examples/welcome.ts
https://deno.land/std@0.130.0/io/buffer.ts
https://deno.land/std@0.130.0/io/types.d.ts
https://deno.land/std@0.130.0/streams/conversion.ts
https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js

Total: 10 modules are found


# Search for cached modules
$ deno-module-cache-manager -n examples
https://deno.land/std@0.130.0/examples/cat.ts
https://deno.land/std@0.130.0/examples/welcome.ts

Total: 2 modules are found


# Print file paths
$ deno-module-cache-manager -n welcome --with-path
https://deno.land/std@0.130.0/examples/welcome.ts
 - /deno-dir/deps/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90
 - /deno-dir/deps/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.metadata.json
 - /deno-dir/gen/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.js
 - /deno-dir/gen/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.buildinfo
 - /deno-dir/gen/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.meta

Total: 1 module is found (5 files)


# Print download date and time (sorted)
$ deno-module-cache-manager -n std --with-date --sort-date
https://deno.land/std@0.130.0/bytes/equals.ts        2022-03-24T14:07:06.000Z
https://deno.land/std@0.130.0/_util/assert.ts        2022-03-24T14:07:05.000Z
https://deno.land/std@0.130.0/bytes/bytes_list.ts    2022-03-24T14:07:05.000Z
https://deno.land/std@0.130.0/bytes/mod.ts           2022-03-24T14:07:05.000Z
https://deno.land/std@0.130.0/io/buffer.ts           2022-03-24T14:07:05.000Z
https://deno.land/std@0.130.0/io/types.d.ts          2022-03-24T14:07:05.000Z
https://deno.land/std@0.130.0/streams/conversion.ts  2022-03-24T14:07:05.000Z
https://deno.land/std@0.130.0/examples/cat.ts        2022-03-24T14:07:04.000Z
https://deno.land/std@0.130.0/examples/welcome.ts    2022-03-24T14:01:32.000Z

Total: 9 modules are found


# Print which modules depend on it
$ deno-module-cache-manager -n bytes --uses
It may take a very long time. Are you sure you want to start the process? (y/N): y
https://deno.land/std@0.130.0/bytes/bytes_list.ts
 - https://deno.land/std@0.130.0/io/buffer.ts
https://deno.land/std@0.130.0/bytes/equals.ts
 - https://deno.land/std@0.130.0/bytes/mod.ts
https://deno.land/std@0.130.0/bytes/mod.ts
 - https://deno.land/std@0.130.0/io/buffer.ts

Total: 3 modules are found


# Delete cached module files
$ deno-module-cache-manager -d welcome
https://deno.land/std@0.130.0/examples/welcome.ts
 - /deno-dir/deps/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90
 - /deno-dir/deps/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.metadata.json
 - /deno-dir/gen/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.js
 - /deno-dir/gen/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.buildinfo
 - /deno-dir/gen/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.meta

This operation cannot be undone.
Are you sure you want to delete the above 5 files? (y/N): y
DELETED: /deno-dir/deps/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90
DELETED: /deno-dir/deps/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.metadata.json
DELETED: /deno-dir/gen/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.js
DELETED: /deno-dir/gen/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.buildinfo
DELETED: /deno-dir/gen/https/deno.land/f6ca893377de0e79d1ee801e46912138bde275dc2c9974bfc7a53ffbf5b65b90.meta


# List cached modules that are not dependencies of another cached module
$ deno-module-cache-manager --leaves
It may take a very long time. Are you sure you want to start the process? (y/N): y
https://deno.land/std@0.130.0/examples/cat.ts
https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js

Total: 2 modules are found
```

## Uninstallation

In Deno version 1.15.0 or later:

```bash
deno uninstall deno-module-cache-manager
```

In Deno version 1.14.3 or earlier, remove the installed script file directly.
