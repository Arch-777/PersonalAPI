"use client";

import { useEffect, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-auth";
import { useConnectors } from "@/hooks/use-integrations";
import { useChatHistory } from "@/hooks/use-chat";
import {
  useDeveloperAnalyticsBreakdown,
  useDeveloperAnalyticsSummary,
  useDeveloperAnalyticsTimeseries,
} from "@/hooks/use-developer-analytics";
import {
  trackAnalyticsPanelError,
  trackAnalyticsPanelRetry,
} from "@/lib/analytics-panel-telemetry";
import {
  Clock,
  Database,
  Search,
  MessageSquare,
  AlertTriangle,
  Activity,
  GaugeCircle,
} from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

const analyticsChartConfig = {
  total_requests: {
    label: "Requests",
    color: "var(--color-chart-1)",
  },
  error_requests: {
    label: "Errors",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

function formatLatency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${Math.round(value)} ms`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${(value * 100).toFixed(2)}%`;
}

function formatBucketLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function errorMessage(err: unknown): string {
  if (!err) {
    return "Unable to load analytics right now.";
  }
  if (typeof err === "object" && err && "message" in err) {
    const msg = (err as { message?: string }).message;
    if (msg) return msg;
  }
  return "Unable to load analytics right now.";
}

export default function DashboardHome() {
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const [granularity, setGranularity] = useState<"hour" | "day">("day");

  const { data: user, isLoading: userLoading } = useUser();
  const { data: connectors, isLoading: connectorsLoading } = useConnectors();
  const { data: chatHistory } = useChatHistory(null);
  const {
    data: analyticsSummary,
    isLoading: analyticsSummaryLoading,
    isError: analyticsSummaryError,
    error: analyticsSummaryErrorData,
    refetch: refetchAnalyticsSummary,
  } = useDeveloperAnalyticsSummary(windowDays);
  const {
    data: analyticsTimeseries,
    isLoading: analyticsTimeseriesLoading,
    isError: analyticsTimeseriesError,
    error: analyticsTimeseriesErrorData,
    refetch: refetchAnalyticsTimeseries,
  } = useDeveloperAnalyticsTimeseries(windowDays, granularity);
  const {
    data: analyticsBreakdown,
    isLoading: analyticsBreakdownLoading,
    isError: analyticsBreakdownError,
    error: analyticsBreakdownErrorData,
    refetch: refetchAnalyticsBreakdown,
  } = useDeveloperAnalyticsBreakdown(windowDays, 6);

  const connectedAppsCount =
    connectors?.filter(
      (c: { status?: string; connected?: boolean }) =>
        c.status === "connected" || c.connected,
    ).length || 0;
  const summaryStats = [
    { label: "Connected Apps", value: connectedAppsCount.toString() },
    {
      label: `Requests (${windowDays}d)`,
      value: analyticsSummary?.total_requests?.toLocaleString() ?? "-",
      icon: Activity,
    },
    {
      label: "Error Rate",
      value: formatPercent(analyticsSummary?.error_rate),
      icon: AlertTriangle,
    },
    {
      label: "Avg Latency",
      value: formatLatency(analyticsSummary?.average_latency_ms),
      icon: GaugeCircle,
    },
    {
      label: "P95 Latency",
      value: formatLatency(analyticsSummary?.p95_latency_ms),
      icon: GaugeCircle,
    },
  ];

  const chartData = analyticsTimeseries?.points ?? [];
  const statusBreakdown = analyticsBreakdown?.status ?? [];
  const pathBreakdown = analyticsBreakdown?.paths ?? [];

  useEffect(() => {
    if (analyticsSummaryError) {
      trackAnalyticsPanelError("summary", { windowDays, granularity });
    }
  }, [analyticsSummaryError, granularity, windowDays]);

  useEffect(() => {
    if (analyticsTimeseriesError) {
      trackAnalyticsPanelError("trend", { windowDays, granularity });
    }
  }, [analyticsTimeseriesError, granularity, windowDays]);

  useEffect(() => {
    if (analyticsBreakdownError) {
      trackAnalyticsPanelError("status", { windowDays, granularity });
      trackAnalyticsPanelError("paths", { windowDays, granularity });
    }
  }, [analyticsBreakdownError, granularity, windowDays]);

  const handleRetrySummary = () => {
    trackAnalyticsPanelRetry("summary", { windowDays, granularity });
    void refetchAnalyticsSummary();
  };

  const handleRetryTrend = () => {
    trackAnalyticsPanelRetry("trend", { windowDays, granularity });
    void refetchAnalyticsTimeseries();
  };

  const handleRetryBreakdown = (panel: "status" | "paths") => {
    trackAnalyticsPanelRetry(panel, { windowDays, granularity });
    void refetchAnalyticsBreakdown();
  };

  let recentActivities = [
    {
      id: "act-1",
      type: "search",
      title: 'Search query "Project Alpha timeline"',
      icon: Search,
      time: "12 mins ago",
      response:
        "Found 14 documents related to Project Alpha timeline. The most relevant document is 'Q3 Alpha Roadmap.pdf' which outlines the major milestones starting next month.",
    },
    {
      id: "act-2",
      type: "sync",
      title: "Synced 42 new files from Google Drive",
      icon: Database,
      time: "1 hour ago",
      response:
        "Successfully indexed 42 files from the 'Marketing Assets' shared drive. Embeddings generated and stored in the vector database.",
    },
    {
      id: "act-3",
      type: "search",
      title: 'Search query "Q4 Revenue Projections"',
      icon: Search,
      time: "3 hours ago",
      response:
        "Q4 revenue is projected to hit $1.2M based on the latest spreadsheet data from the Finance folder. This is a 15% increase compared to Q3.",
    },
  ];

  if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
    const historyToActivity = chatHistory
      .filter((msg) => msg.role === "user")
      .map((msg, idx) => ({
        id: `chat-${msg.id || idx}`,
        type: "chat",
        title: `Asked AI: "${msg.content.slice(0, 40)}${msg.content.length > 40 ? "..." : ""}"`,
        icon: MessageSquare,
        time: msg.created_at
          ? new Date(msg.created_at).toLocaleString()
          : "Recently",
        response: (() => {
          const userIndex = chatHistory.findIndex((m) => m.id === msg.id);
          for (let i = userIndex - 1; i >= 0; i--) {
            if (chatHistory[i].role === "assistant") {
              return chatHistory[i].content;
            }
          }
          return "Exploring data...";
        })(),
      }))
      .slice(0, 5);

    if (historyToActivity.length > 0) {
      recentActivities = historyToActivity;
    }
  }

  if (userLoading || connectorsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8 flex-1">
      <div>
        <h1 className="text-3xl font-bold font-sans tracking-tight">
          Good morning, {user?.full_name || "User"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Here is a quick overview of your personal knowledge layer today.
        </p>
      </div>

      <div
        className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 md:p-6"
        data-testid="analytics-controls"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold">Analytics Controls</h3>
            <p className="text-sm text-muted-foreground">
              Adjust window and granularity for dashboard metrics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border p-1">
              {[7, 30, 90].map((days) => (
                <Button
                  key={days}
                  size="sm"
                  variant={windowDays === days ? "default" : "ghost"}
                  onClick={() => setWindowDays(days as 7 | 30 | 90)}
                  data-testid={`window-${days}`}
                >
                  {days}d
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              {["hour", "day"].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={granularity === value ? "default" : "ghost"}
                  onClick={() => setGranularity(value as "hour" | "day")}
                  data-testid={`granularity-${value}`}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryStats.map((stat, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card text-card-foreground shadow-sm p-6"
          >
            <p className="text-sm text-balance text-muted-foreground">
              {stat.label}
            </p>
            <div className="mt-4 text-3xl font-bold font-sans">
              {analyticsSummaryLoading && i > 0 ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                stat.value
              )}
            </div>
          </div>
        ))}
      </div>

      {analyticsSummaryError ? (
        <div className="rounded-xl border border-destructive/30 bg-card text-card-foreground shadow-sm p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">
                Failed to load summary metrics
              </p>
              <p className="text-sm text-muted-foreground">
                {errorMessage(analyticsSummaryErrorData)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetrySummary}
              data-testid="retry-summary"
            >
              Retry Summary
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-sans font-medium">
            Request Trend ({windowDays} days)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {granularity === "hour"
              ? "Hourly request and error volume from developer analytics logs."
              : "Daily request and error volume from developer analytics logs."}
          </p>
          <div className="mt-4 h-64">
            {analyticsTimeseriesLoading ? (
              <div className="space-y-3 pt-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-52 w-full rounded-lg" />
              </div>
            ) : analyticsTimeseriesError ? (
              <div className="rounded-lg border border-destructive/30 p-4">
                <p className="text-sm font-medium text-destructive">
                  Failed to load trend data
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {errorMessage(analyticsTimeseriesErrorData)}
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  onClick={handleRetryTrend}
                  data-testid="retry-trend"
                >
                  Retry Trend
                </Button>
              </div>
            ) : chartData.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No trend data yet for the selected window. Trigger API activity
                and refresh.
              </div>
            ) : (
              <ChartContainer config={analyticsChartConfig}>
                <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="bucket_start"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={formatBucketLabel}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) =>
                          formatBucketLabel(String(label))
                        }
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="total_requests"
                    stroke="var(--color-total_requests)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="error_requests"
                    stroke="var(--color-error_requests)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-sans font-medium">Status Breakdown</h3>
          <p className="text-sm text-muted-foreground mt-1">
            HTTP status family distribution.
          </p>
          <div className="mt-4 space-y-3">
            {analyticsBreakdownLoading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : analyticsBreakdownError ? (
              <div className="rounded-lg border border-destructive/30 p-4">
                <p className="text-sm font-medium text-destructive">
                  Failed to load status breakdown
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {errorMessage(analyticsBreakdownErrorData)}
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  onClick={() => handleRetryBreakdown("status")}
                  data-testid="retry-status"
                >
                  Retry Status
                </Button>
              </div>
            ) : statusBreakdown.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No status breakdown available for this window.
              </div>
            ) : (
              statusBreakdown.map((item) => (
                <div
                  key={item.status_bucket}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{item.status_bucket}</span>
                  <span className="text-muted-foreground">
                    {item.requests.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
        <h3 className="text-lg font-sans font-medium">
          Top Paths ({windowDays} days)
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Most requested endpoints with error and latency metrics.
        </p>
        <div className="mt-4 space-y-3">
          {analyticsBreakdownLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : analyticsBreakdownError ? (
            <div className="rounded-lg border border-destructive/30 p-4">
              <p className="text-sm font-medium text-destructive">
                Failed to load top paths
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {errorMessage(analyticsBreakdownErrorData)}
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => handleRetryBreakdown("paths")}
                data-testid="retry-paths"
              >
                Retry Paths
              </Button>
            </div>
          ) : pathBreakdown.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No endpoint activity to show yet for this range.
            </div>
          ) : (
            pathBreakdown.map((pathItem) => (
              <div key={pathItem.path} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs md:text-sm break-all">
                    {pathItem.path}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pathItem.total_requests.toLocaleString()} req
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>Error Rate: {formatPercent(pathItem.error_rate)}</span>
                  <span>
                    Errors: {pathItem.error_requests.toLocaleString()}
                  </span>
                  <span>
                    Avg Latency: {formatLatency(pathItem.average_latency_ms)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm mt-8">
        <div className="p-6">
          <h3 className="text-lg font-sans font-medium">Recent Activity</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your latest searches and system synchronizations.
          </p>
        </div>
        <div className="px-6 pb-6 pt-0">
          <Accordion className="w-full">
            {recentActivities.map((item) => {
              const Icon = item.icon;
              return (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border-t-0 border-b py-2 first:pt-0 last:border-b-0"
                >
                  <AccordionTrigger className="w-full hover:no-underline rounded-lg py-3 px-2">
                    <div className="flex items-center gap-4 text-left w-full">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/50 text-secondary-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div className="grid gap-1 flex-1">
                        <p className="text-sm font-medium leading-none">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {item.time}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="text-sm text-muted-foreground pl-16 pr-4 py-2 leading-relaxed whitespace-pre-wrap">
                      {item.response}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
