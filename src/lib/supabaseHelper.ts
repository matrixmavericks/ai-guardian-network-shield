// Helper to query tables not yet in the auto-generated Supabase types
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns a Supabase query builder for any table name, bypassing
 * the generated TypeScript types. Use for newly-created tables
 * whose types haven't been regenerated yet.
 */
export const fromTable = (table: string) => (supabase as any).from(table);
