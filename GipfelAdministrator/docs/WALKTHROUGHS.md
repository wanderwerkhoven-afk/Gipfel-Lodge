# Phase walkthroughs

## Phase 0 — foundation

Created the isolated npm-workspace, demo-only Firebase configuration, production guard, architecture, data model, security threat model, design language and roadmap. Verify with `npm run verify:phase0`.

## Phase 1 — design system and shell

Created the responsive React shell, forest navigation, mobile drawer, tenant/property selectors, search, cards, tables, status badges, forms, dialogs, empty states, toasts and internal design-system page. Verify with `npm run verify:phase1`.

## Phase 2 — tenant core

Added roles, tenant-aware audit types, scoped repositories, Firestore/Storage Rules and negative isolation tests. Verify with `npm run verify:phase2` when the official Firestore emulator binary is available.

## Phase 3 and 3B — reservations and guests

Added the ten-state transition machine, same-day changeover-safe overlap logic, reservation wizard, month calendar, guest CRM, duplicate detection and explicit GDPR anonymization workflow. Verify with `npm run verify:phase3b`.

## Phase 4 — finance

Added integer-cent payment status, protected payment/refund commands, refund ceiling and financial overview UI. Verify with `npm run verify:phase4`.

## Phase 5 — communication and operations

Added mock-only inbox/templates, cleaning/arrival/linen/maintenance tasks and operational day view. Verify with `npm run verify:phase5`.

## Phase 6 — rates

Added deterministic integer-cent pricing, season cards, tax/cleaning/pet/discount lines and immutable snapshot output. Verify with `npm run verify:phase6`.

## Phase 7 — website

Added NL/DE/EN content editing/preview and an allowlisted static exporter that rejects guest, reservation, admin and secret content. Verify with `npm run verify:phase7`.

## Phase 8 — SaaS preparation

Added multi-organization/property context, role simulation, subscription types and platform-safe architecture documentation. The complete twelve-step persisted onboarding backend remains production-readiness work. Verify the structural checkpoint with `npm run verify:phase8`.

## Phase 9 — integrations

Added `ChannelManagerProvider` and an inert planned Smoobu adapter with no credentials, jobs or network calls. Verify with `npm run verify:phase9`.

## Phase 10 — acceptance evidence

Node domain tests, TypeScript/Vite build and 8 desktop/mobile Chromium/Axe tests pass locally. The Firestore Rules suite is present but its official emulator JAR could not be downloaded in the current restricted network, so `GIPFELADMINISTRATOR LOCAL BUILD ACCEPTED` is deliberately not claimed yet.
