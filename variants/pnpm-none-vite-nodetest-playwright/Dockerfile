# Full pipeline for Vite + node:test (minimal UI shell). Build from repo root:
#   docker build -f variants/pnpm-none-vite-nodetest-playwright/Dockerfile -t note-taking-app/pnpm-none-vite-nodetest-playwright:pipeline .

FROM node:22-bookworm-slim

ENV CI=true \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    VARIANT=pnpm-none-vite-nodetest-playwright \
    PIPELINE_ARTIFACTS_DIR=/pipeline-artifacts \
    PIPELINE_BUILD_DIR=dist

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY variants/shared/scripts/docker-pipeline.sh /usr/local/bin/docker-pipeline
COPY variants/shared/scripts/bundle-stats.mjs /usr/local/lib/bundle-stats.mjs
RUN chmod +x /usr/local/bin/docker-pipeline

COPY variants/shared/docker/vite-pipeline-skeleton/ /app/
COPY variants/pnpm-none-vite-nodetest-playwright/ /app/

COPY biome.json /app/biome.json

RUN pnpm pkg set scripts.typecheck="tsc --noEmit -p tsconfig.app.json"

RUN docker-pipeline

LABEL pipeline.artifacts=/pipeline-artifacts

CMD ["sh", "-c", "ls -la /pipeline-artifacts && echo && cat /pipeline-artifacts/pipeline-summary.txt"]
