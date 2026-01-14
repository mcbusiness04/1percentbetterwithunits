-- ============================================================================
-- APPLE COMPLIANCE MIGRATION (Guideline 3.1.2)
-- ============================================================================
-- Adds original_transaction_id column to subscriptions table for binding Apple
-- subscriptions to specific user accounts. This ensures:
-- 1. One Apple subscription can only unlock ONE user account
-- 2. Subscription ownership can be verified on restore
-- 
-- IMPORTANT: We use originalTransactionIdentifierIos (not transactionId) because:
-- - transactionId changes on each renewal
-- - originalTransactionIdentifierIos stays CONSTANT across all renewals
-- ============================================================================

-- Add original_transaction_id column if not exists (stable identifier)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS original_transaction_id TEXT;

-- Add created_at if not exists
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Create UNIQUE index on original_transaction_id to prevent multi-account binding
-- This ensures one Apple subscription can only be bound to one user account
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_original_transaction_id_unique 
ON subscriptions(original_transaction_id) 
WHERE original_transaction_id IS NOT NULL;

-- Legacy column for backwards compatibility (can be removed in future)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Create index for faster transaction lookups (legacy)
CREATE INDEX IF NOT EXISTS idx_subscriptions_transaction_id 
ON subscriptions(transaction_id);
