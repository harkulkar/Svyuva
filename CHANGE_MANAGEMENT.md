# Change management

Every production change should record:

- Change description
- Reason
- Affected modules
- Tests performed (`npm run lint`, unit/integration/e2e as applicable, `npm run build`)
- Deployment date
- Rollback method (`PRODUCTION_ROLLBACK_PLAN.md`)
- Responsible person (TODO: CONFIGURE)

## Path for major changes

development → staging → UAT → production

Do not edit production code on the server. Do not auto-deploy from CI (workflow has no production deploy job).

Template:

```
Change:
Reason:
Modules:
Tests:
Deployed:
Rollback:
Owner: TODO: CONFIGURE
```
