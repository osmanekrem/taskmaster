import { db } from '@/db';
import type { DbOrTx } from '@/lib/transaction';

export type DrizzleClient = typeof db;

export type DrizzleTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

// Use the unified DbOrTx type from transaction.ts for consistency
export type DrizzleClientOrTransaction = DbOrTx;
