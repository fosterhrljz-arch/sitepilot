# SitePilot V1.1 verification

Verified on Windows x64 with Node.js 24.16.0, the installed Chrome browser, and the production Vite build. Test date: November 12, 2026 local time (November 13 UTC).

## Automated checks

- **44 core and local-server tests passed.** Covers financial arithmetic, missing sales versus zero sales, invalid / non-finite inputs, contribution margin, payback / runway, scenarios, business-specific criteria, competition context, recommendation gates, AHP, coordinate systems, migration, coordinate roundtrips, Google expiry, provider isolation, corrupt-storage recovery, report escaping / CSV formula protection, bounded Overpass normalization, Host / Origin / cross-site checks, token-protected Amap setup, static file boundaries and HEAD behavior.
- **6 browser workflows passed.** Google and Amap SDK contracts / connection tests; discovery content isolation and credential lifecycle; no-key map; five independent candidate pins; zoom / selection / drag interactions; persistence and JSON import; accurate financial entry; blank versus zero sales; scenarios; AHP; HTML / CSV downloads; standalone report rendering and print mode; optional open-data connection; empty results / stale catchment / network failures; business-specific fruit-shop fields; invalid imports; mobile navigation and horizontal-overflow checks.
- **Production build passed.** Source, lazy pages, provider adapters and Leaflet CSS compile successfully.

Browser tests use synthetic Google / Amap SDK fixtures and mocked map tiles. They test application integration contracts, not live provider billing, credentials, geospatial coverage or service availability. Automated tile tests do not contact public tile servers or force tile downloads by panning / zooming.

## Windows launcher check

The compiled GUI launcher was started directly from SitePilot.exe, with no terminal needed by the user. It launched the bundled runtime/node.exe, and the local health endpoint returned `{"app":"SitePilot","version":"1.1.0"}`. The launcher uses a single-instance check and a notification-area lifecycle. The packaging script uses built-in .NET ZIP support without changing PowerShell execution policy.

## Live-service and visual checks

- Real OpenStreetMap tiles loaded in normal Chrome views with visible attribution. Home and Map Explorer screenshots in `docs/screenshots` show the actual running UI.
- A real Photon lookup for Denver Union Station returned HTTP 200 and six results.
- A bounded 500 m Overpass request from this environment timed out after the configured deadline. A tiny request to the alternative community endpoint also timed out. The app returned an explicit failure and retained saved inputs. **Live neighborhood counts were not verified in this environment.** Do not mistake fixture counts for live-service verification.
- Live Google / Amap requests were **not** tested because no user credentials were supplied. Their Settings tests and discovery flows were verified using clearly labeled synthetic SDK contracts.
- Actual desktop screenshots were inspected at 1536 × 1024; mobile report at 390 × 844. Home, map, settings, analysis, comparison and report were checked for hierarchy, readability, source labels, attribution and missing-data behavior.
- Downloaded HTML was opened independently and checked in print mode. PDF export uses the browser's Print / Save PDF workflow; no separate PDF engine is bundled.

## Design fidelity ledger

The V1.1 concept is `docs/design-v1.1.png`. The application keeps the existing teal / white SitePilot system, fixed sidebar, quiet gray workspace, title / action bar, dominant map, candidate panel, and a horizontal evidence → costs → comparison action panel. Real map tiles replace the concept's illustrative geography. The report and comparison retain the existing professional chart and table structure.

Intentional differences: the production sidebar retains the existing compact wordmark; map zoom controls are at the bottom left to avoid the search overlay; a real provider dropdown and coordinate / storage status replace decorative labels; Settings includes bounded service choices and explicit connection tests; missing-data, licensing and source explanations occupy functional panels below the primary map. No generated image is used as map content or as a substitute for actual application screenshots.

## Issues caught and fixed during verification

- V1.0 discarded provider coordinates and required an API key before map browsing. V1.1 defaults to the open map, preserves independent pins, and clearly manages restricted provider lifecycles.
- Generic criteria and monotonic competition rewards were replaced with business-specific measures and demand-dependent market fit.
- Rapid zoom then candidate selection could ignore the new center while an old map animation was active. Candidate centering / fit now uses deterministic view updates; the five-pin drag / restore regression passes.
- Delayed search responses could outlive their provider view. Requests are now generation-checked so results cannot cross into a different provider map.
- Non-finite optional values and scenarios could slip through financial assumptions. These now produce validation errors.
- Corrupt browser storage could be overwritten after starting a new project. A recovery copy is made before replacement.
- Independent field evidence now needs reconfirmation after an independent pin moves.

## Practical limits

Public geocoding, tiles and Overpass services have no SLA and can be blocked or unavailable on a particular network. Amap availability, English source names, regional coordinate alignment and provider key restrictions depend on the service. Google coordinates expire; Amap raw content is not persisted. V1.0 pins that were already discarded cannot be reconstructed without re-selection / a saved Google place refresh.

The model has no population dataset, sales forecast, travel-time routing, success probability, lease / permit verification or independent validation of user observations. Settings targets and weights are transparent planning assumptions. OSM feature counts can be incomplete, misclassified or duplicated across different OSM representations. Every recommendation remains provisional.

## Reproduce

Run `npm ci`, `npm run build`, `npm test`, and `npm run test:e2e` from a source checkout. Chrome is required for the browser suite. Do not use automated map panning against the public tile service. `scripts/capture-screenshots.mjs` is a manual documentation-capture script that opens ordinary map views, then captures explicitly synthetic financial examples.
