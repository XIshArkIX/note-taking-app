// variants/npm-none-nextjs-vitest-playwright/ci-cd/teamcity.kts
// Stack: npm · no monorepo · Next.js/SWC · Vitest · Playwright
// VCS: Bitbucket Server (Stash)  — configure repo URL via STASH_REPO_URL param

import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.triggers.vcs
import jetbrains.buildServer.configs.kotlin.vcs.GitVcsRoot

version = "2024.03"

val VARIANT = "npm-none-nextjs-vitest-playwright"

project {
    vcsRoot(Stash)
    buildType(Install)
    buildType(Lint)
    buildType(Typecheck)
    buildType(Build)
    buildTypesOrder = arrayListOf(Install, Lint, Typecheck, Build)
}

object Stash : GitVcsRoot({
    name   = "Stash"
    url    = "%env.STASH_REPO_URL%"
    branch = "refs/heads/main"
    branchSpec = "+:refs/heads/*\n+:refs/pull-requests/*/from"
    authMethod = password {
        userName = "%env.STASH_USERNAME%"
        password = "%env.STASH_TOKEN%"
    }
})

object Install : BuildType({
    name = "Install"
    vcs { root(Stash) }
    steps {
        script {
            name = "npm ci + timing"
            scriptContent = """
                T0=${'$'}(date +%s%3N)
                npm ci
                DUR=$(( ${'$'}(date +%s%3N) - T0 ))
                echo "Install: ${'$'}{DUR}ms"
                echo "##teamcity[buildStatisticValue key='installMs' value='${'$'}{DUR}']"
            """.trimIndent()
        }
    }
    artifactRules = "node_modules/ => node_modules.zip"
})

object Lint : BuildType({
    name = "Lint"
    vcs { root(Stash) }
    dependencies {
        snapshot(Install) { onDependencyFailure = FailureAction.FAIL_TO_START }
        artifacts(Install) {
            buildRule = lastSuccessful()
            artifactRules = "node_modules.zip!** => node_modules"
        }
    }
    steps {
        script {
            name = "Lint + timing"
            scriptContent = """
                T0=${'$'}(date +%s%3N)
                npm run lint
                DUR=$(( ${'$'}(date +%s%3N) - T0 ))
                echo "Lint: ${'$'}{DUR}ms"
                echo "##teamcity[buildStatisticValue key='lintMs' value='${'$'}{DUR}']"
            """.trimIndent()
        }
    }
})

object Typecheck : BuildType({
    name = "Typecheck"
    vcs { root(Stash) }
    dependencies {
        snapshot(Install) { onDependencyFailure = FailureAction.FAIL_TO_START }
        artifacts(Install) {
            buildRule = lastSuccessful()
            artifactRules = "node_modules.zip!** => node_modules"
        }
    }
    steps {
        script {
            name = "tsc --noEmit + timing"
            scriptContent = """
                T0=${'$'}(date +%s%3N)
                npm run typecheck
                DUR=$(( ${'$'}(date +%s%3N) - T0 ))
                echo "Typecheck: ${'$'}{DUR}ms"
                echo "##teamcity[buildStatisticValue key='typecheckMs' value='${'$'}{DUR}']"
            """.trimIndent()
        }
    }
})

object Build : BuildType({
    name = "Build + Bundle Stats"
    vcs { root(Stash) }
    dependencies {
        snapshot(Lint)      { onDependencyFailure = FailureAction.FAIL_TO_START }
        snapshot(Typecheck) { onDependencyFailure = FailureAction.FAIL_TO_START }
        artifacts(Install) {
            buildRule = lastSuccessful()
            artifactRules = "node_modules.zip!** => node_modules"
        }
    }
    steps {
        script {
            name = "Build + timing"
            scriptContent = """
                T0=${'$'}(date +%s%3N)
                npm run build
                DUR=$(( ${'$'}(date +%s%3N) - T0 ))
                echo "Build: ${'$'}{DUR}ms"
                echo "##teamcity[buildStatisticValue key='buildMs' value='${'$'}{DUR}']"
                VARIANT="$VARIANT" BUILD_TIME=${'$'}{DUR} node scripts/bundle-stats.mjs
                JS=$(node -e "const r=require('./pipeline-report.json'); console.log(r.bundle.jsBundleKb)")
                CSS=$(node -e "const r=require('./pipeline-report.json'); console.log(r.bundle.cssBundleKb)")
                echo "##teamcity[buildStatisticValue key='jsBundleKb' value='${'$'}{JS}']"
                echo "##teamcity[buildStatisticValue key='cssBundleKb' value='${'$'}{CSS}']"
                echo "##teamcity[publishArtifacts 'pipeline-report.json']"
            """.trimIndent()
        }
    }
    artifactRules = "pipeline-report.json"
})
