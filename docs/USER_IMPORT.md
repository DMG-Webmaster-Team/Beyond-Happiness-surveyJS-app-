# User Import & Management System

## Overview

The User Import & Management System allows administrators to bulk import users from Excel/CSV files and manage user accounts with high performance and data integrity.

## Features

- **Bulk User Import**: Upload Excel (.xlsx, .xls) or CSV files
- **Dry Run Validation**: Validate files before importing
- **User Management**: Full CRUD operations for users
- **Survey Assignments**: Automatically assign users to surveys
- **High Performance**: Optimized for large files (up to 50,000 rows)
- **Data Integrity**: Foreign key constraints and validation

## File Format

### CSV Template

Download the template from the admin interface or use this format:

```csv
email,name
user1@example.com,John Doe
user2@example.com,Jane Smith
user3@example.com,Bob Johnson
```

### Column Descriptions

| Column  | Required | Description                   | Example            |
| ------- | -------- | ----------------------------- | ------------------ |
| `email` | ✅       | User's email address (unique) | `user@example.com` |
| `name`  | ❌       | User's full name              | `John Doe`         |

**Note:** Survey assignment is now handled through the UI dropdown selection. All users in the uploaded file will be assigned to the selected survey.

### Default Values

- **User Status**: Automatically set to "active"
- **Assignment Status**: Automatically set to "pending"
- **Survey Assignment**: All users are assigned to the survey selected in the dropdown

## Usage

### 1. Access User Management

Navigate to `/admin/users` in your admin panel.

### 2. Import Users

1. **Select Survey**: Choose which survey to assign users to from the dropdown
2. **Upload File**: Drag and drop or click to select an Excel/CSV file
3. **Dry Run**: Check "Dry run" to validate without importing
4. **Validate**: Click "Validate File" to check for errors
5. **Review**: Check validation results and error details
6. **Import**: Click "Confirm Import" to process valid rows

### 3. Manage Users

Switch to the "Manage Users" tab to:

- View all users with pagination
- Search users by email or name
- Filter by status
- Edit user information and survey assignments
- Delete users (soft delete)

#### Editing User Survey Assignments

When editing a user, you can:

- Modify user name and status
- **Select/Deselect Surveys**: Choose which surveys the user should be assigned to
- **Multiple Selection**: Use checkboxes to assign multiple surveys to a single user
- **Real-time Updates**: Changes are immediately reflected in the database
- **Assignment Status**: New assignments default to "pending" status

## File Limits

- **File Size**: Maximum 10MB
- **Row Count**: Maximum 50,000 rows
- **Supported Formats**: Excel (.xlsx, .xls), CSV (.csv)

## Performance Optimizations

### Database Settings

The system automatically applies these SQLite optimizations:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -64000;  -- 64MB cache
PRAGMA mmap_size = 268435456; -- 256MB mmap
PRAGMA foreign_keys = ON;
```

### Import Process

1. **Batch Lookups**: Pre-load existing users and surveys
2. **Single Transaction**: All operations in one database transaction
3. **Prepared Statements**: Use Drizzle ORM for optimized queries
4. **Memory Management**: Process rows efficiently without memory leaks

## Error Handling

### Validation Errors

- **Missing Required Fields**: Email and surveyId are required
- **Invalid Email Format**: Must be valid email address
- **Invalid Date Format**: Due dates must be parseable
- **File Format Issues**: Unsupported file types or corrupted files

### Import Errors

- **Database Constraints**: Foreign key violations
- **Duplicate Emails**: Users with same email (handled by upsert)
- **Survey Not Found**: SurveyId doesn't exist (creates if title provided)

### Error Reporting

Errors are displayed in a table showing:

- Row number
- Raw data
- Specific error message

## API Endpoints

### Import Users

```
POST /api/admin/import-users
Content-Type: multipart/form-data

Fields:
- file: Excel/CSV file
- dryRun: "1" for validation only, "0" for import
```

### User Management

```
GET    /api/users?query=&page=&limit=&status=
POST   /api/users
GET    /api/users/[id]
PATCH  /api/users/[id]
DELETE /api/users/[id]
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  otp TEXT,
  status TEXT DEFAULT 'active',
  company_id INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);
```

### User Assignments Table

```sql
CREATE TABLE user_assignments (
  user_id TEXT NOT NULL,
  survey_id TEXT NOT NULL,
  assigned_at INTEGER,
  due_at INTEGER,
  status TEXT DEFAULT 'pending',
  PRIMARY KEY (user_id, survey_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);
```

## Troubleshooting

### Common Issues

1. **File Too Large**: Reduce file size or split into smaller files
2. **Invalid Format**: Ensure file is valid Excel or CSV
3. **Memory Issues**: Check server memory limits for large imports
4. **Database Locks**: Ensure no other processes are writing to database

### Performance Tips

1. **Use CSV**: CSV files are faster to process than Excel
2. **Batch Size**: Process files in chunks of 10,000 rows
3. **Server Resources**: Ensure adequate memory and CPU for large imports
4. **Database Indexes**: All necessary indexes are created automatically

## Security Considerations

- **File Validation**: Strict file type and size validation
- **Input Sanitization**: All data is validated and sanitized
- **SQL Injection**: Protected by Drizzle ORM
- **Access Control**: Admin-only access required

## Support

For issues or questions:

1. Check the error messages in the UI
2. Review the browser console for detailed logs
3. Check server logs for backend errors
4. Ensure database permissions are correct
