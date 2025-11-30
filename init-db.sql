-- TaskMaster PostgreSQL initialization script
-- This runs only on first container creation

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for full-text search (if needed later)
-- Can add custom functions here

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO taskmaster;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO taskmaster;
