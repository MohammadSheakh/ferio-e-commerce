# Ferio Project Progress 103

**Checkpoint date:** August 21, 2026  
**Milestone:** Retained-screen audit — Customer warranty submission and history  
**Status:** Signed-in customers can now verify delivered orders, select exact items, validate and upload evidence, submit claims, and review complete lifecycle history through a polished stepwise workflow.

## Delivered

### Evidence contract correction

- Corrected the warranty upload endpoint to return `imageUrl` and optional `publicId`, matching the claim-creation DTO instead of returning the incompatible generic `url` field.
- Added controller coverage proving uploaded Cloudinary results are translated into the claim evidence contract.
- Preserved the existing authenticated session proxy and exact same-origin mutation enforcement.

### Stepwise claim submission

- Replaced the compressed single-line page with a typed, maintainable customer workflow.
- Separates delivered-order verification from affected-item selection, issue details, evidence selection, upload, and claim creation.
- Uses immutable verified order references and exact order-item IDs when creating the claim.
- Clearly states that submission starts review and does not promise warranty coverage before product/brand policy evaluation.

### Evidence safeguards

- Validates one-to-five image count, JPG/PNG/WebP media types, and 5 MB per-file size before starting upload work.
- Shows selected filenames and keeps backend upload validation as the final authority.
- Displays verified order items with image, product, variant, SKU, and quantity context.
- Provides keyboard-visible focus for item selection, evidence input, and evidence image links.

### Customer claim history

- Surfaces claim reference, immutable product/order snapshots, issue description, evidence images, current status, rejection cause, and every append-only lifecycle entry.
- Uses sentence-case labels and semantic color only: amber for submitted attention, rose for rejection, emerald for repaired/resolved, and grayscale for work in progress.
- Uses Bangladesh timestamps and calm empty-history copy.

### Authentication and failure behavior

- Adds an explicit sign-in state that returns customers to the warranty page after authentication.
- Separates claim-history loading failures from order-verification/upload/submission failures.
- Adds retryable history loading while preserving already loaded claims.
- Adds direct order-history and account navigation plus success announcements.
- Adds a route-level skeleton matching verification and claim-history sections with reduced-motion-safe animation.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused warranty and staged-feature tests | Passed; 4 suites and 7 tests |
| Backend | Full unit suite | Passed; 59 suites and 207 tests |
| Backend | Nest production build | Passed |
| Customer Web | Warranty legacy-treatment and unsafe-type scan | Passed |
| Customer Web | Next.js production build and type validation | Passed; 61 routes generated |
| Workspace | `git diff --check` | Passed |

## Remaining Boundary

- Warranty duration plus brand/category/product coverage rules remain owner-required policy decisions.
- Cloudinary production credentials and evidence retention/deletion policy require deployment verification.
- Because upload and claim creation are separate external/database steps, cleanup of newly uploaded evidence after a later claim-creation failure remains a hardening task.
- Transactional warranty status notifications and optional pickup/return logistics remain separate policy-dependent work.
- Manual keyboard, screen-reader, constrained-network, touch, large-file, and real-image validation remain Slice 9 checks.
