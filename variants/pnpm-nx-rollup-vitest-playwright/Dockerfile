# Full pipeline for Nx + Next workspace. Build from repo root:
#   docker build -f variants/pnpm-nx-rollup-vitest-playwright/Dockerfile -t note-taking-app/pnpm-nx-rollup-vitest-playwright:pipeline .

FROM node:22-bookworm-slim

ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
    NX_DAEMON=false \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    VARIANT=pnpm-nx-rollup-vitest-playwright \
    PIPELINE_ARTIFACTS_DIR=/pipeline-artifacts \
    PIPELINE_BUILD_DIR=apps/notes-app/.next

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY variants/shared/scripts/docker-pipeline.sh /usr/local/bin/docker-pipeline
COPY variants/shared/scripts/bundle-stats.mjs /usr/local/lib/bundle-stats.mjs
RUN chmod +x /usr/local/bin/docker-pipeline

COPY variants/pnpm-nx-rollup-vitest-playwright/ /app/

COPY variants/shared/docker/monorepo-notes-schema/tsconfig.json /app/packages/notes-schema/tsconfig.json

COPY variants/shared/docker/monorepo-notes-app/package.json /app/apps/notes-app/package.json

COPY src /app/apps/notes-app/src
COPY public /app/apps/notes-app/public
COPY next.config.ts postcss.config.mjs tsconfig.json vitest.config.ts playwright.config.ts /app/apps/notes-app/
COPY biome.json /app/biome.json
COPY tests /app/apps/notes-app/tests
RUN printf '%s\n' '/// <reference types="next" />' > /app/apps/notes-app/next-env.d.ts

RUN docker-pipeline

LABEL pipeline.artifacts=/pipeline-artifacts

CMD ["sh", "-c", "ls -la /pipeline-artifacts && echo && cat /pipeline-artifacts/pipeline-summary.txt"]
