import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/app/database/prisma.service'

import type {
  AnalyticsSummary,
  ArticleCategoryStatItem,
  ArticleCategoryStats,
  IAnalyticsQuery,
  MonthlyOverview,
  MonthlyOverviewItem,
} from '@/modules/analytics/application/ports/analytics.query.port'

const ARTICLE_CATEGORIES = ['tech', 'design', 'product', 'other'] as const

@Injectable()
export class AnalyticsRepositoryImpl implements IAnalyticsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<AnalyticsSummary> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [publishedToday, completedOrders] = await Promise.all([
      this.prisma.article.count({
        where: {
          status: 'published',
          publishedAt: { gte: today, lt: tomorrow },
        },
      }),
      this.prisma.order.count({
        where: { status: 'completed' },
      }),
    ])

    return {
      publishedToday,
      completedOrders,
    }
  }

  async getMonthlyOverview(): Promise<MonthlyOverview> {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    const [newUsersRows, publishedArticlesRows, loginAttemptsRows] = await Promise.all([
      this.prisma.$queryRaw<{ month: string; count: number }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
               COUNT(*)::int AS count
        FROM users
        WHERE created_at >= ${twelveMonthsAgo}
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `,
      this.prisma.$queryRaw<{ month: string; count: number }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', published_at), 'YYYY-MM') AS month,
               COUNT(*)::int AS count
        FROM articles
        WHERE status = 'published'
          AND published_at >= ${twelveMonthsAgo}
        GROUP BY DATE_TRUNC('month', published_at)
        ORDER BY DATE_TRUNC('month', published_at)
      `,
      this.prisma.$queryRaw<{ month: string; count: number }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
               COUNT(*)::int AS count
        FROM login_logs
        WHERE created_at >= ${twelveMonthsAgo}
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `,
    ])

    const months: MonthlyOverviewItem[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({
        month: monthKey,
        newUsers: 0,
        publishedArticles: 0,
        loginAttempts: 0,
      })
    }

    const monthMap = new Map(months.map((m) => [m.month, m]))

    for (const row of newUsersRows) {
      const item = monthMap.get(row.month)
      if (item) item.newUsers = Number(row.count)
    }
    for (const row of publishedArticlesRows) {
      const item = monthMap.get(row.month)
      if (item) item.publishedArticles = Number(row.count)
    }
    for (const row of loginAttemptsRows) {
      const item = monthMap.get(row.month)
      if (item) item.loginAttempts = Number(row.count)
    }

    return { months }
  }

  async getArticleCategoryStats(): Promise<ArticleCategoryStats> {
    const rows = await this.prisma.article.groupBy({
      by: ['category'],
      _count: { _all: true },
      _sum: { viewCount: true },
    })

    const rowMap = new Map(rows.map((r) => [r.category, r]))

    const categories: ArticleCategoryStatItem[] = ARTICLE_CATEGORIES.map((cat) => {
      const row = rowMap.get(cat)
      return {
        category: cat,
        count: row?._count._all ?? 0,
        viewCount: Number(row?._sum.viewCount ?? 0),
      }
    })

    return { categories }
  }
}
