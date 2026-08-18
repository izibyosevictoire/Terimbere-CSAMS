import { apiClient } from './client'
import { unwrapApiData } from './auth'
import type { ApiResponse } from '@/shared/types/api'
import type {
  DashboardSummary,
  MonthlyContributionChartPoint,
} from '@/shared/types/dashboard'
import {
  mapDashboardSummary,
  mapMonthlyContributionChartPoint,
} from '@/shared/types/dashboard'

export async function fetchDashboardSummary(
  cooperativeId: string,
): Promise<DashboardSummary> {
  const response = await apiClient.get<ApiResponse<DashboardSummary>>(
    `/cooperatives/${cooperativeId}/dashboard/summary`,
  )
  return mapDashboardSummary(unwrapApiData(response.data))
}

export async function fetchMonthlyContributionsChart(
  cooperativeId: string,
  year: number,
): Promise<MonthlyContributionChartPoint[]> {
  const response = await apiClient.get<ApiResponse<MonthlyContributionChartPoint[]>>(
    `/cooperatives/${cooperativeId}/dashboard/charts/monthly-contributions`,
    { params: { year } },
  )
  return (unwrapApiData(response.data) ?? []).map(mapMonthlyContributionChartPoint)
}
