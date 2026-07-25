import { expect, test } from "@playwright/test";

test("inspects the pre-launch ZZZ Japan publishing workspaces", async ({ page }, testInfo) => {
  await page.goto("/p1");

  await expect(page.getByRole("heading", { name: "《绝区零》Ver.3.1 / 蕾米埃尔 / 日本" })).toBeVisible();
  await expect(page.getByText("Awaiting T+72h", { exact: true })).toBeVisible();
  await expect(page.getByText("R14", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Audience Map" }).click();
  await expect(page.getByRole("heading", { name: "日本内部合成人群" })).toBeVisible();

  await page.getByRole("button", { name: "Strategy Lab" }).click();
  await expect(page.getByRole("heading", { name: "单变量配对运行" })).toBeVisible();
  await expect(page.getByText("COMBAT_VALUE_FIRST", { exact: true })).toBeVisible();
  await expect(page.getByText("CHARACTER_AFFINITY_FIRST", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Outcome & Calibration" }).click();
  await expect(page.getByRole("heading", { name: "发行建议" })).toBeVisible();
  await expect(page.getByText("T_PLUS_72H", { exact: true })).toBeVisible();
  await expect(page.getByText("合成模拟与移动端公开代理，不代表日本全平台或单角色真实流水。", { exact: true }).last()).toBeVisible();

  await page.screenshot({ path: `test-results/${testInfo.project.name}-p1-outcome.png`, fullPage: true });
});
