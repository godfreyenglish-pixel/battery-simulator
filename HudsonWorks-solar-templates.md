# HudsonWorks contract templates: Solar Only and Solar + Battery

You already have **Energy Storage Only - Rate Switch**. Build these two the same way: in HudsonWorks, duplicate that battery template, rename it, and swap the three sections below (System Description, the production/backup block, and Pricing). Everything else in the battery template (Contractor/Customer info, Contractor & Customer Responsibilities, Change Orders, Warranty Package, Payment Schedule, Signatures) carries over unchanged unless noted.

The auto-flow email already sends the matching content per product, so what you build here should mirror what the "Ready to contract" email hands you.

Keep the dynamic placeholders (Customer Name, Customer Address, Date Signed, contractor signature) exactly as they are in the battery template. Only the System Description and Pricing rows are static text you fill.

---

## 1) Template name: `Solar Only`

**Title:** Residential Solar Installation Agreement

**Heading line:** Prepared by Rivertown Solar LLC

### 1. System Description

| Component | Description |
|---|---|
| Solar Panels | Talesun ([__] kW system) |
| Microinverters | Enphase IQ |
| Racking | IronRidge |
| Monitoring | Enphase |
| Estimated Offset | ~[__]% of annual usage |

*(No battery, backup, or critical-load rows on a solar-only job.)*

### Production note (replaces the battery "Estimated Backup Capability" block)

Estimated first-year production and offset are modeled from your utility usage and roof design. Final production is confirmed at the post-signing engineering site survey. Solar production varies year to year with weather.

### Services Provided (adjust the battery list)

Keep: Site assessment and system design, obtaining utility/building/electrical permits, securing applicable incentives, installing the system, testing system functionality, handling interconnection. **Remove** the "Rate switching" line (that is battery/TOU-specific).

### Pricing

| | |
|---|---|
| Total System Cost | $[gross] |
| Incentives (est., from proposal) | -$[incentive] |
| NYS Solar Tax Credit (25%, up to $5,000) | Customer claims on their taxes (not deducted here) |
| Net Cost to Customer | $[net] (amount the Customer is responsible for) |

> Confirm the incentive treatment with Eric/finance before first use. Federal residential solar credit (25D) ended 12/31/2025, so there is no federal ITC line in 2026. NY-Sun is typically taken by the installer and already reflected in the price; the NYS 25% credit is a credit the customer claims, not a price deduction.

---

## 2) Template name: `Solar + Battery`

**Title:** Residential Solar and Energy Storage Installation Agreement

**Heading line:** Prepared by Rivertown Solar LLC

### 1. System Description

| Component | Description |
|---|---|
| Solar Panels | Talesun ([__] kW system) |
| Microinverters | Enphase IQ |
| Racking | IronRidge |
| Monitoring | Enphase |
| Estimated Offset | ~[__]% of annual usage |
| Battery Type | Enphase IQ Battery 10C (lithium iron phosphate) |
| Battery Quantity | [__] units |
| Estimated Capacity | ~[__] kWh usable |
| Critical Load Panel | Included. Protected loads subpanel wired to the essential circuits. |

### Estimated Backup Capability (keep this block from the battery template)

At full charge, approximately [__] hours on essential loads (planning estimate, confirmed at site survey). Essential circuits finalized at the post-signing engineering site survey.

### Services Provided

Keep the full battery list, including permits and interconnection. Keep "Rate switching" only if this client is also switching to the Con Ed TOU rate; drop it if they are staying flat.

### Pricing

| | |
|---|---|
| Total System Cost | $[gross] |
| Incentives (est., from proposal) | -$[incentive] |
| NYS Solar Tax Credit (25%, up to $5,000) | Customer claims on their taxes (not deducted here) |
| Net Cost to Customer | $[net] (amount the Customer is responsible for) |

> Same incentive caveat as Solar Only. The NYSERDA storage incentive may also apply to the battery portion; confirm how it is split/shown with Eric.

---

## How the auto-flow feeds these

When a client authorizes the site survey, the "Ready to contract" email now arrives with:
- **Template:** the exact name above (Solar Only / Solar + Battery / Energy Storage Only - Rate Switch)
- **Contract name, price, scope line**
- **System Description** as a copy-paste table matching the rows above
- **Pricing** as a copy-paste table

So the email does the filling; these templates just need to exist in HudsonWorks with the right structure so the pasted tables land in the right place.
