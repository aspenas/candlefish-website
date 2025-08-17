import { test, expect } from "@playwright/test";

test("home renders hero and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Paintbox 2025")).toBeVisible();
  await expect(page.getByRole("button", { name: "New Estimate" })).toBeVisible();
});
