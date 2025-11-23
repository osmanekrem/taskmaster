import { db } from '@/db';

export type DrizzleClient = typeof db;

export type DrizzleTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type DrizzleClientOrTransaction = DrizzleClient | DrizzleTransaction;
