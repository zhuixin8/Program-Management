import type { ProjectStatsSummary } from '@/lib/project-stats-summary'

type DashboardStatsCard = {
  icon: string
  label: string
  value: number
  color: string
}

type DashboardStatsOverview = Pick<
  ProjectStatsSummary,
  'total' | 'used' | 'expired' | 'active' | 'countRemainingTotal' | 'countConsumedTotal'
>

export function buildDashboardStatsCards(stats: DashboardStatsOverview): DashboardStatsCard[] {
  return [
    { icon: '总', label: '总激活码数', value: stats.total, color: 'bg-zinc-950' },
    { icon: '用', label: '已使用', value: stats.used, color: 'bg-emerald-600' },
    { icon: '期', label: '已过期', value: stats.expired, color: 'bg-rose-600' },
    { icon: '活', label: '可用激活码', value: stats.active, color: 'bg-cyan-600' },
    { icon: '余', label: '次数剩余', value: stats.countRemainingTotal, color: 'bg-amber-500' },
    { icon: '耗', label: '次数消耗', value: stats.countConsumedTotal, color: 'bg-zinc-700' },
  ]
}
