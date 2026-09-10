# MT-17 Pilot Schema Freeze Evidence

**Date:** 2026-09-10  
**Status:** Policy gate implemented; pilot not yet started

`validate-migration-compatibility.mjs` now supports `PILOT_SCHEMA_FREEZE=true`.
While enabled, destructive migration SQL fails closed. The only exception is
an explicit `PILOT_SCHEMA_OVERRIDE=true` with a 20+ character
`PILOT_SCHEMA_OVERRIDE_REASON`; the migration must still carry the required
`-- FERIO: CONTRACT` marker.

This protects a future controlled pilot without pretending that real businesses
or pilot infrastructure are already active. The pilot selection, onboarding,
domains, provider configuration, monitoring, and feedback gates remain open.
