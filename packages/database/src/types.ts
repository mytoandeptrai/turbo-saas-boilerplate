import type {
  Account,
  Article,
  AuditLog,
  BackgroundJob,
  LoginLog,
  Order,
  Prisma,
  Session,
  Todo,
  User,
  Verification,
} from '@prisma/client'

/**
 * User preferences stored in users.preferences JSONB
 */
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  lang?: string
  timezone?: string
  notifications?: boolean
}

/**
 * Authentication provider types (Better Auth compatible)
 */
export type AuthProvider = 'email' | 'google' | 'github' | 'phone' | 'saml' | 'oidc'

/** Application-facing aliases over generated Prisma model types */
export type UserDatabase = User
export type InsertUserDatabase = Prisma.UserUncheckedCreateInput

export type AccountDatabase = Account
export type InsertAccountDatabase = Prisma.AccountUncheckedCreateInput

export type SessionDatabase = Session
export type InsertSessionDatabase = Prisma.SessionUncheckedCreateInput

export type VerificationTokenDatabase = Verification
export type InsertVerificationTokenDatabase = Prisma.VerificationUncheckedCreateInput

export type LoginLogDatabase = LoginLog
export type InsertLoginLogDatabase = Prisma.LoginLogUncheckedCreateInput

export type { Todo }
export type InsertTodo = Prisma.TodoUncheckedCreateInput

export type ArticleDatabase = Article
export type InsertArticleDatabase = Prisma.ArticleUncheckedCreateInput

export type OrderDatabase = Order
export type InsertOrderDatabase = Prisma.OrderUncheckedCreateInput

export type JobDatabase = BackgroundJob
export type InsertJobDatabase = Prisma.BackgroundJobUncheckedCreateInput

export type { AuditLog }
export type InsertAuditLog = Prisma.AuditLogUncheckedCreateInput
