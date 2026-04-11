-- Add client_id_issued_at column to oauth_clients table
-- This field stores when the client ID was issued as Unix timestamp

ALTER TABLE public.oauth_clients 
ADD COLUMN client_id_issued_at BIGINT;

-- Update existing records to have current timestamp
UPDATE public.oauth_clients 
SET client_id_issued_at = EXTRACT(EPOCH FROM created_at)::BIGINT 
WHERE client_id_issued_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.oauth_clients.client_id_issued_at IS 'Unix timestamp when client ID was issued';
