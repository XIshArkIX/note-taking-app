// toolchain/ci/teamcity.kts
//
// TeamCity Kotlin DSL — pipeline for the toolchain comparison study.
//
// Commit this file to .teamcity/settings.kts in the variant repository,
// enable "versioned settings" in the TeamCity project, and configure the
// Bitbucket Server (Stash) VCS root.
//
// Build chain:
//   Install → Lint → TypeCheck → Unit Tests → Build
//              ↓
//          E2E Tests (Playwright or Cypress)
//              ↓
//          Metrics Collection
//
// TeamCity parameters (configured in project/build config UI or via
// the Parameters page — not committed to avoid leaking secrets):
//   env.VARIANT_ID       – matches toolchain/variants/catalog.ts id
//   env.TURBO_TOKEN      – optional Turborepo remote cache token
//   env.TURBO_TEAM       – optional Turborepo team slug
//   env.E2E_RUNNER       – "playwright" (default) or "cypress"
//   env.TYPECHECK_CMD    – empty to skip, or "pnpm run typecheck"
//
// VCS root: Bitbucket Server (Stash)
//   Configure via Administration → VCS Roots → "Bitbucket Server VCS Root"
//   with webhook trigger enabled.

import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildFeatures.perfmon
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.triggers.vcs
import jetbrains.buildServer.configs.kotlin.vcs.GitVcsRoot

version = "2024.03"

project {
    vcsRoot(StashVcsRoot)

    buildType(Install)
    buildType(Lint)
    buildType(TypeCheck)
    buildType(UnitTests)
    buildType(ProductionBuild)
    buildType(E2EPlaywright)
    buildType(E2ECypress)
    buildType(Metrics)

    // Enforce the pipeline order.
    buildTypesOrder = arrayListOf(
        Install,
        Lint,
        TypeCheck,
        UnitTests,
        ProductionBuild,
        E2EPlaywright,
        E2ECypress,
        Metrics,
    )
}

// ── VCS root (Bitbucket Server / Stash) ──────────────────────────────────

object StashVcsRoot : GitVcsRoot({
    name   = "Stash repository"
    url    = "%env.STASH_REPO_URL%"         // set in TeamCity project params
    branch = "refs/heads/main"
    branchSpec = """
        +:refs/heads/feat/*
        +:refs/heads/fix/*
        +:refs/pull-requests/*/from
    """.trimIndent()
    authMethod = password {
        userName = "%env.STASH_USERNAME%"
        password = "%env.STASH_TOKEN%"
    }
})

// ── Shared configuration ─────────────────────────────────────────────────

val nodeImage = "node:22-slim"

// pnpm store path – cached between builds via TC agent cache directories
val pnpmStore = "/agent/pnpm-store"

val commonEnv = mapOf(
    "NODE_VERSION"    to "22",
    "PNPM_STORE_DIR"  to pnpmStore,
)

fun BuildType.addPnpmSetup() {
    steps {
        script {
            name = "Enable pnpm via corepack"
            scriptContent = """
                corepack enable
                corepack prepare pnpm@latest --activate
                pnpm config set store-dir $pnpmStore
            """.trimIndent()
        }
    }
}

fun BuildType.addPnpmInstall() {
    steps {
        script {
            name = "Install dependencies"
            scriptContent = "pnpm install --frozen-lockfile"
        }
    }
}

// ── Build configuration objects ───────────────────────────────────────────

object Install : BuildType({
    name = "Install"
    description = "Install dependencies (cold + warm timing)"

    vcs { root(StashVcsRoot) }

    params { commonEnv.forEach { (k, v) -> param("env.$k", v) } }

    steps {
        script {
            name       = "Enable pnpm"
            scriptContent = "corepack enable && corepack prepare pnpm@latest --activate && pnpm config set store-dir $pnpmStore"
        }
        script {
            name          = "Cold install timing"
            scriptContent = """
                rm -rf node_modules
                START=$(date +%s%3N)
                pnpm install --frozen-lockfile
                END=$(date +%s%3N)
                echo "##teamcity[buildStatisticValue key='coldInstallMs' value='$((END - START))']"
            """.trimIndent()
        }
        script {
            name          = "node_modules size"
            scriptContent = """
                NM_BYTES=$(du -sb node_modules | cut -f1)
                echo "##teamcity[buildStatisticValue key='nodeModulesSizeBytes' value='$NM_BYTES']"
            """.trimIndent()
        }
    }

    // Publish node_modules as artifact for dependent builds.
    // In practice, use TC agent-level caching for large repos.
    artifactRules = "node_modules => node_modules.zip"

    features { perfmon {} }
})

object Lint : BuildType({
    name = "Lint"

    vcs { root(StashVcsRoot) }
    dependencies {
        snapshot(Install) { onDependencyFailure = FailureAction.FAIL_TO_START }
        artifacts(Install) {
            buildRule = lastSuccessful()
            artifactRules = "node_modules.zip!** => node_modules"
        }
    }

    steps {
        script {
            name          = "Enable pnpm"
            scriptContent = "corepack enable && corepack prepare pnpm@latest --activate"
        }
        script {
            name          = "Lint"
            scriptContent = """
                START=$(date +%s%3N)
                pnpm run lint
                END=$(date +%s%3N)
                echo "##teamcity[buildStatisticValue key='lintMs' value='$((END - START))']"
            """.trimIndent()
        }
    }
})

object TypeCheck : BuildType({
    name = "TypeCheck"

    vcs { root(StashVcsRoot) }
    dependencies {
        snapshot(Install) { onDependencyFailure = FailureAction.FAIL_TO_START }
        artifacts(Install) {
            buildRule = lastSuccessful()
            artifactRules = "node_modules.zip!** => node_modules"
        }
    }

    steps {
        script {
            name          = "Enable pnpm"
            scriptContent = "corepack enable && corepack prepare pnpm@latest --activate"
        }
        script {
            name          = "Typecheck (if configured)"
            scriptContent = """
                if [ -n "%env.TYPECHECK_CMD%" ]; then
                  START=$(date +%s%3N)
                  %env.TYPECHECK_CMD%
                  END=$(date +%s%3N)
                  echo "##teamcity[buildStatisticValue key='typecheckMs' value='$((END - START))']"
                else
                  echo "##teamcity[message text='TYPECHECK_CMD not set; skipping.' status='WARNING']"
                fi
            """.trimIndent()
        }
    }
})

object UnitTests : BuildType({
    name = "Unit Tests"

    vcs { root(StashVcsRoot) }
    dependencies {
        snapshot(Lint)      { onDependencyFailure = FailureAction.FAIL_TO_START }
        snapshot(TypeCheck) { onDependencyFailure = FailureAction.CANCEL }
        artifacts(Install) {
            buildRule = lastSuccessful()
            artifactRules = "node_modules.zip!** => node_modules"
        }
    }

    steps {
        script {
            name          = "Enable pnpm"
            scriptContent = "corepack enable && corepack prepare pnpm@latest --activate"
        }
        script {
            name          = "Run unit tests"
            scriptContent = """
                pnpm test -- --reporter=junit --outputFile=test-results/unit.xml
            """.trimIndent()
        }
    }

    // Publish JUnit XML for TC test report tab
    artifactRules   = "test-results/ => test-results.zip"
    features {
        feature {
            type   = "xml-report-plugin"
            param("xmlReportParsing.reportType", "junit")
            param("xmlReportParsing.reportDirs",  "test-results/unit.xml")
        }
        perfmon {}
    }
})

object ProductionBuild : BuildType({
    name = "Production Build"

    vcs { root(StashVcsRoot) }
    dependencies {
        snapshot(UnitTests) { onDependencyFailure = FailureAction.FAIL_TO_START }
        artifacts(Install) {
            buildRule = lastSuccessful()
            artifactRules = "node_modules.zip!** => node_modules"
        }
    }

    steps {
        script {
            name          = "Enable pnpm"
            scriptContent = "corepack enable && corepack prepare pnpm@latest --activate"
        }
        script {
            name          = "Clean build + size stats"
            scriptContent = """
                rm -rf .next dist out build
                START=$(date +%s%3N)
                pnpm run build
                END=$(date +%s%3N)
                echo "##teamcity[buildStatisticValue key='cleanBuildMs' value='$((END - START))']"

                JS=$(find .next dist out build -name "*.js" ! -name "*.map" -type f -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo 0)
                CSS=$(find .next dist out build -name "*.css" ! -name "*.map" -type f -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo 0)
                ART=$(du -sb .next dist out build 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo 0)
                echo "##teamcity[buildStatisticValue key='jsBundleBytes' value='$JS']"
                echo "##teamcity[buildStatisticValue key='cssBundleBytes' value='$CSS']"
                echo "##teamcity[buildStatisticValue key='artifactBytes' value='$ART']"

                # Incremental build timing
                touch src/lib/note-filters.ts
                START2=$(date +%s%3N)
                pnpm run build
                END2=$(date +%s%3N)
                echo "##teamcity[buildStatisticValue key='incrementalBuildMs' value='$((END2 - START2))']"
            """.trimIndent()
        }
    }

    artifactRules = ".next/** => build-output.zip"
})

object E2EPlaywright : BuildType({
    name = "E2E — Playwright"

    vcs { root(StashVcsRoot) }
    dependencies {
        snapshot(ProductionBuild) { onDependencyFailure = FailureAction.FAIL_TO_START }
        artifacts(Install) {
            buildRule = lastSuccessful()
            artifactRules = "node_modules.zip!** => node_modules"
        }
        artifacts(ProductionBuild) {
            buildRule = lastSuccessful()
            artifactRules = "build-output.zip!** => .next"
        }
    }

    requirements {
        // Require an agent with a Playwright-capable browser installed
        contains("teamcity.agent.jvm.os.name", "Linux")
    }

    steps {
        script {
            name          = "Enable pnpm"
            scriptContent = "corepack enable && corepack prepare pnpm@latest --activate"
        }
        script {
            name          = "Install Playwright browsers"
            scriptContent = "npx playwright install --with-deps chromium firefox"
        }
        script {
            name          = "Start app server"
            scriptContent = "nohup pnpm start > /tmp/next-server.log 2>&1 &"
        }
        script {
            name          = "Wait for server"
            scriptContent = "npx wait-on http://localhost:3000 --timeout 60000"
        }
        script {
            name          = "Run Playwright"
            scriptContent = """
                BASE_URL=http://localhost:3000 PLAYWRIGHT_CI=1 \
                  npx playwright test --reporter=junit,list \
                    2>&1 | tee playwright-output.log
            """.trimIndent()
        }
    }

    artifactRules = """
        playwright-report/ => playwright-report.zip
        playwright-results/ => playwright-results.zip
    """.trimIndent()

    features {
        feature {
            type   = "xml-report-plugin"
            param("xmlReportParsing.reportType", "junit")
            param("xmlReportParsing.reportDirs",  "playwright-results/results.xml")
        }
    }
})

object E2ECypress : BuildType({
    name = "E2E — Cypress"

    // This build is disabled by default; enable for variants where
    // env.E2E_RUNNER = "cypress".
    enabled = false

    vcs { root(StashVcsRoot) }
    dependencies {
        snapshot(ProductionBuild) { onDependencyFailure = FailureAction.FAIL_TO_START }
        artifacts(Install) {
            buildRule = lastSuccessful()
            artifactRules = "node_modules.zip!** => node_modules"
        }
        artifacts(ProductionBuild) {
            buildRule = lastSuccessful()
            artifactRules = "build-output.zip!** => .next"
        }
    }

    steps {
        script {
            name          = "Enable pnpm"
            scriptContent = "corepack enable && corepack prepare pnpm@latest --activate"
        }
        script {
            name          = "Start app server"
            scriptContent = "nohup pnpm start > /tmp/next-server.log 2>&1 &"
        }
        script {
            name          = "Wait for server"
            scriptContent = "npx wait-on http://localhost:3000 --timeout 60000"
        }
        script {
            name          = "Run Cypress"
            scriptContent = """
                npx cypress run \
                  --reporter junit \
                  --reporter-options "mochaFile=cypress-results/results.xml"
            """.trimIndent()
        }
    }

    artifactRules = "cypress-results/ => cypress-results.zip"

    features {
        feature {
            type   = "xml-report-plugin"
            param("xmlReportParsing.reportType", "junit")
            param("xmlReportParsing.reportDirs",  "cypress-results/results.xml")
        }
    }
})

object Metrics : BuildType({
    name = "Metrics Collection"
    description = "Aggregates stats from previous stages and writes the variant result JSON"

    vcs { root(StashVcsRoot) }
    dependencies {
        snapshot(E2EPlaywright) { onDependencyFailure = FailureAction.IGNORE }
        snapshot(E2ECypress)    { onDependencyFailure = FailureAction.IGNORE }
    }

    steps {
        script {
            name          = "Write metrics JSON"
            scriptContent = """
                mkdir -p toolchain/metrics/results
                VARIANT_ID="%env.VARIANT_ID%"
                MEASURED_AT=$(node -e "process.stdout.write(new Date().toISOString())")
                cat > "toolchain/metrics/results/${VARIANT_ID}.json" << EOF
                {
                  "variantId": "${VARIANT_ID}",
                  "measuredAt": "$MEASURED_AT",
                  "ciHost": "teamcity",
                  "buildId": "%teamcity.build.id%",
                  "toolVersions": {
                    "node": "$(node --version)",
                    "pnpm": "$(pnpm --version 2>/dev/null || echo '')"
                  }
                }
                EOF
                echo "##teamcity[publishArtifacts 'toolchain/metrics/results/${VARIANT_ID}.json']"
            """.trimIndent()
        }
    }

    // Store the result JSON in TeamCity artifact storage for report aggregation
    artifactRules = "toolchain/metrics/results/ => metrics.zip"
})
