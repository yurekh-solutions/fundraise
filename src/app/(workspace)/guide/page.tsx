import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { Card, Notice, PageHeader, Table } from "@/components/ui";
const glossary = [
  [
    "Pre-money equity valuation (P)",
    "The company’s equity value before new primary investment. It is not enterprise value.",
  ],
  [
    "Post-money equity valuation (M)",
    "Pre-money equity value plus gross primary investment: M = P + I.",
  ],
  [
    "Primary investment (I)",
    "New investor cash paid into the company in exchange for newly issued shares.",
  ],
  [
    "Secondary sale",
    "An existing holder sells shares to another holder. Company cash and total shares do not change.",
  ],
  [
    "Investor ownership (e)",
    "The new investor’s fraction of the full post-round denominator under the selected model.",
  ],
  [
    "Percentage-point loss",
    "60% → 48% loses 12 percentage points. Relative dilution is 20%, not 12%.",
  ],
  [
    "Fully diluted shares",
    "Defined issued holdings, outstanding awards and unallocated options. Do not double-count awards in the pool.",
  ],
  [
    "Unallocated option pool",
    "Options reserved but not granted. Pool targets in this release refer only to unallocated options, not all plan reserves.",
  ],
  [
    "Net proceeds",
    "Primary investment after financing fee and fixed transaction costs. Ownership still uses gross investment.",
  ],
  [
    "Net burn",
    "Monthly operating outflows minus cash receipts. Flat-burn runway assumes this amount stays constant.",
  ],
  [
    "Gross MOIC",
    "Investor distributions divided by invested cash. It is a gross multiple, not a risk-adjusted recommendation.",
  ],
  [
    "Distributable equity proceeds",
    "Cash available to equity holders after debt and transaction costs. It is not headline enterprise value.",
  ],
];
export default function Guide() {
  return (
    <>
      <PageHeader
        eyebrow="Learn the economics"
        title="Every number has a definition."
        description="The formulas, assumptions and boundaries behind Fundraise. Planning clarity starts with using the same terms."
      />
      <div className="space-y-6">
        <Notice>
          Fundraise is a planning tool, not a legal share register, statutory
          filing service or source of investment advice. Review consequential
          decisions with qualified advisers.
        </Notice>
        <Card
          title="Core priced-round formulas"
          description="No conversion instruments or newly created pools in the simple calculator."
        >
          <Table
            label="Core financial formulas"
            headers={["Known values", "Calculation"]}
            rows={[
              ["Pre-money P, investment I", "M = P + I; e = I / M"],
              ["Post-money M, investment I", "P = M − I; e = I / M"],
              ["Pre-money P, ownership e", "I = P × e / (1 − e); M = P + I"],
              ["Post-money M, ownership e", "I = M × e; P = M × (1 − e)"],
              ["Investment I, ownership e", "M = I / e; P = M − I"],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-4">
            Investor ownership must be strictly between 0% and 100%. Post-money
            must exceed primary investment. Currency changes formatting only.
          </p>
        </Card>
        <Card
          title="Conversion instruments — planning estimates"
          description="Post-money SAFE and simple convertible note · Approximations, not contract models"
        >
          <Table
            label="Conversion instrument formulas"
            headers={["Step", "Calculation"]}
            rows={[
              [
                "SAFE ownership (post-money)",
                "e = I / Cap — the cap is the post-money valuation",
              ],
              [
                "SAFE share issuance",
                "price = Cap / S; new shares = I / price",
              ],
              [
                "Note interest (simple)",
                "A = I × (1 + r × m / 12), no compounding",
              ],
              [
                "Note price legs",
                "cap price = Cap / S; discount price = round price × (1 − d)",
              ],
              [
                "Note applied price",
                "applied = min(cap price, discount price) — the lower governs",
              ],
              [
                "Note shares & ownership",
                "new = A / applied; e = new / (S + new)",
              ],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-4">
            One instrument at a time; option-pool expansion is not modeled. When
            several instruments convert together, aggregate economics differ.
            Actual conversion always follows the instrument’s own contract
            language — verify with qualified advisers before relying on these
            numbers.
          </p>
        </Card>
        <Card
          title="Worked reference example"
          description="Example, not real user data · Same economics in any single supported currency"
        >
          <Table
            label="Worked reference fixture"
            headers={["Metric", "Expected"]}
            rows={[
              ["Pre-money / primary investment", "5,000,000 / 1,000,000"],
              ["Post-money / investor ownership", "6,000,000 / 16.6666667%"],
              ["Founder before / after", "60% / 50%"],
              ["Other owners after", "33.3333333%"],
              [
                "Existing shares / price / new shares",
                "1,000,000 / 5 / 200,000",
              ],
              ["Net proceeds at 2% fee", "980,000"],
              ["Cash 200,000 + net proceeds", "1,180,000"],
              ["Runway at 100,000 monthly net burn", "11.8 months"],
              ["18-month target gap", "620,000"],
              ["Pre-money / annual revenue 1,000,000", "5× (not EV/revenue)"],
            ]}
          />
          <Link
            href="/calculator?example=1"
            className="inline-flex text-sm text-primary gap-2 mt-5"
          >
            Try the INR-scaled worked example <ArrowRight className="size-4" />
          </Link>
        </Card>
        <Card title="Ownership, shares and pools">
          <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
            <p>
              Founder after = founder before × (1 − investor fraction). Across
              successive rounds, multiply retention factors: 100% × 80% × 75% =
              60%, not 55%.
            </p>
            <p>
              Share price = pre-money valuation / existing fully diluted shares.
              New shares = primary investment / price. Fractional shares are
              illustrative planning estimates; no integer issuance proposal is
              generated.
            </p>
            <p>
              Pre-money pool top-up expands the denominator before pricing and
              dilutes legacy owners. Post-money pool top-up happens after
              issuance and dilutes new investors too. Existing pools are never
              automatically cancelled.
            </p>
            <p>
              Detailed ownership is an independent ledger in this release. Its
              rounds do not silently change the simple calculator. All investors
              in one round share one price and identical common-equity economic
              rights.
            </p>
          </div>
        </Card>
        <Card title="Cash and forecast assumptions">
          <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
            <p>
              Net proceeds = I × (1 − fee fraction) − fixed costs. Combined
              deductions cannot exceed primary proceeds. Missing cash or burn
              means unavailable runway. Zero burn means no modeled cash
              depletion, not infinite displayed months.
            </p>
            <p>
              Gross financing needed = (required net cash + fixed financing
              costs) / (1 − fee fraction), only when financing is needed. A 100%
              fee cannot be grossed up. Additional financing assumes a new
              transaction with the same fee terms.
            </p>
            <p>
              Forecast receipts are shifted by the selected collection delay.
              COGS, salary and operating expenses are paid monthly. One-off
              spending is scheduled by month; use-of-funds allocations are not
              deducted again. No pre-horizon receivables or partial-month cash
              interpolation are assumed.
            </p>
            <p>
              Case drivers change recurring revenue and expenses, not
              probabilities. “No shortfall in the horizon” does not promise
              indefinite runway.
            </p>
          </div>
        </Card>
        <Card title="Plain-language glossary">
          <dl className="grid md:grid-cols-2 gap-6">
            {glossary.map(([term, definition]) => (
              <div key={term}>
                <dt className="font-semibold text-sm">{term}</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed mt-2">
                  {definition}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <div id="privacy">
          <Card title="Privacy, storage and supported scope">
            <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
              <p>
                Calculations and PDF generation run in your browser. No
                financial inputs are transmitted to an API or analytics.
                Interface fonts are self-hosted at build time and PDF fonts are
                bundled locally. Visited pages are cached for offline use; your
                data itself never enters that cache — it lives in browser
                storage. There are no accounts and no cloud backups. Share links
                are manual and carry the scenario inside the URL fragment, which
                browsers never send to a server — the recipient’s browser
                decodes it locally. Conversion-instrument inputs (SAFE, note)
                are convenience-cached separately from the workspace.
              </p>
              <p>
                “Saved in this browser” is not a backup. Storage can be cleared
                or denied. Use JSON backup for a separate copy. Invalid or
                incompatible stored data is kept for raw recovery and requires
                an explicit reset; it is never silently discarded.
              </p>
              <p>
                Saved revisions are immutable. This release only loads schema 2
                and engine 1.0.0. Unsupported schema/engine versions are
                rejected for recovery, not silently recalculated. Another-tab
                conflicts block writes; export your draft before reloading.
              </p>
              <p>
                Archive is reversible. Permanent deletion removes all local
                scenario revisions immediately after confirmation. There is no
                cloud trash window. No financial values are retained on a
                server.
              </p>
              <p>
                Liquidation preferences, participating waterfalls, pre-money
                SAFEs with pool expansion, XIRR, tax and legal models remain
                unavailable. The included post-money SAFE and simple-note
                calculators are negotiation-planning estimates, not contract
                models; each full instrument class still requires
                contract-specific templates, fixtures and independent
                professional sign-off.
              </p>
              <p>
                Limits: 10¹⁵ major-unit monetary amounts and shares; 100
                starting holdings; 20 rounds; 120 forecast months; 11
                sensitivity points per axis; 120-character names. Arithmetic: 40
                significant digits, half-even rounding, display rounding only.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
