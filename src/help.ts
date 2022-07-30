// Copyright 2022 Polar Tech. All rights reserved. MIT license.

import { SCRIPT_VERSION } from "./version.ts";

export function displayHelp(): void {
  const t = " ".repeat(4);
  console.log(
    `Deno module cache manager ${SCRIPT_VERSION}\n\n` +
      `USAGE:\n` +
      `${t}deno install --allow-run --allow-read --allow-write -n deno-module-cache-manager https://raw.githubusercontent.com/PolarETech/deno-module-cache-manager/main/cli.js\n` +
      `${t}deno-module-cache-manager [OPTIONS]\n\n` +
      `OPTIONS:\n` +
      `${t}-d, --delete <MODULE_URL>     ${t}Delete cached module files\n` +
      `${t}                              ${t}Perform a substring search for MODULE_URL\n` +
      `${t}                              ${t}and files related to the matched module URLs are objects of deletion\n` +
      `${t}-h, --help                    ${t}Print help information\n` +
      `${t}    --import-map <URL>        ${t}Load import map\n` +
      `${t}                              ${t}One or more URLs or file paths can be specified\n` +
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
