---
name: eero-versioning
description: "Apply Semantic Versioning (SemVer 2.0.0) to the eero Dashboard — package.json files, git tags, Docker image tags published to GHCR, and release notes. Use this skill when bumping versions, cutting releases, tagging Docker images, deciding MAJOR vs MINOR vs PATCH, writing CHANGELOG entries, or wiring CI to consume version tags. Triggers: release, bump version, semver, tag, changelog, docker tag, ghcr, version bump, cut release, v1, v2."
---

Govern all version numbers in the eero Dashboard so that humans and CI (`docker/metadata-action`) can derive predictable Docker tags from a single source of truth: an annotated git tag of the form `vMAJOR.MINOR.PATCH`.

## SemVer 2.0.0 — the rules

Given a version `MAJOR.MINOR.PATCH`:

- **MAJOR** — incompatible API changes, removed endpoints, breaking config/env changes, breaking UI workflow removals, or anything that forces users to change how they deploy or use the app.
- **MINOR** — backward-compatible new functionality (new feature tab, new endpoint, new optional config). Existing deployments keep working with no changes.
- **PATCH** — backward-compatible bug fixes, performance fixes, dependency security bumps, doc-only changes that ship in the image.

Pre-release: `1.4.0-rc.1`, `1.4.0-beta.2`. Build metadata: `1.4.0+sha.abc1234` (ignored for precedence).

Start at `0.y.z` while the public API is unstable. `0.y.z → 0.(y+1).z` may break. Promote to `1.0.0` once the API surface (REST endpoints + container env vars) is committed.

## Sources of truth in this repo

| Surface | Where | Who updates it |
| --- | --- | --- |
| Git tag `vX.Y.Z` | `git tag -a vX.Y.Z` on `main` | Release author (manual) |
| Docker tags on GHCR | `.github/workflows/docker-publish.yml` via `docker/metadata-action` | CI, derived from tag |
| `frontend/package.json` `version` | committed | Release author |
| Root `package.json` (currently no `version`) | optional — add only if you want to surface it | Release author |
| `CHANGELOG.md` (create at first release) | committed | Release author |
| `/api/health` response | backend reads version | optional follow-up |

The git tag is **canonical**. Everything else mirrors it.

## Bumping rules — quick decision table

| Change | Bump |
| --- | --- |
| Add new GET endpoint, new tab, new optional query param | MINOR |
| Remove or rename endpoint / change response shape | MAJOR |
| Change required env var name or default port | MAJOR |
| Fix a crash, fix wrong data, fix CSS regression | PATCH |
| Upgrade `eero-api` patch | PATCH |
| Upgrade `eero-api` minor with new behavior exposed in UI | MINOR |
| Upgrade `eero-api` major or React major | MAJOR (review carefully) |
| README / docs only, no image change | no bump needed; if shipped in image, PATCH |
| Refactor with no observable change | no bump |

When unsure between MINOR and PATCH, ask: "Could a user *use* something new after upgrading?" If yes → MINOR.

## Release procedure

Run from a clean `main` checkout.

```bash
# 1. Decide the next version (replace X.Y.Z)
NEW=1.4.0

# 2. Update frontend/package.json (and root package.json if it has a version field)
npm --prefix frontend version "$NEW" --no-git-tag-version

# 3. Update CHANGELOG.md — move "Unreleased" entries under "## [$NEW] - YYYY-MM-DD"

# 4. Commit
git add frontend/package.json CHANGELOG.md
git commit -m "chore(release): v$NEW"

# 5. Tag (annotated, signed if you sign tags)
git tag -a "v$NEW" -m "Release v$NEW"

# 6. Push commit + tag — this triggers docker-publish.yml
git push origin main
git push origin "v$NEW"
```

CI (`docker-publish.yml`) will publish, for a tag `v1.4.0`:

- `ghcr.io/xrvk/eero-dashboard:1.4.0`  (`{{version}}`)
- `ghcr.io/xrvk/eero-dashboard:1.4`    (`{{major}}.{{minor}}`)
- `ghcr.io/xrvk/eero-dashboard:sha-<sha>`
- `ghcr.io/xrvk/eero-dashboard:latest` (only on default-branch pushes)

Pre-releases (`v1.4.0-rc.1`) are published with the literal pre-release tag and **do not** move `latest` — `docker/metadata-action` excludes pre-releases from the major/minor floating tags by default.

## CHANGELOG format (Keep a Changelog + SemVer)

```markdown
# Changelog
All notable changes to this project will be documented in this file.
The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]
### Added
### Changed
### Fixed
### Removed

## [1.4.0] - 2026-05-23
### Added
- Guest network QR code download (#52)
### Fixed
- Speed test history pagination crash on empty data (#54)
```

## Docker pinning guidance for consumers

Document in README that users should pin one of:

- `:1.4.0` — fully reproducible, no automatic updates
- `:1.4` — automatic patch updates within the minor (recommended default)
- `:latest` — bleeding edge, may break across MAJOR bumps

Never recommend `:latest` for production.

## Common mistakes to avoid

- ❌ Bumping MAJOR for any user-visible change. MAJOR is only for **breaking** changes.
- ❌ Forgetting to push the tag (`git push origin vX.Y.Z`) — without it, no GHCR release tags are produced.
- ❌ Editing `frontend/package.json` version without tagging — the image won't reflect it.
- ❌ Re-tagging an existing version. Tags are immutable; bump PATCH instead.
- ❌ Using lightweight tags. Always `git tag -a` (annotated) so `git describe` and release notes work.
- ❌ Mixing semver with date-based or build-number tags on the same image stream.

## When asked "what version should this be?"

1. List the changes since the last tag: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`.
2. Classify each commit as breaking / feature / fix using the table above.
3. The highest class wins: any breaking → MAJOR; else any feature → MINOR; else PATCH.
4. Propose the version and the CHANGELOG entry; let the user confirm before tagging.
