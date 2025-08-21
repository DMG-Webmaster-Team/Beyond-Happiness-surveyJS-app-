-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Ensure WAL mode for better performance
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = 64000;
PRAGMA mmap_size = 268435456;

-- Verify foreign key constraints are working
PRAGMA foreign_key_check;
