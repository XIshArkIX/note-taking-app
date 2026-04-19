# Run lint, typecheck, and build for every note-taking-app variant.
# Package manager is taken from the first path segment of each variant directory
# (bun | npm | pnpm | yarn).

REPO_ROOT := $(abspath $(dir $(firstword $(MAKEFILE_LIST))))
VARIANTS_DIR := $(REPO_ROOT)/variants

VARIANTS := \
	bun-none-nextjs-vitest-playwright \
	npm-lerna-tsup-vitest-playwright \
	npm-none-nextjs-vitest-playwright \
	pnpm-none-nextjs-jest-playwright \
	pnpm-none-nextjs-vitest-playwright \
	pnpm-none-vite-nodetest-playwright \
	pnpm-none-vite-vitest-cypress \
	pnpm-none-vite-vitest-playwright \
	pnpm-nx-rollup-vitest-playwright \
	pnpm-turborepo-rolldown-vitest-playwright \
	pnpm-turborepo-swc-vitest-playwright \
	pnpm-turborepo-tsup-vitest-playwright \
	yarn-none-nextjs-vitest-playwright

variant-pm = $(word 1,$(subst -, ,$(1)))
variant-run = $(if $(filter bun,$(call variant-pm,$(1))),bun run,$(if $(filter npm,$(call variant-pm,$(1))),npm run,$(if $(filter pnpm,$(call variant-pm,$(1))),pnpm run,yarn run)))

define VARIANT_RULES
.PHONY: $(1) $(1)-lint $(1)-typecheck $(1)-build

$(1)-lint:
	cd $(VARIANTS_DIR)/$(1) && $(call variant-run,$(1)) lint

$(1)-typecheck: $(1)-lint
	cd $(VARIANTS_DIR)/$(1) && $(call variant-run,$(1)) typecheck

$(1)-build: $(1)-typecheck
	cd $(VARIANTS_DIR)/$(1) && $(call variant-run,$(1)) build

$(1): $(1)-build
endef

$(foreach v,$(VARIANTS),$(eval $(call VARIANT_RULES,$(v))))

.PHONY: all check-all
all: check-all
check-all: $(VARIANTS)
