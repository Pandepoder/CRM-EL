# Database scripts

Canonical schema changes live in `db/migrations/*.sql` and are applied by:

```bash
pnpm db:migrate
```

Do not use one-off alter scripts for environments that track `schema_migrations`.
Ad-hoc helpers under `scripts/db/` are for local repair only.
