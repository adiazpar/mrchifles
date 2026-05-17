-- Drop the orders.receipt column.
--
-- Receipt upload was wired through validation but never persisted (the
-- POST/PATCH handlers always passed `null`) and never read by any UI
-- consumer. Removing the column, the upload validation in the API
-- routes, the UI form state, and the OrderDetailsStep receipt picker
-- to eliminate the dead feature before open-source release.
--
-- This is a destructive column drop. Existing rows will lose any value
-- stored in `receipt`, but since the column was never populated by the
-- application code, the data loss is purely formal.

ALTER TABLE orders DROP COLUMN receipt;
