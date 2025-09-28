# 📊 Complete Database Structure and Logic Documentation

## **Database Overview**
- **Database Type**: SQLite
- **ORM**: Drizzle ORM
- **ID Generation**: CUID2 for unique identifiers
- **Timestamps**: Unix timestamps (milliseconds since epoch)

---

## **🏗️ Core Tables Structure**

### **1. Users Table** (`users`)
**Purpose**: Store user accounts and authentication data

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `email` | TEXT | User email address | NOT NULL, UNIQUE |
| `name` | TEXT | User full name | Optional |
| `phone` | TEXT | Phone number | Optional |
| `otp` | TEXT | One-time password for auth | Optional |
| `status` | TEXT | Account status | DEFAULT 'active' |
| `companyId` | TEXT | Associated company ID | Optional |
| `companyName` | TEXT | Company name (denormalized) | Optional |
| `createdAt` | INTEGER | Creation timestamp | AUTO |
| `updatedAt` | INTEGER | Last update timestamp | AUTO |

**Indexes**: `email_idx`, `status_idx`, `user_company_id_idx`

---

### **2. Companies Table** (`companies`)
**Purpose**: Store company/organization information

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `name` | TEXT | Company name | NOT NULL |
| `description` | TEXT | Company description | Optional |
| `createdAt` | INTEGER | Creation timestamp | AUTO |
| `updatedAt` | INTEGER | Last update timestamp | AUTO |

**Indexes**: `company_name_idx`, `company_created_at_idx`

---

### **3. Admins Table** (`admins`)
**Purpose**: Store administrator accounts

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `email` | TEXT | Admin email address | NOT NULL, UNIQUE |
| `password` | TEXT | Hashed password | NOT NULL |
| `name` | TEXT | Admin full name | NOT NULL |
| `createdAt` | TEXT | Creation timestamp (ISO) | AUTO |
| `updatedAt` | TEXT | Last update timestamp (ISO) | AUTO |

**Indexes**: `admin_email_idx`

---

## **📋 Survey System Tables**

### **4. Surveys Table** (`surveys`)
**Purpose**: Store regular SurveyJS surveys

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `title` | TEXT | Survey title | NOT NULL |
| `description` | TEXT | Survey description | Optional |
| `definition` | TEXT | SurveyJS JSON definition | NOT NULL |
| `canTakeMultiple` | INTEGER | Allow multiple submissions | DEFAULT 0 |
| `isAnonymous` | INTEGER | Anonymous survey flag | DEFAULT 0 |
| `companyId` | TEXT | Associated company ID | Optional |
| `companyName` | TEXT | Company name (denormalized) | Optional |
| `metadata` | TEXT | Additional JSON metadata | Optional |
| `isActive` | INTEGER | Visible in forms | DEFAULT 1 |
| `isPublished` | INTEGER | Not deleted | DEFAULT 1 |
| `createdBy` | TEXT | Admin who created | NOT NULL |
| `createdAt` | TEXT | Creation timestamp | AUTO |
| `updatedAt` | TEXT | Last update timestamp | AUTO |

**Indexes**: `survey_created_by_idx`, `survey_created_at_idx`, `survey_company_id_idx`

---

### **5. Results Table** (`results`)
**Purpose**: Store regular survey responses

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `surveyId` | TEXT | Reference to survey | NOT NULL, FK |
| `userId` | TEXT | Reference to user | Optional, FK |
| `adminId` | TEXT | Reference to admin | Optional, FK |
| `data` | TEXT | Survey response JSON | NOT NULL |
| `submittedAt` | INTEGER | Submission timestamp | AUTO |

**Indexes**: `result_survey_id_idx`, `result_user_id_idx`, `result_submitted_at_idx`, `result_survey_user_idx`

---

### **6. User Assignments Table** (`user_assignments`)
**Purpose**: Assign surveys to users

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `userId` | TEXT | Reference to user | NOT NULL, FK |
| `surveyId` | TEXT | Reference to survey | NOT NULL, FK |
| `assignedAt` | INTEGER | Assignment timestamp | AUTO |
| `dueAt` | INTEGER | Due date timestamp | Optional |
| `status` | TEXT | Assignment status | DEFAULT 'pending' |

**Primary Key**: Composite (`userId`, `surveyId`)
**Indexes**: `assignment_survey_idx`, `assignment_user_idx`, `assignment_status_idx`, `assignment_due_at_idx`

---

## **😊 Happiness Survey System Tables**

### **7. Happiness Questions Table** (`happiness_questions`)
**Purpose**: Store the 40 happiness survey questions

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | INTEGER | Primary key (1-40) | PRIMARY KEY |
| `text` | TEXT | Question text | NOT NULL |
| `category` | TEXT | Category enum | NOT NULL |
| `values` | TEXT | JSON array of score values | NOT NULL |
| `isActive` | INTEGER | Question active flag | DEFAULT 1 |
| `createdAt` | INTEGER | Creation timestamp | AUTO |
| `updatedAt` | INTEGER | Last update timestamp | AUTO |

**Categories**: `Meaning`, `Delight`, `Freedom`, `Engagement`, `Vitality`
**Indexes**: `happiness_questions_category_idx`, `happiness_questions_is_active_idx`

---

### **8. Happiness Characters Table** (`happiness_characters`)
**Purpose**: Store the 32 happiness character profiles

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | INTEGER | Primary key (1-32) | PRIMARY KEY |
| `name` | TEXT | Character name | NOT NULL |
| `description` | TEXT | Character description | NOT NULL |
| `match` | TEXT | 5-bit binary code | NOT NULL, LENGTH 5 |
| `avatarUrl` | TEXT | Avatar image URL | Optional |
| `createdAt` | INTEGER | Creation timestamp | AUTO |
| `updatedAt` | INTEGER | Last update timestamp | AUTO |

**Indexes**: `happiness_characters_match_idx`

---

### **9. Happiness Surveys Table** (`happiness_surveys`)
**Purpose**: Store happiness survey configurations

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `title` | TEXT | Survey title | NOT NULL |
| `anonymous` | INTEGER | Anonymous survey flag | DEFAULT 0 |
| `retakeCooldownDays` | INTEGER | Days before retake allowed | DEFAULT 0 |
| `companyId` | TEXT | Associated company ID | Optional |
| `companyName` | TEXT | Company name (denormalized) | Optional |
| `isActive` | INTEGER | Visible in forms | DEFAULT 1 |
| `isPublished` | INTEGER | Not deleted | DEFAULT 1 |
| `createdAt` | INTEGER | Creation timestamp | AUTO |
| `updatedAt` | INTEGER | Last update timestamp | AUTO |

---

### **10. Happiness Results Table** (`happiness_results`)
**Purpose**: Store happiness survey responses and calculated results

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `surveyId` | TEXT | Reference to happiness survey | NOT NULL, FK |
| `userId` | TEXT | Reference to user | Optional, FK |
| `answers` | TEXT | JSON array of answers | NOT NULL |
| `categoryTotals` | TEXT | JSON object of category scores | NOT NULL |
| `code` | TEXT | 5-bit character code | NOT NULL, LENGTH 5 |
| `characterId` | INTEGER | Reference to character | NOT NULL, FK |
| `language` | TEXT | Survey language ('en'/'ar') | DEFAULT 'en' |
| `createdAt` | INTEGER | Submission timestamp | AUTO |

**Indexes**: `happiness_results_survey_user_idx`, `happiness_results_survey_idx`, `happiness_results_user_idx`, `happiness_results_code_idx`

---

### **11. Happiness Assignments Table** (`happiness_assignments`)
**Purpose**: Assign happiness surveys to users

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `surveyId` | TEXT | Reference to happiness survey | NOT NULL, FK |
| `userId` | TEXT | Reference to user | NOT NULL |
| `assignedBy` | TEXT | Admin who assigned | Optional |
| `assignedAt` | INTEGER | Assignment timestamp | AUTO |
| `completedAt` | INTEGER | Completion timestamp | Optional |
| `isActive` | INTEGER | Assignment active flag | DEFAULT 1 |
| `notes` | TEXT | Assignment notes | Optional |

**Indexes**: `happiness_assignments_survey_user_idx`, `happiness_assignments_user_idx`, `happiness_assignments_survey_idx`

---

## **🔗 Association Tables**

### **12. Survey Company Assignments** (`survey_company_assignments`)
**Purpose**: Link regular surveys to companies

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `surveyId` | TEXT | Reference to survey | NOT NULL, FK |
| `companyId` | TEXT | Reference to company | NOT NULL, FK |
| `assignedAt` | INTEGER | Assignment timestamp | AUTO |
| `assignedBy` | TEXT | Admin who assigned | Optional |

---

### **13. Happiness Survey Company Assignments** (`happiness_survey_company_assignments`)
**Purpose**: Link happiness surveys to companies

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `surveyId` | TEXT | Reference to happiness survey | NOT NULL, FK |
| `companyId` | TEXT | Reference to company | NOT NULL, FK |
| `assignedAt` | INTEGER | Assignment timestamp | AUTO |
| `assignedBy` | TEXT | Admin who assigned | Optional |

---

### **14. User Survey Sessions** (`user_survey_sessions`)
**Purpose**: Track user survey sessions and progress

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Primary key (CUID2) | PRIMARY KEY |
| `userId` | TEXT | Reference to user | NOT NULL, FK |
| `surveyId` | TEXT | Reference to survey | NOT NULL, FK |
| `surveyConfig` | TEXT | Survey definition snapshot | NOT NULL |
| `surveyTitle` | TEXT | Survey title snapshot | NOT NULL |
| `surveyDescription` | TEXT | Survey description snapshot | Optional |
| `canTakeMultiple` | INTEGER | Multiple submissions flag | DEFAULT 0 |
| `isAnonymous` | INTEGER | Anonymous flag | DEFAULT 0 |
| `status` | TEXT | Session status | DEFAULT 'active' |
| `progress` | TEXT | Current progress JSON | Optional |
| `createdAt` | INTEGER | Creation timestamp | AUTO |
| `updatedAt` | INTEGER | Last update timestamp | AUTO |
| `expiresAt` | INTEGER | Session expiry timestamp | Optional |
| `completedAt` | INTEGER | Completion timestamp | Optional |

**Indexes**: Multiple indexes for performance optimization

---

## **🔄 Business Logic and Relationships**

### **User Management Flow**
1. **User Creation**: Users created with email, optional company assignment
2. **Company Assignment**: Users can be assigned to companies for automatic survey access
3. **Survey Assignment**: Users get surveys through:
   - Direct assignment (`user_assignments`)
   - Company-based assignment (`survey_company_assignments`)
   - Happiness survey assignment (`happiness_assignments`)

### **Survey System Flow**
1. **Regular Surveys**: Created by admins, stored in `surveys` table
2. **Survey Assignment**: Assigned to users or companies
3. **Response Collection**: Responses stored in `results` table
4. **Session Management**: Progress tracked in `user_survey_sessions`

### **Happiness Survey Flow**
1. **Question Pool**: 40 questions across 5 categories (8 questions each)
2. **Character Matching**: 32 characters with 5-bit binary codes
3. **Scoring Algorithm**: 
   - Each question has 5 answer choices with different point values
   - Category totals calculated from question responses
   - 5-bit code generated based on category thresholds
   - Character matched using binary code
4. **Multilingual Support**: Questions and results support English/Arabic
5. **Cooldown System**: Prevents retaking for specified days

### **Company Integration**
- Companies can have surveys automatically assigned
- Users inherit company survey assignments
- Denormalized company names for performance

### **Authentication System**
- **Users**: Email + OTP authentication
- **Admins**: Email + password authentication
- **Anonymous**: Supported for both survey types

---

## **📊 Data Flow Examples**

### **Happiness Survey Submission**
1. User accesses happiness survey
2. Answers stored as JSON array: `[{questionId: 1, valueIndex: 3}, ...]`
3. Category totals calculated: `{Meaning: 7500, Delight: 8200, ...}`
4. 5-bit code generated: `"01101"`
5. Character matched using code
6. Result stored in `happiness_results`

### **User Assignment Process**
1. Admin creates user with company
2. Company has surveys assigned via `survey_company_assignments`
3. User automatically gets access to company surveys
4. Additional surveys can be assigned directly via `user_assignments`

### **Export Process**
1. Admin requests export from results page
2. System fetches ALL results (not paginated)
3. Includes 5-bit character codes and category scores
4. Generates Excel file with proper formatting

---

## **🔍 Key Performance Optimizations**

### **Indexing Strategy**
- **Primary lookups**: All tables have primary key indexes
- **Foreign key lookups**: Indexed for join performance
- **Search fields**: Email, status, dates indexed
- **Composite indexes**: User-survey combinations for assignment queries

### **Denormalization**
- Company names stored in users/surveys for faster queries
- Survey snapshots in sessions prevent configuration drift
- Character names cached with results

### **Query Patterns**
- **User dashboard**: Single query with joins for assigned surveys
- **Admin analytics**: Aggregated queries with proper indexing
- **Export operations**: Batch queries with pagination support
- **Session management**: Efficient cleanup with expiry indexes

---

## **🛡️ Data Integrity**

### **Foreign Key Constraints**
- Cascade deletes for user/survey relationships
- Referential integrity maintained across all associations

### **Validation Rules**
- Email uniqueness enforced at database level
- Required fields validated in application layer
- JSON fields validated before storage

### **Backup Strategy**
- SQLite database file backed up regularly
- Migration scripts versioned in `drizzle/` directory
- Schema changes tracked through Drizzle migrations

---

This documentation covers the complete database structure and business logic of the SurveyJS Next.js application, including both regular surveys and the specialized happiness survey system.
