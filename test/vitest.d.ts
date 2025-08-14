/// <reference types="vitest/globals" />

import type { vi as vitestVi } from 'vitest';

declare global {
  var vi: typeof vitestVi;
  var describe: typeof import('vitest').describe;
  var it: typeof import('vitest').it;
  var expect: typeof import('vitest').expect;
  var beforeEach: typeof import('vitest').beforeEach;
  var afterEach: typeof import('vitest').afterEach;
  var beforeAll: typeof import('vitest').beforeAll;
  var afterAll: typeof import('vitest').afterAll;
  var test: typeof import('vitest').test;
  var suite: typeof import('vitest').suite;
}

export {};
