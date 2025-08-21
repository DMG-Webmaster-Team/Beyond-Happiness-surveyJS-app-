#!/bin/bash

# User Deletion Helper Script
# Usage: ./delete-user.sh <user_id>

if [ -z "$1" ]; then
    echo "Usage: ./delete-user.sh <user_id>"
    echo "Example: ./delete-user.sh user123"
    exit 1
fi

USER_ID="$1"
DB_PATH="surveyjs.db"

echo "🗑️  Deleting user: $USER_ID"
echo "📊 Enabling foreign key constraints..."

# Enable foreign keys and delete user
sqlite3 "$DB_PATH" <<EOF
PRAGMA foreign_keys = ON;
DELETE FROM users WHERE id = '$USER_ID';
SELECT 'User deleted successfully' as status;
EOF

echo "✅ User deletion completed!"
echo "🔍 Checking remaining users..."
sqlite3 "$DB_PATH" "SELECT COUNT(*) as total_users FROM users;"
