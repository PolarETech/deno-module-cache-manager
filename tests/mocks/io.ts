// Copyright 2022 Polar Tech. All rights reserved. MIT license.

export class MockConsole {
  output: string[];
  private _originalConsoleLog = console.log;
  private _originalConsoleError = console.error;

  private _fn = (...message: string[]) => {
    this.output.push(...message);
    return;
  };

  constructor() {
    this.output = [];
  }

  resetOutput() {
    this.output.length = 0;
  }

  replaceLogFn() {
    this.resetOutput();
    console.log = this._fn;
  }

  replaceErrorFn() {
    this.resetOutput();
    console.error = this._fn;
  }

  restoreLogFn() {
    console.log = this._originalConsoleLog;
    this.resetOutput();
  }

  restoreErrorFn() {
    console.error = this._originalConsoleError;
    this.resetOutput();
  }
}

export class MockStdout {
  output: string[];
  private _originalWriteSync = Deno.stdout.writeSync;

  constructor() {
    this.output = [];
  }

  resetOutput() {
    this.output.length = 0;
  }

  replaceWriteSyncFn() {
    this.resetOutput();
    Deno.stdout.writeSync = (p: Uint8Array) => {
      const message = new TextDecoder().decode(p);
      this.output.push(message);
      return message.length;
    };
  }

  restoreWriteSyncFn() {
    Deno.stdout.writeSync = this._originalWriteSync;
    this.resetOutput();
  }
}

export class MockStdin {
  private _originalReadSync = Deno.stdin.readSync;

  replaceReadSyncFn(input = "\n") {
    Deno.stdin.readSync = (p: Uint8Array) => {
      p.set(new TextEncoder().encode(input));
      return input.length;
    };
  }

  restoreReadSyncFn() {
    Deno.stdin.readSync = this._originalReadSync;
  }
}
