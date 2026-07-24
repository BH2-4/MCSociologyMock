import { expect, test } from "@playwright/test";

test("inspects the recorded evidence chain and paired comparison", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByText("AgoraSim", { exact: true })).toBeVisible();
  await expect(page.getByText("Branch diff PASS")).toBeVisible();
  await expect(page.getByText("Synthetic simulation. Not a real-market forecast.")).toBeVisible();
  await expect(page.getByText("Evidence to paid adoption")).toBeVisible();
  await expect(page.getByText("Payment settled").first()).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-lab.png`, fullPage: true });

  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByRole("table", { name: "Branch comparison" })).toBeVisible();
  await expect(page.getByText("Control Evidence leak = 0")).toBeVisible();
  await expect(page.getByText("INSPECT_EVIDENCE")).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-compare.png`, fullPage: true });
});
