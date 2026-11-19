# Changes in SitePilot 1.1

- Kept the existing React application, navigation, financial engine, reports and Windows launcher; refined the workflow and visual system.
- Added immediately usable Leaflet / OpenStreetMap browsing, explicit Photon address search, independent coordinates, draggable candidate pins, fit-to-candidates and user-triggered geolocation.
- Moved optional services and credentials into Settings with instructions and explicit SDK / search connection tests.
- Added bounded, attributed OpenStreetMap neighborhood queries with a manual community-service choice, timeouts, throttling and bounded caching.
- Fixed permanent independent-pin persistence. Added versioned project migration, corrupt-workspace recovery, fixed Google coordinate expiry, provider-isolated map display and portable exports.
- Replaced generic weight-only differentiation with genuinely distinct business demand and premises criteria.
- Replaced the fewer-competitors-is-better formula with a demand- and destination-dependent competition model.
- Added provenance and calculation explanations, stronger shared-evidence recommendation gates, uncertainty bounds and premises risk gates.
- Improved numerical validation, preserved missing sales as unknown, and displayed currency precision without rounding intermediate calculations.
- Updated responsive dashboard styling, print / HTML / CSV reports, source packaging, documentation and real application screenshots.
- Added regression coverage for five-pin workflows, restoration, map zoom / selection races, open-data gaps, network failures, business fields and provider content isolation.

## Compatibility

V1.0 projects migrate in place using the existing storage key. Costs and valid independent evidence remain. Previously discarded coordinates cannot be reconstructed. New criteria need new business-specific evidence; old generic amenity counts are not reinterpreted as demand or relevant destinations.
