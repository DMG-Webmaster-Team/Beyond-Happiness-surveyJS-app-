# Database Integration Setup

This project uses Drizzle ORM with MySQL for data persistence.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database Configuration
# For PlanetScale (recommended for production):
DATABASE_URL="mysql://username:password@host:3306/database?ssl={"rejectUnauthorized":true}"

# For local MySQL:
DATABASE_URL="mysql://root:password@localhost:3306/surveyjs_nextjs"

# For development with Docker:
DATABASE_URL="mysql://root:rootpassword@localhost:3306/surveyjs_nextjs"
```

## Setup Instructions

1. **Install Dependencies** (already done):
   ```bash
   npm install drizzle-orm drizzle-kit mysql2 zod @paralleldrive/cuid2 tsx
   ```

2. **Set up your MySQL database**:
   - Local: Install MySQL and create a database named `surveyjs_nextjs`
   - PlanetScale: Create a database and get connection string
   - Docker: `docker run --name mysql-dev -e MYSQL_ROOT_PASSWORD=rootpassword -e MYSQL_DATABASE=surveyjs_nextjs -p 3306:3306 -d mysql:8.0`

3. **Configure environment**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your database credentials
   ```

4. **Generate and push migrations**:
   ```bash
   npm run db:gen
   npm run db:push
   ```

5. **Seed the database**:
   ```bash
   npm run db:seed
   ```

## Available Scripts

- `npm run db:gen` - Generate migrations from schema changes
- `npm run db:push` - Apply migrations to database
- `npm run db:studio` - Open Drizzle Studio (schema viewer)
- `npm run db:seed` - Seed database with existing JSON data

## Database Schema

### Tables
- **admins**: Admin users with authentication
- **users**: Survey participants with OTP authentication
- **surveys**: Survey definitions with SurveyJS JSON
- **results**: Survey response data

### Key Features
- Foreign key relationships with proper indexing
- JSON columns for flexible data storage
- Timestamp tracking for audit trails
- Connection pooling for serverless environments

## Migration from JSON Files

The database is seeded with existing data from `/data/*.json` files. The API endpoints have been updated to use the database while maintaining backwards compatibility.

## Production Deployment

### PlanetScale (Recommended)
1. Create a PlanetScale database
2. Get connection string from dashboard
3. Set `DATABASE_URL` in production environment
4. Deploy and run migrations

### Traditional MySQL (RDS, etc.)
1. Set up MySQL instance
2. Configure SSL if required
3. Update `DATABASE_URL` with proper SSL parameters
4. Ensure connection pooling is configured

## Connection Pooling

The database client is configured as a singleton with connection pooling suitable for serverless environments:
- Connection limit: 10
- Idle timeout: 5 minutes
- Acquire timeout: 60 seconds

## Health Check

Test database connectivity:
```bash
node -e "
import('./src/db/client.js').then(({ db }) => {
  db.execute('SELECT 1').then(() => {
    console.log('✅ Database connected successfully');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });
});
"
```
