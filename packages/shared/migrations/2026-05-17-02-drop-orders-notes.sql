-- Drop the orders.notes column.
--
-- The column was declared in the schema and accepted writes (always
-- `null`) but was never read anywhere — no API route returned it, no
-- UI consumer rendered it, no Zod input schema accepted it. Removing
-- the column and the corresponding TS field on the Order type to
-- eliminate the dead surface before open-source release.
--
-- This is a destructive column drop. Existing rows will lose any value
-- stored in `notes`, but since the column was always written as NULL
-- by the application code, the data loss is purely formal.

ALTER TABLE orders DROP COLUMN notes;
