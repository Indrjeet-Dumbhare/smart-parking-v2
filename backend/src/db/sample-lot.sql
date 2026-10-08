-- Run manually against an EXISTING database (init.sql only runs on an empty volume).
-- Safe to run more than once.
--
-- 1) Make sure the 10 real slots (A01..A10) exist.
INSERT INTO slots (label, zone)
SELECT 'A' || lpad(n::text, 2, '0'), 'SLOT 1'
FROM generate_series(1, 10) AS n
ON CONFLICT (label) DO NOTHING;

-- 2) Remove every other slot (old demo slots A1..B2 and the 30-slot B01..C10 set).
--    WARNING: reservations and slot_events for the removed slots are deleted too
--    (ON DELETE CASCADE).
DELETE FROM slots
WHERE label NOT IN (
  'A01','A02','A03','A04','A05','A06','A07','A08','A09','A10'
);