import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",  // vite dev server default
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotsFolder: "cypress/screenshots",
    // Cypress cannot directly await IDB transactions.
    // Use cy.window().then(w => w.indexedDB.deleteDatabase(...)) for state reset.
  },
  reporter: "junit",
  reporterOptions: {
    mochaFile: "cypress-results/results.xml",
  },
});
