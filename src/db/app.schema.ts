/**
 * Application database schema (non-auth tables).
 * Add your app tables here; keep Better Auth tables in auth.schema.ts.
 */

import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';
import type { PaymentScene, PaymentStatus, PaymentType, PlanInterval } from '@/payment/types';

/** 
 * Payment: subscription and one-time 
 */
export const payment = sqliteTable(
  'payment',
  {
    id: text('id').primaryKey(),
    priceId: text('price_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    customerId: text('customer_id').notNull(),
    subscriptionId: text('subscription_id'),
    sessionId: text('session_id'),
    invoiceId: text('invoice_id').unique(),
    type: text('type').notNull().$type<PaymentType>(), // 'subscription' | 'one_time'
    scene: text('scene').$type<PaymentScene>(), // 'subscription' | 'lifetime'
    interval: text('interval').$type<PlanInterval>(), // 'month' | 'year'
    status: text('status').notNull().$type<PaymentStatus>(),
    paid: integer('paid', { mode: 'boolean' }).notNull().default(false),
    periodStart: integer('period_start', { mode: 'timestamp_ms' }),
    periodEnd: integer('period_end', { mode: 'timestamp_ms' }),
    cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }),
    trialStart: integer('trial_start', { mode: 'timestamp_ms' }),
    trialEnd: integer('trial_end', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('payment_user_id_idx').on(table.userId),
    index('payment_customer_id_idx').on(table.customerId),
    index('payment_subscription_id_idx').on(table.subscriptionId),
    index('payment_session_id_idx').on(table.sessionId),
    index('payment_invoice_id_idx').on(table.invoiceId),
    index('payment_paid_idx').on(table.paid),
    index('payment_user_paid_idx').on(table.userId, table.paid),
  ]
);

export const paymentRelations = relations(payment, ({ one }) => ({
  user: one(user, { fields: [payment.userId], references: [user.id] }),
}));

/**
 * User files
 * metadata for files uploaded to R2 (path userfiles/{userId}/xxx);
 * filename = stored name on R2 (e.g. uuid.ext);
 * originalName = user's file name.
 */
export const userFiles = sqliteTable(
  'user_files',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    originalName: text('original_name').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    r2Key: text('r2_key').notNull(),
    isPublic: integer('is_public', { mode: 'boolean' }),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('user_files_user_id_idx').on(table.userId),
    index('user_files_r2_key_idx').on(table.r2Key),
  ]
);

export const userFilesRelations = relations(userFiles, ({ one }) => ({
  user: one(user, {
    fields: [userFiles.userId],
    references: [user.id],
  }),
}));

export const gameScores = sqliteTable(
  'game_scores',
  {
    id: text('id').primaryKey(),
    gameId: text('game_id').notNull(),
    playerName: text('player_name').notNull(),
    score: integer('score').notNull(),
    acceptedNames: text('accepted_names').notNull(),
    durationMs: integer('duration_ms').notNull(),
    fingerprint: text('fingerprint').notNull(),
    ipHash: text('ip_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('game_scores_fingerprint_idx').on(table.fingerprint),
    index('game_scores_game_score_idx').on(
      table.gameId,
      table.score,
      table.durationMs
    ),
    index('game_scores_ip_created_idx').on(table.ipHash, table.createdAt),
    index('game_scores_created_idx').on(table.createdAt),
  ]
);

export const gameComments = sqliteTable(
  'game_comments',
  {
    id: text('id').primaryKey(),
    gameId: text('game_id').notNull(),
    displayName: text('display_name').notNull(),
    message: text('message').notNull(),
    score: integer('score'),
    ipHash: text('ip_hash').notNull(),
    status: text('status').notNull().default('approved'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('game_comments_game_created_idx').on(table.gameId, table.createdAt),
    index('game_comments_ip_created_idx').on(table.ipHash, table.createdAt),
    index('game_comments_status_created_idx').on(table.status, table.createdAt),
  ]
);

export const gameBlocks = sqliteTable(
  'game_blocks',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    value: text('value').notNull(),
    reason: text('reason'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('game_blocks_kind_value_idx').on(table.kind, table.value),
    index('game_blocks_active_idx').on(table.active),
  ]
);
