// Copyright 2022 Polar Tech. All rights reserved. MIT license.

export function displayCursor(show = true): void {
  const message = show ? "** call showCursor **" : "** call hideCursor **";
  Deno.stdout.writeSync(new TextEncoder().encode(message));
}

export function displayProgress(
  current: number,
  total: number,
  suffix = "done",
): void {
  const digits = String(total).length;
  const text = ` * ${String(current).padStart(digits, " ")} / ${total} ${suffix}`;

  if (current === 0) displayCursor(false);

  Deno.stdout.writeSync(new TextEncoder().encode(`${text}\r`));

  if (current >= total) {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[2K"));
    displayCursor(true);
  }
}
