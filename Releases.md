# Releases

### 0.4.1 / 2022.08.21

- fix: error occurs when specifying a local import map file with full path on Windows
- refactor: reduce code size, etc.
- refactor: change the handling of global variables in main
- refactor: change RegExp from constructor function to literal notation
- refactor: rename files
- refactor: separate functions using deno info command
- refactor: improve testability and add tests for each exported function

### 0.4.0 / 2022.08.03

- feat: enable this script to be run directly in environments where the deno path is not set
- feat: subdivide output of argument errors
- feat: support import maps (--import-map option)
- feat: consider the location header for uses and leaves options
- fix: priority when multiple newer or older options are specified
- fix: handling of x-typescript-types header value specified with a relative path
- refactor: tidy up some codes
- refactor: improve error handling in ModuleData class
- refactor: separate message strings from display message functions
- refactor: migrate from JavaScript to TypeScript
- refactor: correct typos and update comments about cache file extensions
- refactor: remove unnecessary code

### 0.3.0 / 2022.06.03

- feat: search by module download date and time (--newer and --older options)
- feat: display search criteria
- feat: display search locations
- feat: skip confirmation (--yes option)
- feat: suppress result output (--quiet option)
- feat: toggle output of result details on and off (--verbose option)
- fix: obtain cache location before checking Deno version
- fix: in some cases, unstable flag errors occur when the uses or leaves option is specified
- refactor: subdivide a parsed arguments object
- refactor: separate data collection and display processes for --missing-url option
- refactor: tidy code up in main function

### 0.2.3 / 2022.04.17

- fix: Deno version check to use Deno.addSignalListener

### 0.2.2 / 2022.04.07

- perf: change process of collecting deps info for all modules from sync to async

### 0.2.1 / 2022.03.31

- fix: output URL has a $ character at the end
- fix: incomplete output for uses option

### 0.2.0 / 2022.03.30

- feat: additional output of number of files for --with-path option
- feat: display which modules depend on it (--uses option)
- fix: incorrect precedence of multiple MODULE_URLs in arguments
- perf: reduce frequency of reading .metadata.json files
- refactor: improve ModuleData class
- refactor: use obtainDenoInfo function in collectAllDepsModuleURL function
- refactor: move const definitions outside of for statements
- refactor: tidy up string manipulation

### 0.1.0 / 2022.03.24

- feat: display URL and path of cached module file
- feat: delete cached module file (--delete option)
- feat: display path of cached module files with missing URL (--missing-url option)
- feat: add short-hand or alias for script arguments
- feat: display help information (--help option)
- feat: display URL of chached modules not depended on by others (--leaves option)
- feat: display download date of cached module file (--with-date option)
- feat: sort by module download date (--sort-date option)
- feat: display version information (--version option)
