# Deno Module Cache Manager

CLI tool to manage Deno cached modules which are stored in DENO_DIR by remote imports.

## Requirements

Deno version 1.2.0 or later.

## Installation

Install the script with the following command:

```bash
deno install --allow-run --allow-read --allow-write -n deno-module-cache-manager <url-or-path-to-cli.js>
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
# Print URLs of all cached modules
deno-module-cache-manager

# Print URLs of cached modules that contain the string <MODULE_URL>
deno-module-cache-manager -n <MODULE_URL>

# Print URLs of cached modules that contain the string <MODULE_URL>
# along with paths of files related to them
deno-module-cache-manager -n <MODULE_URL> --with-path

# Delete cached files related to modules that contain the string <MODULE_URL> in their URLs
deno-module-cache-manager -d <MODULE_URL>

# Print help information
deno-module-cache-manager -h
```

## Uninstallation

In Deno version 1.15.0 or later:

```bash
deno uninstall deno-module-cache-manager
```

In Deno version 1.14.3 or earlier, remove the installed script file directly.
