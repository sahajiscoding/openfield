# Supabase migrations

Migration filenames are part of Supabase's migration history. The version prefix must match the version recorded by the target database.

## Rules

1. Never rename, renumber, or reuse an applied migration.
2. Keep every migration that exists in the remote migration history in this directory.
3. Legacy migrations `001`–`004` are preserved because they are already part of the Openfield history.
4. Every new migration must use a **14-digit UTC timestamp** prefix, for example `20260918120000_add_something.sql`.
5. If a migration was applied to Supabase with a different filename/version, do not create a second copy with a new version. Restore the exact remote version in this directory instead.
6. Before merging schema changes, verify that the Supabase migration history and this directory contain the same versions.

The timestamped UroPay and billing-hardening files intentionally match the versions already recorded by the Openfield Supabase project.
