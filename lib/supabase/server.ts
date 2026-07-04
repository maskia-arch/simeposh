/**
 * Mock server-side client that connects directly to PostgreSQL.
 * Emulates the Supabase Server Client interface.
 */
import { PostgresQueryBuilder, PostgresAuthClient, TableName } from './postgresClient';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  return {
    from: <T extends TableName = any>(table: T) => new PostgresQueryBuilder<T>(table),
    auth: new PostgresAuthClient(cookieStore),
  };
}

/**
 * Service-role client wrapper.
 * Connects directly to the PostgreSQL database without auth limits.
 */
export function createServiceClient() {
  return {
    from: <T extends TableName = any>(table: T) => new PostgresQueryBuilder<T>(table),
    auth: new PostgresAuthClient(),
  };
}
