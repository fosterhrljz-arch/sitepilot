# SitePilot V1.1 methodology

## Evidence comes before scores

The model separates user-reported observations, user estimates, mapped observations and calculated financial scenarios. SitePilot does not independently verify user evidence. Every field observation requires a valid calendar date, a source / method and the same catchment radius as the project. A business-specific demand measure is mandatory for a scenario leader; POI counts never stand in for population, pedestrian flow, purchasing power or sales.

The six criteria are demand, relevant destinations, premises suitability, demand–competition fit, rent affordability and financial headroom. Their business-specific definitions are in `src/core/profiles.mjs`. Shared IDs support comparison and AHP, but the input variables and formulas differ by business.

## Business-specific location scores

Default weights are 25%, 15%, 15%, 10%, 15% and 20%, respectively. They are editable preferences rather than empirically calibrated market parameters.

| Business | Demand rate and default target | Destinations and target | Premises score |
|---|---|---|---|
| Coffee | Morning count × 60 / observation minutes; target 300/hour | Offices / universities / coworking; 8 | 70% transit proximity + 30% step-free entry |
| Restaurant | Meal-time count × 60 / observation minutes; target 200/hour | Hotels / cinemas / theatres / bars; 6 | 50 each for extraction permission and delivery access |
| Fruit | Documented occupied households; target 600 | Markets / bakeries / butchers; 5 | 50 each for cold storage and unloading access |
| Convenience | Count during planned hours × 60 / minutes; target 400/hour | Schools / offices / bus stops; 10 | 50 each for permitted hours and replenishment |
| Beauty | Qualified local inquiries × 30 / research days; target 60/30 days | Fitness / clothing / pharmacies; 8 | 50 each for privacy and required plumbing |
| Custom | Qualified local inquiries × 30 / research days; target 100/30 days | Independently defined destinations; 8 | 50 each for permitted use and essential premises fit |

Demand score = `clamp(100 × measured rate / target, 0, 100)`. Destination score = `clamp(100 × count / target, 0, 100)`. Coffee transit proximity is `clamp(100 − distance_m / 10, 0, 100)`. Both premises inputs are required; an unknown answer stays unknown. A recorded “No” is an unmet requirement and blocks a preferred-location recommendation for that site even if other scores are high. Thresholds and field classification should be adapted to the proposed concept and local conditions.

Observational samples can be biased by timing, weather, events, seasonality and recruitment. Inquiry normalization assumes the sampled period is representative; it is not a sales conversion model. Household counts require a documented external source or survey. Other fields do not establish legal permission on their own; the user must verify it.

## Competition requires context

Catchment area = `π × (radius_m / 1000)²`. Density = usable competitor count / catchment area.

```text
competition_fit = demand_score × (0.4 + 0.6 × destination_score / 100)
                  / (1 + max(0, density − density_threshold) / density_threshold)
```

The default density threshold is 8/km². It is an editable assumption, not a validated saturation threshold. No extra points are awarded for reducing competitors below that threshold. Weak demand yields weak fit even when no competitors are independently observed. Missing demand, destinations or competitor counts produces no score.

OSM categories are approximate: supermarkets can compete with fruit or convenience shops; hairdressers may be only partially relevant to a beauty concept. Counted map features are not necessarily distinct trading businesses. Features are de-duplicated by OSM type / ID, but node/building representations or shared premises can still overlap. Field verification remains necessary. Custom businesses require independently defined destination and competitor counts; there is no automatic category match.

## Open observations and licensing

OSM / Photon coordinates retain source and ODbL attribution. Bounded Overpass queries return mapped competitors, relevant destinations, transit stops and parking; counts are matched against each profile. Buildings may use an OSM center point for display. A geographic circle does not model travel time, roads, crossings, rivers or access barriers.

Context scores may use OSM counts only when the query matches the candidate's independent WGS84 pin, business and radius, is less than 24 hours old, has no partial-response error, and is below the 300-feature cap. Empty responses do not establish absence and remain unscored. Positive returned matches still form an incomplete mapped sample, not a verified census. Nearby transit / parking counts are contextual observations; coffee access uses an independently entered distance and entrance check.

Google / Amap POIs are discovery content shown on the corresponding provider map, not a source for portable derived analytics. Google place coordinates have a fixed maximum 30-day local cache and do not appear on the open map. Amap content is session-only. See README for storage / export policy and provider references.

## Financial calculations

Inputs use one reporting currency. There is no exchange-rate conversion. “Other fixed costs” should include wages, utilities, insurance and other monthly fixed commitments; exclude rent and variable costs already represented in the contribution margin.

```text
fixed_costs       = rent × (1 + rent_change_pct / 100) + other_fixed_costs
margin_ratio      = contribution_margin_pct / 100
break_even_sales  = fixed_costs / margin_ratio
break_even_orders = break_even_sales / average_transaction_value
orders_per_day    = break_even_orders / trading_days
assumed_sales     = assumed_daily_orders × ticket × trading_days × (1 + sales_change_pct / 100)
operating_profit  = assumed_sales × margin_ratio − fixed_costs
margin_of_safety  = (assumed_sales − break_even_sales) / assumed_sales
payback_months    = setup_investment / positive_operating_profit
loss_runway       = available_cash_reserve / monthly_operating_loss
```

The displayed daily break-even transaction requirement is rounded upward to a whole transaction; calculations retain full precision. Currency displays use up to two decimal places. Unentered daily sales keeps revenue, profit, headroom and payback unknown; zero daily sales is an explicit loss scenario. Zero sales with zero fixed costs gives zero safety margin. Invalid or non-finite inputs yield explanations, not numeric outputs. Margin must be greater than zero and no more than 100%; trading days must be an integer from 1–31.

Setup recovery is excluded from operating break-even. Tax, financing, owner compensation, depreciation and working-capital movements are excluded unless explicitly represented in inputs. Fruit spoilage, restaurant food waste, card fees, sales commissions and similar variable costs belong in contribution margin. The model is a steady monthly scenario; it does not predict seasonality or cash timing.

Rent affordability = `min(100, preferred_rent_budget / scenario_rent × 100)`; zero rent scores 100. Financial headroom = `clamp(50 + 100 × safety_margin, 0, 100)`. A personal rent budget is not a market benchmark.

## Comparison and recommendation gates

For each candidate, an available-evidence score divides the weighted sum of supplied criteria by their supplied weights. Its coverage is supplied weight / total weight. This individual score must not be compared to another candidate using different criteria.

Comparison uses the intersection of known criteria across all candidates. Every shared score therefore uses the same denominator:

```text
shared_score = sum(shared criterion score × weight) / sum(shared weights)
lower_bound  = sum(shared criterion score × weight) / total_weight
upper_bound  = (sum(shared criterion score × weight) + 100 × missing_weight) / total_weight
```

Bounds assign unknown criteria the full 0–100 range. They are not probabilities or confidence intervals. A provisional leader requires 3–5 sites, at least 70% shared weighted coverage, demand and financial scenarios for every site, positive assumed profit and no recorded unmet premises requirement for the top-scoring site. A top difference below 2 points is a tie. If the highest score fails a gate, no second-best site is silently promoted. Overlapping bounds warn that missing evidence could change the order.

Financial assumptions and location estimates remain unverified even at 100% model coverage. A complete model is not complete due diligence. Reports show assumptions, sources, candidate advantages / risks, missing fields and downside scenarios. The ±20% report stress tests use saved base inputs; comparison sliders are temporary.

## Preferences and AHP

Direct weights are normalized to 100%. AHP uses a positive reciprocal matrix and power iteration for priorities, then the conventional consistency ratio. The UI requires a ratio at or below 0.10 before applying AHP results. Consistency is not proof that the preferences or model are correct. Revisit weights and thresholds as evidence improves.
