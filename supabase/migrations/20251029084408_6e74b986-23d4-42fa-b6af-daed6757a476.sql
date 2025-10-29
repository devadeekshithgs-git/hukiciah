-- Drop the legacy blocked_trays table since it's not being used
-- All blocking is now handled via calendar_config.blocked_trays
DROP TABLE IF EXISTS blocked_trays;