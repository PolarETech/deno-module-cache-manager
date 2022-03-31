# Releases

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
