# Phase 0 online baseline

## Migration reference

- **Baseline tag:** `pre-main-migration-2026-09-08`
- **Baseline commit:** `1397eae64b8bd457a68d4797001e7633164b4386`
- **Live URL:** `https://narr8ai.github.io/vocab-app/`
- **UI source branch:** `origin/gh-pages@1397eae`
- **Workflow source branch:** `main` (`.github/workflows/deploy.yml`)

`index.html` is restored from the live `gh-pages` baseline. The Pages workflow remains the version already present on the `main`-based source branch. `flowchart.html` was compared separately and is byte-identical between the two sources, so it remains unchanged.

## Rollback

If this migration must be undone after it is committed, run:

```sh
git revert <migration-commit>
```

The baseline tag above preserves the prior online prototype for inspection or recovery.
