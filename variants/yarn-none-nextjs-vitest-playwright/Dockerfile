# Full pipeline: install → lint → typecheck → build. Build from repo root:
#   docker build -f variants/yarn-none-nextjs-vitest-playwright/Dockerfile -t note-taking-app/yarn-none-nextjs-vitest-playwright:pipeline .

FROM node:22-bookworm-slim

ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    VARIANT=yarn-none-nextjs-vitest-playwright \
    PIPELINE_ARTIFACTS_DIR=/pipeline-artifacts

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY variants/shared/scripts/docker-pipeline.sh /usr/local/bin/docker-pipeline
COPY variants/shared/scripts/bundle-stats.mjs /usr/local/lib/bundle-stats.mjs
RUN chmod +x /usr/local/bin/docker-pipeline

COPY variants/yarn-none-nextjs-vitest-playwright/ /app/

COPY src /app/src
COPY public /app/public
COPY next.config.ts postcss.config.mjs tsconfig.json biome.json vitest.config.ts playwright.config.ts /app/
COPY tests /app/tests
RUN printf '%s\n' '/// <reference types="next" />' > /app/next-env.d.ts

RUN docker-pipeline

LABEL pipeline.artifacts=/pipeline-artifacts

CMD ["sh", "-c", "ls -la /pipeline-artifacts && echo && cat /pipeline-artifacts/pipeline-summary.txt"]
