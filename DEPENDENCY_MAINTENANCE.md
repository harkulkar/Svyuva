# Dependency maintenance

Review cadence: **monthly** (`OPERATIONS_RUNBOOK.md`).

Check:

- `npm audit --workspaces`
- Outdated packages (`npm outdated --workspaces`)
- Abandoned maintainers

Before upgrading (never automatically in production):

1. Run tests (`npm test` / `npm run test:unit` / `npm run test:integration` / `npm run test:e2e`)
2. Run `npm run build`
3. Verify authentication (login/logout/refresh)
4. Verify Excel upload on staging
5. Verify major admin/college workflows

Known remaining audit findings from Phase 9 (`xlsx`, Express/qs, Vitest esbuild, React Router 6) must not be force-fixed with `audit fix --force` without a product decision.
