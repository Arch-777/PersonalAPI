"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useConnectors,
  useDisconnectConnector,
  useGetConnectUrl,
  useSyncConnector,
  useToggleAutoSync,
} from "@/hooks/use-integrations";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect } from "react";
import { toast } from "sonner";

const SUPPORTED_INTEGRATIONS = [
  { name: "Notion", platform: "notion" },
  { name: "Google Calendar", platform: "gcal" },
  { name: "Google Drive", platform: "drive" },
  { name: "Slack", platform: "slack" },
  { name: "Gmail", platform: "gmail" },
  { name: "Spotify", platform: "spotify" },
  { name: "GitHub", platform: "github" },
];

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: connectors, isLoading } = useConnectors();
  const getConnectUrl = useGetConnectUrl();
  const syncConnector = useSyncConnector();
  const toggleAutoSync = useToggleAutoSync();
  const disconnectConnector = useDisconnectConnector();

  const accessToken =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const handleWebSocketEvent = useCallback(
    (payload: { event: string; data: Record<string, unknown> }) => {
      if (payload.event === "sync.started") {
        const platform =
          typeof payload.data.platform === "string"
            ? payload.data.platform
            : "connector";
        toast.message(`${platform} sync started`);
        queryClient.invalidateQueries({ queryKey: ["connectors"] });
        return;
      }

      if (payload.event === "sync.completed") {
        const platform =
          typeof payload.data.platform === "string"
            ? payload.data.platform
            : "connector";
        const count =
          typeof payload.data.items_upserted === "number"
            ? payload.data.items_upserted
            : undefined;
        toast.success(
          count !== undefined
            ? `${platform} sync completed (${count} items)`
            : `${platform} sync completed`,
        );
        queryClient.invalidateQueries({ queryKey: ["connectors"] });
        return;
      }

      if (payload.event === "sync.failed") {
        const platform =
          typeof payload.data.platform === "string"
            ? payload.data.platform
            : "connector";
        const error =
          typeof payload.data.error === "string"
            ? payload.data.error
            : "Unknown error";
        toast.error(`${platform} sync failed: ${error}`);
        queryClient.invalidateQueries({ queryKey: ["connectors"] });
      }
    },
    [queryClient],
  );

  const { status: wsStatus } = useWebSocket({
    token: accessToken,
    enabled: !!accessToken,
    onEvent: handleWebSocketEvent,
  });

  useEffect(() => {
    const integration = searchParams.get("integration");
    const status = searchParams.get("status");
    const message = searchParams.get("message");

    if (!integration || !status) {
      return;
    }

    const normalized = integration.trim();
    const fallbackMessage =
      status === "success"
        ? `${normalized} connected successfully`
        : `${normalized} connection failed`;
    const toastMessage = (message || fallbackMessage).trim();

    if (status === "success") {
      toast.success(toastMessage);
    } else {
      toast.error(toastMessage);
    }

    router.replace("/dashboard/integrations", { scroll: false });
  }, [router, searchParams]);

  const handleConnect = async (platform: string) => {
    try {
      const url = await getConnectUrl.mutateAsync(platform);
      window.location.assign(url);
    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate connection");
    }
  };

  const handleSync = async (platform: string) => {
    toast.promise(syncConnector.mutateAsync(platform), {
      loading: "Initiating sync...",
      success: "Sync queued successfully",
      error: "Failed to queue sync",
    });
  };

  const handleToggleAutoSync = async (platform: string, enabled: boolean) => {
    toast.promise(toggleAutoSync.mutateAsync({ platform, enabled }), {
      loading: "Updating auto-sync...",
      success: `Auto-sync ${enabled ? "enabled" : "disabled"}`,
      error: "Failed to update auto-sync",
    });
  };

  const handleDisconnect = async (platform: string) => {
    if (confirm("Are you sure you want to disconnect this integration?")) {
      toast.promise(disconnectConnector.mutateAsync({ platform }), {
        loading: "Disconnecting...",
        success: "Integration disconnected successfully",
        error: "Failed to disconnect integration",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-serif text-zinc-900 tracking-tight">
          Integrations
        </h1>
        <p className="text-zinc-500 font-serif">Manage your data sources.</p>
        <p className="text-xs text-zinc-400 font-medium">
          Realtime status:{" "}
          {wsStatus === "open"
            ? "Live"
            : wsStatus === "connecting"
              ? "Connecting..."
              : "Offline"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {SUPPORTED_INTEGRATIONS.map((c) => {
          const connector = connectors?.find(
            (conn) => conn.platform === c.platform,
          );
          const isConnected =
            !!connector && connector.status !== "disconnected";
          const isSyncing = connector?.status === "syncing";
          const isConnecting =
            getConnectUrl.isPending && getConnectUrl.variables === c.platform;

          return (
            <Card
              key={c.name}
              className="flex flex-col overflow-hidden border-zinc-200 shadow-sm rounded-xl hover:shadow-md transition-shadow bg-white"
            >
              <CardHeader className="flex flex-col items-start gap-3 p-5 pb-5">
                <CardTitle className="text-2xl font-serif text-zinc-900 font-normal">
                  {c.name}
                </CardTitle>
                {connector?.platform_email && (
                  <p className="text-xs text-zinc-500 font-medium truncate w-full">
                    {connector.platform_email}
                  </p>
                )}
                <Badge
                  variant="outline"
                  className={`rounded-full px-3 py-0.5 text-xs font-semibold shrink-0 border-0 ${
                    isConnected
                      ? isSyncing
                        ? "bg-blue-100 text-blue-700"
                        : connector.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-zinc-900 text-zinc-50"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {isConnected
                    ? isSyncing
                      ? "Syncing"
                      : connector.status === "error"
                        ? "Error"
                        : "Connected"
                    : "Not Connected"}
                </Badge>
              </CardHeader>

              <div className="flex-1" />

              {isConnected && (
                <div className="px-5 pb-4 flex items-center justify-between mt-auto">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`auto-sync-${c.platform}`}
                      checked={connector?.auto_sync_enabled || false}
                      onCheckedChange={(checked) => handleToggleAutoSync(c.platform, checked)}
                      disabled={
                        toggleAutoSync.isPending &&
                        toggleAutoSync.variables?.platform === c.platform
                      }
                      className="data-[state=checked]:bg-[#18181B] data-[state=unchecked]:bg-zinc-200 focus-visible:ring-zinc-900"
                    />
                    <Label
                      htmlFor={`auto-sync-${c.platform}`}
                      className="text-xs text-zinc-500 cursor-pointer flex items-center gap-1.5"
                    >
                      {toggleAutoSync.isPending &&
                      toggleAutoSync.variables?.platform === c.platform ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                      Auto-sync
                    </Label>
                  </div>
                </div>
              )}

              <div className="flex gap-2 bg-zinc-50/80 p-4 border-t border-zinc-100">
                {!isConnected ? (
                  <Button
                    onClick={() => handleConnect(c.platform)}
                    disabled={isConnecting}
                    className="w-full h-10 rounded-lg font-medium transition-all duration-200 bg-[#18181B] text-zinc-50 hover:bg-[#27272A] shadow-sm"
                  >
                    {isConnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Connect
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleSync(c.platform)}
                      disabled={isSyncing || syncConnector.isPending}
                      className="flex-1 h-10 rounded-lg font-medium transition-all duration-200 bg-white border-zinc-200 shadow-sm hover:bg-zinc-50 text-zinc-900"
                    >
                      {isSyncing ||
                      (syncConnector.isPending &&
                        syncConnector.variables === c.platform) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {isSyncing ? "Syncing..." : "Sync"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDisconnect(c.platform)}
                      disabled={disconnectConnector.isPending && disconnectConnector.variables?.platform === c.platform}
                      className="h-10 w-10 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100"
                      title="Disconnect integration"
                    >
                      {disconnectConnector.isPending && disconnectConnector.variables?.platform === c.platform ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}