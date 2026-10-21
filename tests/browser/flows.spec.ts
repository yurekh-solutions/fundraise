import { test, expect } from "@playwright/test";

async function example(page: import("@playwright/test").Page) {
  await page.goto("/calculator");
  await page.getByRole("button", { name: "Load example", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByLabel("New investor ownership")).toHaveValue(
    "16.6667",
  );
}

test("desktop landing and true 360px responsive routes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("main h1")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".fade-up")
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe("1");
  const preview = page.getByRole("link", {
    name: "Open the worked example in the calculator",
  });
  await expect(preview).toHaveAttribute("href", "/calculator?example=1");
  await expect(preview).toContainText("16.6667%");
  await expect(preview).toContainText("₹5,00,00,000");
  await expect(preview).toContainText("11.8 mo");
  await expect(
    page.locator("section").first().getByText("Formula trace", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
  for (const path of [
    "/",
    "/calculator",
    "/scenarios",
    "/cap-table",
    "/rounds",
    "/forecast",
    "/returns",
    "/sensitivity",
    "/reports",
    "/guide",
    "/share",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(360);
  }
  await example(page);
  await page.getByRole("button", { name: /Ownership & cash planning/ }).click();
  await page.screenshot({
    path: "test-results/calculator-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("solve, Unicode save, revisions, compare and actual PDF/CSV downloads", async ({
  page,
}) => {
  await example(page);
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await page
    .getByLabel("Scenario name", { exact: true })
    .fill("₹ € £ — Café example");
  await page.getByRole("button", { name: "Save as new", exact: true }).click();
  await page.goto("/scenarios");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "₹ € £ — Café example", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Duplicate ₹ € £ — Café example",
      exact: true,
    })
    .click();
  await page.getByLabel("Add to comparison").nth(0).check();
  await page.getByLabel("Add to comparison").nth(1).check();
  const pdfPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const pdf = await pdfPromise;
  expect(pdf.suggestedFilename()).toBe("fundraise-comparison.pdf");
  await pdf.saveAs("test-results/comparison.pdf");
  expect(await pdf.failure()).toBeNull();
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const csv = await csvPromise;
  await csv.saveAs("test-results/comparison.csv");
  await page.goto("/calculator");
  await page.getByRole("button", { name: /Ownership & cash planning/ }).click();
  await page.getByLabel("Financing fee", { exact: true }).fill("-5");
  await expect(page.getByLabel("New investor ownership")).toHaveValue(
    "16.6667",
  );
  await expect(
    page.getByRole("button", { name: "Export PDF", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Financing fee", { exact: true }).fill("2");
  await expect(
    page.getByRole("button", { name: "Export PDF", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Update · new revision", exact: true })
    .click();
  await page.goto("/scenarios");
  await expect(
    page.getByText("INR · Revision 2 · Engine 1.0.0", { exact: true }),
  ).toBeVisible();
});

test("storage failure keeps editable draft without claiming it saved", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await example(page);
  await expect(page.getByLabel("New investor ownership")).toHaveValue(
    "16.6667",
  );
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await page.getByLabel("Scenario name", { exact: true }).fill("Not persisted");
  await page.getByRole("button", { name: "Save as new", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText("Not saved", { exact: true }).first(),
  ).toBeVisible();
});

test("corrupt storage is preserved until explicit recovery and reset", async ({
  page,
}) => {
  const key = "fundraise.workspace.v2";
  const raw = "{damaged-json";
  await page.addInitScript(
    ({ key, raw }) => {
      if (sessionStorage.getItem("corruption-seeded")) return;
      localStorage.setItem(key, raw);
      sessionStorage.setItem("corruption-seeded", "yes");
    },
    { key, raw },
  );
  await example(page);
  await expect(
    page.getByRole("button", { name: "Download recovery file", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    raw,
  );
  const recoveryPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download recovery file", exact: true })
    .click();
  const recovery = await recoveryPromise;
  expect(recovery.suggestedFilename()).toBe("fundraise-recovery.txt");
  expect(await recovery.failure()).toBeNull();
  await page
    .getByRole("button", { name: "Reset stored data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    raw,
  );
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download recovery file", exact: true }),
  ).toHaveCount(0);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(stored.schemaVersion).toBe("2");
  expect(stored.scenarios).toEqual([]);
  await expect(page.getByLabel("New investor ownership")).toHaveValue("");
});

test("pool fixture from issued shares produces 4.4 price and 10% pool", async ({
  page,
}) => {
  await page.goto("/cap-table");
  await page
    .getByRole("button", { name: "Add first stakeholder", exact: true })
    .click();
  await page.getByLabel("Stakeholder 1 name").fill("Founder");
  await page.getByLabel("Share quantity").fill("1000000");
  await page.goto("/rounds");
  await page
    .getByRole("button", { name: "Add first round", exact: true })
    .click();
  await page.getByLabel("Round name", { exact: true }).fill("Seed");
  await page
    .getByLabel("Pre-money valuation (INR)", { exact: true })
    .fill("5000000");
  await page.getByLabel("Investor name", { exact: true }).fill("Investor");
  await page.getByLabel("Primary cash (INR)", { exact: true }).fill("1000000");
  await page.getByLabel("Pool top-up timing").selectOption("pre");
  await page.getByLabel("Post-round unallocated pool target").fill("10");
  await expect(page.getByText(/Price: ₹4\.400000 \/ share/)).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "10.0000%", exact: true }).first(),
  ).toBeVisible();
});

test("SAFE and note instruments compute conversion economics", async ({
  page,
}) => {
  await page.goto("/calculator");
  await page.getByRole("tab", { name: "SAFE", exact: true }).click();
  await page.getByLabel("Post-money valuation cap").fill("6000000");
  await page.getByLabel("SAFE investment (gross)").fill("1000000");
  await page.getByLabel("Pre-round fully diluted shares").fill("1000000");
  await expect(
    page.getByText("16.6667%", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Note", exact: true }).click();
  await page.getByLabel("Valuation cap", { exact: true }).fill("6000000");
  await page.getByLabel("Principal investment").fill("1000000");
  await page.getByLabel("Pre-round fully diluted shares").fill("1000000");
  await page.getByLabel("Annual interest rate").fill("8");
  await page.getByLabel("Months to conversion").fill("12");
  await page.getByLabel("Discount", { exact: true }).fill("20");
  await page.getByLabel("Next-round price per share").fill("5");
  await expect(
    page.getByText("21.2598%", { exact: true }).first(),
  ).toBeVisible();
  // Tab state and instrument inputs persist independently of the priced draft.
  await page.getByRole("tab", { name: "Priced round", exact: true }).click();
  await expect(page.getByLabel("New investor ownership")).toHaveValue("");
  await page.getByRole("tab", { name: "SAFE", exact: true }).click();
  await expect(page.getByLabel("Post-money valuation cap")).toHaveValue(
    "6000000",
  );
});

test("share link carries a scenario to another browser", async ({
  page,
  context,
}) => {
  await example(page);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const url = await page
    .getByLabel("Shareable link", { exact: true })
    .inputValue();
  expect(url).toContain("/share#p=");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  const other = await context.newPage();
  await other.goto(url);
  await expect(
    other.getByRole("heading", { name: "Untitled draft", exact: true }),
  ).toBeVisible();
  await expect(other.getByText("16.6667%", { exact: true })).toBeVisible();
  await other
    .getByRole("button", { name: "Open in my calculator", exact: true })
    .click();
  await expect(other).toHaveURL(/\/calculator$/);
  await expect(other.getByLabel("Pre-money equity valuation")).toHaveValue(
    "50000000",
  );
  await other.close();
});

test("service worker serves the shell offline and falls back when uncached", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
    timeout: 20000,
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Know your numbers/ }),
  ).toBeVisible();
  await expect(page.getByText("Formula trace")).toBeVisible();
  await page.goto("/scenarios");
  await expect(page.locator("main h1")).toContainText("offline");
  await context.setOffline(false);
});
