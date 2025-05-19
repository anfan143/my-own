/*
  # Add portfolio description column

  1. Changes
    - Add `portfolio_description` column to `provider_portfolio` table
    - Update existing records to have empty description

  2. Notes
    - The column is nullable to maintain compatibility with existing records
    - Using IF NOT EXISTS to prevent errors if column already exists
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'provider_portfolio' 
    AND column_name = 'portfolio_description'
  ) THEN
    ALTER TABLE provider_portfolio 
    ADD COLUMN portfolio_description text;
  END IF;
END $$;