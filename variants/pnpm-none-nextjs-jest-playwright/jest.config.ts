import type { Config } from "jest";

const config: Config = {
  // Use @swc/jest for fast TypeScript transform (avoids Babel config)
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest", {}],
  },
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Stub fake-indexeddb/auto for ESM compatibility
    "^fake-indexeddb/auto$": "<rootDir>/__mocks__/fake-indexeddb-auto.cjs",
  },
  testMatch: ["**/tests/acceptance/**/*.test.ts"],
  setupFiles: ["./tests/setup.ts"],
  // ESM interop: use --experimental-vm-modules for full ESM support
  // or keep CJS transform via @swc/jest (chosen here for simplicity)
  extensionsToTreatAsEsm: [],
};

export default config;
