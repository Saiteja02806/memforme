// Apply the client_id_issued_at migration to Supabase
import { getSupabaseServiceClient } from './mcp-server/src/supabase/client.js';

const supabase = getSupabaseServiceClient();

async function applyMigration() {
  try {
    console.log('Applying migration for client_id_issued_at column...');
    
    // Add the column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.oauth_clients 
        ADD COLUMN IF NOT EXISTS client_id_issued_at BIGINT;
        
        UPDATE public.oauth_clients 
        SET client_id_issued_at = EXTRACT(EPOCH FROM created_at)::BIGINT 
        WHERE client_id_issued_at IS NULL;
        
        COMMENT ON COLUMN public.oauth_clients.client_id_issued_at IS 'Unix timestamp when client ID was issued';
      `
    });
    
    if (alterError) {
      console.error('Error applying migration:', alterError);
      return;
    }
    
    console.log('Migration applied successfully!');
    
    // Test the new column
    const { data, error } = await supabase
      .from('oauth_clients')
      .select('client_id, client_id_issued_at')
      .limit(1);
    
    if (error) {
      console.error('Error testing column:', error);
    } else {
      console.log('Test result:', data);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

applyMigration();
