# Database Connection Error Fix

## Problem
The `/api/auth/login` endpoint is returning a 500 Internal Server Error because the MySQL database server on port 8889 is not running.

## Error Details
```
Error: ECONNREFUSED - Connection refused to localhost:8889
```

## Root Cause
The application is configured to connect to MySQL on `localhost:8889` (MAMP default port), but the MySQL server is not currently running.

## Solutions

### Solution 1: Start MAMP (Recommended if you use MAMP)

1. **Open MAMP application**
   - Launch MAMP from your Applications folder
   - Click "Start Servers" button
   - Wait for both Apache and MySQL to show green lights

2. **Verify MySQL is running**
   ```bash
   lsof -i :8889
   ```
   You should see MySQL process listening on port 8889

3. **Test the connection**
   ```bash
   cd "/Users/Shared/Files From d.localized/Documents/projects/MV-Projects /surveyjs-nextjs"
   npx tsx scripts/test-db.ts
   ```

4. **Restart your Next.js dev server**
   - Stop the current dev server (Ctrl+C)
   - Start it again: `npm run dev`

### Solution 2: Use Docker MySQL

If you don't have MAMP or prefer Docker:

```bash
# Start MySQL container on port 8889
docker run --name surveyjs-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=happiness_survey \
  -p 8889:3306 \
  -d mysql:8.0

# Wait a few seconds for MySQL to start, then run migrations
npm run db:push

# Seed the database
npm run db:seed
```

### Solution 3: Use Standard MySQL Port (3306)

If you have MySQL running on the standard port 3306:

1. **Update `.env.local`**
   ```env
   DATABASE_URL="mysql://root:root@localhost:3306/happiness_survey"
   ```

2. **Update `drizzle.config.ts`**
   ```typescript
   export default defineConfig({
     schema: "./src/db/schema/*",
     out: "./drizzle",
     dialect: "mysql",
     dbCredentials: {
       host: "localhost",
       port: 3306,  // Changed from 8889
       user: "root",
       password: "root",
       database: "happiness_survey",
     },
   });
   ```

3. **Create the database**
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS happiness_survey;"
   ```

4. **Run migrations and seed**
   ```bash
   npm run db:push
   npm run db:seed
   ```

### Solution 4: Install and Start MySQL Locally

If you don't have MySQL installed:

```bash
# Install MySQL using Homebrew
brew install mysql

# Start MySQL service
brew services start mysql

# Secure installation (optional but recommended)
mysql_secure_installation

# Create database
mysql -u root -p -e "CREATE DATABASE happiness_survey;"

# Update .env.local to use port 3306
# Then run migrations and seed
npm run db:push
npm run db:seed
```

## Verification Steps

After applying any solution:

1. **Check MySQL is running**
   ```bash
   # For port 8889 (MAMP)
   lsof -i :8889
   
   # For port 3306 (standard)
   lsof -i :3306
   ```

2. **Test database connection**
   ```bash
   npx tsx scripts/test-db.ts
   ```

3. **Test the login endpoint**
   - Navigate to `http://localhost:4000/admin/login`
   - Try logging in with admin credentials
   - The 500 error should be resolved

## Quick Fix (Immediate)

**If you have MAMP installed:**
1. Open MAMP
2. Click "Start Servers"
3. Refresh your browser

**If you don't have MAMP:**
Use Docker (Solution 2 above) - it's the quickest option.

## Additional Notes

- The application uses MySQL, not SQLite (despite the `.db` files in the root)
- The MySQL database should contain the `admins` table with admin credentials
- After starting MySQL, you may need to run `npm run db:seed` to populate the database
- Make sure your `.env.local` file matches your MySQL configuration

## Current Configuration

From `.env.local`:
```
DATABASE_URL="mysql://root:root@localhost:8889/happiness_survey"
```

From `drizzle.config.ts`:
```typescript
{
  host: "localhost",
  port: 8889,
  user: "root",
  password: "root",
  database: "happiness_survey",
}
```

## Testing After Fix

Once MySQL is running, test the admin login:
1. Go to `http://localhost:4000/admin/login`
2. Enter admin credentials (check `data/admins.json` or database)
3. Login should work without 500 errors

