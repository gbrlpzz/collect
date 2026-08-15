# Regola — vendored design-system snapshot (Apache-2.0)

This directory is a **vendored, self-contained copy** of the Regola design-system
primitives. It exists so this open-source repo builds and runs with **zero private
dependencies** — cloners never need access to the private Regola upstream.

- **Upstream (private, proprietary):** https://github.com/gbrlpzz/regola
- **License in this repo:** Apache-2.0 (as part of this repository)
- **Refresh command:** `regola-sync` from the Regola repo
  (`python scripts/sync_to_collect.py --target <this-repo>`)

Every file here carries a provenance header. **Do not edit files in this
directory expecting the change to persist:** improvements belong upstream in
`regola` and are synced back down with `regola-sync`.
