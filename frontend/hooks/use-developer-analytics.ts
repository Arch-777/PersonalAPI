import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface DeveloperAnalyticsSummary {
  window_days: number;
  total_requests: number;
  error_requests: number;
  error_rate: number;
  average_latency_ms: number | null;
  p95_latency_ms: number | null;
}

export interface DeveloperAnalyticsTimeseriesPoint {
  bucket_start: string;
  total_requests: number;
  error_requests: number;
  error_rate: number;
  average_latency_ms: number | null;
}

export interface DeveloperAnalyticsTimeseries {
  window_days: number;
  granularity: 'hour' | 'day';
  points: DeveloperAnalyticsTimeseriesPoint[];
}

export interface DeveloperAnalyticsStatusBreakdownItem {
  status_bucket: string;
  requests: number;
}

export interface DeveloperAnalyticsPathBreakdownItem {
  path: string;
  total_requests: number;
  error_requests: number;
  error_rate: number;
  average_latency_ms: number | null;
}

export interface DeveloperAnalyticsBreakdown {
  window_days: number;
  status: DeveloperAnalyticsStatusBreakdownItem[];
  paths: DeveloperAnalyticsPathBreakdownItem[];
}

export const useDeveloperAnalyticsSummary = (windowDays = 30) => {
  return useQuery<DeveloperAnalyticsSummary, Error>({
    queryKey: ['developer-analytics', 'summary', windowDays],
    queryFn: async () => {
      const { data } = await apiClient.get('/v1/developer/analytics/summary', {
        params: { window_days: windowDays },
      });
      return data;
    },
    staleTime: 60 * 1000,
    retry: 2,
  });
};

export const useDeveloperAnalyticsTimeseries = (windowDays = 30, granularity: 'hour' | 'day' = 'day') => {
  return useQuery<DeveloperAnalyticsTimeseries, Error>({
    queryKey: ['developer-analytics', 'timeseries', windowDays, granularity],
    queryFn: async () => {
      const { data } = await apiClient.get('/v1/developer/analytics/timeseries', {
        params: { window_days: windowDays, granularity },
      });
      return data;
    },
    staleTime: 60 * 1000,
    retry: 2,
  });
};

export const useDeveloperAnalyticsBreakdown = (windowDays = 30, topPaths = 6) => {
  return useQuery<DeveloperAnalyticsBreakdown, Error>({
    queryKey: ['developer-analytics', 'breakdown', windowDays, topPaths],
    queryFn: async () => {
      const { data } = await apiClient.get('/v1/developer/analytics/breakdown', {
        params: { window_days: windowDays, top_paths: topPaths },
      });
      return data;
    },
    staleTime: 60 * 1000,
    retry: 2,
  });
};
