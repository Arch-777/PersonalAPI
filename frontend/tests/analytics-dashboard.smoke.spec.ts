import { expect, test } from "@playwright/test";

test.describe("dashboard analytics smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("access_token", "smoke-token");
    });

    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "smoke-user-id",
          email: "smoke@example.com",
          full_name: "Smoke User",
          is_active: true,
          is_superuser: false,
        }),
      });
    });

    await page.route("**/v1/connectors/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/v1/chat/history**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/v1/developer/analytics/summary**", async (route) => {
      const url = new URL(route.request().url());
      const windowDays = Number(url.searchParams.get("window_days") || "30");
      const totalByWindow: Record<number, number> = { 7: 70, 30: 300, 90: 900 };
      const total = totalByWindow[windowDays] ?? 300;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          window_days: windowDays,
          total_requests: total,
          error_requests: 6,
          error_rate: 0.02,
          average_latency_ms: 82.4,
          p95_latency_ms: 190,
        }),
      });
    });

    await page.route("**/v1/developer/analytics/timeseries**", async (route) => {
      const url = new URL(route.request().url());
      const granularity = url.searchParams.get("granularity") || "day";
      const bucket =
        granularity === "hour" ? "2026-03-20T10:00:00Z" : "2026-03-20T00:00:00Z";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          window_days: Number(url.searchParams.get("window_days") || "30"),
          granularity,
          points: [
            {
              bucket_start: bucket,
              total_requests: 20,
              error_requests: 1,
              error_rate: 0.05,
              average_latency_ms: 90.1,
            },
          ],
        }),
      });
    });

    await page.route("**/v1/developer/analytics/breakdown**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          window_days: 30,
          status: [{ status_bucket: "2xx", requests: 18 }],
          paths: [
            {
              path: "/v1/search/",
              total_requests: 10,
              error_requests: 1,
              error_rate: 0.1,
              average_latency_ms: 88,
            },
          ],
        }),
      });
    });
  });

  test("switches controls and refreshes analytics sections", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByTestId("analytics-controls")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Request Trend (30 days)" })).toBeVisible();
    await expect(page.getByText("Requests (30d)")).toBeVisible();

    await page.getByTestId("window-7").click();
    await expect(page.getByRole("heading", { name: "Request Trend (7 days)" })).toBeVisible();
    await expect(page.getByText("Requests (7d)")).toBeVisible();

    await page.getByTestId("granularity-hour").click();
    await expect(page.getByText("Hourly request and error volume from developer analytics logs.")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Status Breakdown" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top Paths (7 days)" })).toBeVisible();
  });
});
