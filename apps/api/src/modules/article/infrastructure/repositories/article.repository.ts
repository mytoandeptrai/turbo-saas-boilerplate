import { Injectable } from '@nestjs/common'
import { Prisma } from '@workspace/database'

import { PrismaService } from '@/app/database/prisma.service'
import { Article } from '@/modules/article/domain/aggregates/article.aggregate'
import { ArticleStatus } from '@/modules/article/domain/enums/article-status.enum'
import { Content } from '@/modules/article/domain/value-objects/content.vo'
import { Slug } from '@/modules/article/domain/value-objects/slug.vo'
import { Tags } from '@/modules/article/domain/value-objects/tags.vo'
import { Title } from '@/modules/article/domain/value-objects/title.vo'

import type {
  ArticleCursorQuery,
  ArticleCursorResult,
  ArticleListQuery,
  ArticleListResult,
  ArticleRepository,
} from '@/modules/article/application/ports/article.repository.port'
import type { ArticleCategory } from '@/modules/article/domain/aggregates/article.aggregate'
import type { ArticleDatabase } from '@workspace/database'

type ArticleRow = Omit<ArticleDatabase, 'searchVector'>

/**
 * Prisma implementation of ArticleRepository
 *
 * searchVector is Unsupported(tsvector) — maintained via raw SQL after upsert.
 */
@Injectable()
export class ArticleRepositoryImpl implements ArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Article[]> {
    const rows = await this.prisma.article.findMany({
      orderBy: { createdAt: 'asc' },
    })

    return rows.map((row) => this.toDomain(row))
  }

  async findCursor(query: ArticleCursorQuery): Promise<ArticleCursorResult> {
    const { pageSize, cursor } = query

    let where: Prisma.ArticleWhereInput | undefined
    if (cursor) {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString()) as {
        createdAt: string
        id: string
      }
      const cursorDate = new Date(decoded.createdAt)
      where = {
        OR: [
          { createdAt: { gt: cursorDate } },
          { AND: [{ createdAt: cursorDate }, { id: { gt: decoded.id } }] },
        ],
      }
    }

    const rows = await this.prisma.article.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: pageSize + 1,
    })

    const hasMore = rows.length > pageSize
    const data = hasMore ? rows.slice(0, pageSize) : rows

    let nextCursor: string | null = null
    if (hasMore) {
      const last = data.at(-1)!
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id }),
      ).toString('base64')
    }

    return {
      data: data.map((row) => this.toDomain(row)),
      nextCursor,
      hasMore,
    }
  }

  async findPaginated(query: ArticleListQuery): Promise<ArticleListResult> {
    const { page, pageSize, q } = query
    const offset = (page - 1) * pageSize

    if (q) {
      const [rows, countRows] = await Promise.all([
        this.prisma.$queryRaw<ArticleRow[]>`
          SELECT id, title, content, slug, status, tags, category, author,
                 view_count AS "viewCount", is_pinned AS "isPinned",
                 created_at AS "createdAt", updated_at AS "updatedAt",
                 published_at AS "publishedAt"
          FROM articles
          WHERE search_vector @@ plainto_tsquery('english', ${q})
          ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${q})) DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        this.prisma.$queryRaw<{ count: number }[]>`
          SELECT COUNT(*)::int AS count
          FROM articles
          WHERE search_vector @@ plainto_tsquery('english', ${q})
        `,
      ])

      return {
        data: rows.map((row) => this.toDomain(row)),
        total: Number(countRows[0]?.count ?? 0),
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.article.findMany({
        orderBy: { createdAt: 'asc' },
        take: pageSize,
        skip: offset,
      }),
      this.prisma.article.count(),
    ])

    return {
      data: rows.map((row) => this.toDomain(row)),
      total,
    }
  }

  async findById(id: string): Promise<Article | null> {
    const row = await this.prisma.article.findUnique({ where: { id } })
    return row ? this.toDomain(row) : null
  }

  async findBySlug(slug: string): Promise<Article | null> {
    const row = await this.prisma.article.findUnique({ where: { slug } })
    return row ? this.toDomain(row) : null
  }

  async save(article: Article): Promise<void> {
    const data = this.toPersistence(article)
    const { id: _id, ...updateData } = data

    await this.prisma.article.upsert({
      where: { id: article.id },
      create: { ...data, id: article.id },
      update: updateData,
    })

    await this.prisma.$executeRaw`
      UPDATE articles
      SET search_vector = to_tsvector('english', ${data.title} || ' ' || ${data.content})
      WHERE id = ${article.id}::uuid
    `
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.article.deleteMany({ where: { id } })
    return result.count > 0
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const row = await this.prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    })
    return Boolean(row)
  }

  // ========== Domain model <-> Database record mapping ==========

  private toDomain(row: ArticleRow): Article {
    return Article.reconstitute(
      row.id,
      Title.create(row.title),
      Content.create(row.content),
      Slug.create(row.slug),
      row.status as ArticleStatus,
      Tags.create(row.tags as string[]),
      row.category as ArticleCategory,
      row.author,
      row.viewCount,
      row.isPinned,
      row.createdAt,
      row.updatedAt,
      row.publishedAt,
    )
  }

  private toPersistence(article: Article): Prisma.ArticleUncheckedCreateInput {
    return {
      id: article.id,
      title: article.title.value,
      content: article.content.value,
      slug: article.slug.value,
      status: article.status,
      tags: [...article.tags.value],
      category: article.category,
      author: article.author,
      viewCount: article.viewCount,
      isPinned: article.isPinned,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      publishedAt: article.publishedAt,
    }
  }
}
