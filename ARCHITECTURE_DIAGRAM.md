# Architecture Diagram - Multilingual Character Descriptions

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    happiness_characters Table                    │
├─────────────────────────────────────────────────────────────────┤
│ id | name | name_en | name_ar | description | description_en |  │
│    | description_ar | detailed_description_en_html |            │
│    | detailed_description_ar_html | match | avatarUrl          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Query by match code
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         getMultilingualCharacter(code, language)                │
│         src/lib/services/happiness-scoring.ts                   │
├─────────────────────────────────────────────────────────────────┤
│  • Fetches character by match code                              │
│  • Selects fields based on language (en/ar)                     │
│  • Returns: { id, name, description, detailedDescription,       │
│              avatarUrl }                                         │
│  • Fallback: language field → base field → default              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Returns character object
                              ▼
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
    ┌───────────────────────┐  ┌──────────────────────┐
    │   Results Page (UI)   │  │   PDF Generation     │
    │   results/page.tsx    │  │   generate-pdf/      │
    ├───────────────────────┤  │   route.ts           │
    │ Uses:                 │  ├──────────────────────┤
    │ • character.name      │  │ Page 1:              │
    │ • character.          │  │ • character.name     │
    │   description         │  │ • character.avatar   │
    │   (plain text)        │  │ • overall score      │
    │                       │  │                      │
    │ Display:              │  │ Page 2:              │
    │ • Avatar              │  │ • dimensions chart   │
    │ • Name                │  │ • detailed dims      │
    │ • Plain description   │  │                      │
    │ • Download PDF button │  │ Page 3 (conditional):│
    │                       │  │ • character.         │
    │ ✅ No HTML rendering  │  │   detailedDescription│
    │                       │  │   (rich HTML)        │
    │                       │  │                      │
    │                       │  │ ✅ HTML rendered     │
    └───────────────────────┘  └──────────────────────┘
```

---

## 🔄 Field Selection Logic

```
User selects language: "en" or "ar"
                │
                ▼
┌───────────────────────────────────────────────────┐
│  getMultilingualCharacter(code, language)         │
└───────────────────────────────────────────────────┘
                │
                ▼
        ┌───────┴────────┐
        │                │
        ▼                ▼
    language == "ar"   language == "en"
        │                │
        ▼                ▼
    ┌─────────┐      ┌─────────┐
    │ name_ar │      │ name_en │
    │    ↓    │      │    ↓    │
    │  name   │      │  name   │
    └─────────┘      └─────────┘
        │                │
        ▼                ▼
    ┌──────────────┐  ┌──────────────┐
    │description_ar│  │description_en│
    │      ↓       │  │      ↓       │
    │ description  │  │ description  │
    └──────────────┘  └──────────────┘
        │                │
        ▼                ▼
    ┌────────────────────────┐  ┌────────────────────────┐
    │detailed_description_   │  │detailed_description_   │
    │ar_html                 │  │en_html                 │
    │      ↓                 │  │      ↓                 │
    │   "" (empty)           │  │   "" (empty)           │
    └────────────────────────┘  └────────────────────────┘

Legend:
  field_ar/field_en  → Try language-specific field first
         ↓
      name           → Fallback to base field if null
         ↓
  "" (empty)         → Final fallback (for detailed only)
```

---

## 📄 PDF Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                        PAGE 1                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              Beyond Happiness                           │
│           Your Happiness Profile                        │
│                                                         │
│         ┌─────────────────────────┐                    │
│         │  You are a [Name]!      │                    │
│         └─────────────────────────┘                    │
│                                                         │
│              ┌───────────┐                             │
│              │           │                             │
│              │  Avatar   │                             │
│              │           │                             │
│              └───────────┘                             │
│                                                         │
│  ❌ Description removed from here                      │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                        PAGE 2                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│         Overall Happiness Score: 78%                    │
│                                                         │
│         Dimensions Overview                             │
│         ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                      │
│         │██│ │██│ │██│ │██│ │██│                      │
│         │██│ │██│ │██│ │██│ │█ │                      │
│         └──┘ └──┘ └──┘ └──┘ └──┘                      │
│          M    D    F    E    V                         │
│                                                         │
│         Detailed Dimensions                             │
│         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━            │
│         Meaning               78%                       │
│         ████████████████░░░░░░                         │
│           Type A: 80% ██████████████████░░            │
│           Type B: 75% ███████████████░░░░             │
│           Type C: 82% ████████████████████░           │
│           Type D: 76% ███████████████░░░░             │
│                                                         │
│         [Similar for other categories...]               │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                        PAGE 3                           │
│                  (Conditional - only if exists)         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│         Your Character Description                      │
│         ═══════════════════════════                    │
│                                                         │
│  ✅ Rich HTML Content Here:                            │
│                                                         │
│  You are resilient and curious. Your happiness          │
│  stems from growth and exploration.                     │
│                                                         │
│  Key Characteristics                                    │
│  • You take risks and embrace uncertainty               │
│  • You inspire others with your positive outlook        │
│  • You find joy in learning and discovery               │
│                                                         │
│  Your Strengths                                         │
│  Your unique combination of high vitality and           │
│  engagement means you thrive when actively pursuing     │
│  meaningful goals.                                      │
│                                                         │
│  Tips for Greater Happiness                             │
│  1. Continue exploring new experiences                  │
│  2. Share your enthusiasm with others                   │
│  3. Set challenging but achievable goals                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure

```
project-root/
│
├── drizzle/
│   └── 0009_add_multilingual_character_fields.sql  ← Migration
│
├── scripts/
│   └── seed-multilingual-characters.sql  ← Example data
│
├── src/
│   ├── db/
│   │   └── schema/
│   │       └── happiness.ts  ← Schema definition
│   │
│   ├── lib/
│   │   └── services/
│   │       └── happiness-scoring.ts  ← Character fetching
│   │
│   └── app/
│       ├── api/
│       │   └── generate-pdf/
│       │       └── route.ts  ← PDF generation
│       │
│       └── happiness/
│           └── [surveyId]/
│               └── results/
│                   └── page.tsx  ← Results UI
│
└── docs/
    ├── MULTILINGUAL_CHARACTER_IMPLEMENTATION.md  ← Full docs
    ├── MIGRATION_STEPS.md  ← Quick guide
    ├── IMPLEMENTATION_SUMMARY.md  ← Summary
    └── ARCHITECTURE_DIAGRAM.md  ← This file
```

---

## 🔀 Decision Flow

```
                    User completes survey
                            │
                            ▼
                    Calculate character
                    (based on scores)
                            │
                            ▼
                    Get character data
                    (with language)
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
        View Results Page       Download PDF
                │                       │
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │ Display:     │        │ Generate:    │
        │ • Name       │        │ • Page 1:    │
        │ • Avatar     │        │   Name +     │
        │ • Plain desc │        │   Avatar +   │
        │              │        │   Score      │
        │ Source:      │        │ • Page 2:    │
        │ description  │        │   Charts     │
        │              │        │ • Page 3:    │
        │              │        │   HTML desc  │
        │              │        │              │
        │              │        │ Source:      │
        │              │        │ detailed     │
        │              │        │ Description  │
        └──────────────┘        └──────────────┘
```

---

## 🌐 Language Selection

```
Survey Page → User selects language → Stored in state
                                            │
                                            ▼
                                    Passed to API calls
                                            │
                        ┌───────────────────┴───────────────────┐
                        │                                       │
                        ▼                                       ▼
            Submit Survey Results                    Generate PDF
                        │                                       │
                        ▼                                       ▼
            getMultilingualCharacter(code, "en")    generatePDFHTML(result, "en")
                        │                                       │
                        ▼                                       ▼
            Returns English fields                  Renders English content
            (or fallback to base)                   (or fallback to base)
```

---

## 📊 Database Table Relationships

```
┌─────────────────────────────────────────┐
│        happiness_characters             │
├─────────────────────────────────────────┤
│ PK: id (INT)                            │
│ UK: match (VARCHAR 5)  ← 5-bit code     │
│                                         │
│ Legacy fields (required):               │
│ • name (VARCHAR 100)                    │
│ • description (TEXT)                    │
│                                         │
│ New multilingual fields (nullable):     │
│ • name_en (VARCHAR 255)                 │
│ • name_ar (VARCHAR 255)                 │
│ • description_en (TEXT)                 │
│ • description_ar (TEXT)                 │
│ • detailed_description_en_html (TEXT)   │
│ • detailed_description_ar_html (TEXT)   │
│                                         │
│ • avatarUrl (VARCHAR 500)               │
│ • createdAt, updatedAt (TIMESTAMP)      │
└─────────────────────────────────────────┘
                    ▲
                    │ FK: character_id
                    │
┌─────────────────────────────────────────┐
│        happiness_results                │
├─────────────────────────────────────────┤
│ PK: id (VARCHAR 128)                    │
│ FK: surveyId → happiness_surveys        │
│ FK: characterId → happiness_characters  │
│ • userId (nullable)                     │
│ • answers (JSON)                        │
│ • categoryTotals (JSON)                 │
│ • code (VARCHAR 10)                     │
│ • language (VARCHAR 10)                 │
└─────────────────────────────────────────┘
```

---

## 🎯 Key Design Decisions

### 1. Separation of Content Types

```
Plain Text (description_en/ar)
    ↓
Used in: Results Page UI
Purpose: Quick, readable summary
Format:  Plain text, no formatting

Rich HTML (detailed_description_en_html/ar_html)
    ↓
Used in: PDF only (page 3)
Purpose: Comprehensive, formatted description
Format:  HTML with lists, emphasis, headings
```

### 2. Fallback Strategy

```
Try: language-specific field (e.g., name_en)
  ↓ if NULL
Try: base field (e.g., name)
  ↓ if NULL (for detailed only)
Use: empty string ""
```

### 3. Backward Compatibility

```
Old data (no multilingual fields)
    ↓
Fallback to base fields
    ↓
System continues to work
    ↓
No breaking changes
```

---

## 🔐 Data Integrity

### Required Fields

- `name` (VARCHAR 100) - NOT NULL
- `description` (TEXT) - NOT NULL
- `match` (VARCHAR 5) - NOT NULL, UNIQUE

### Optional Fields

- All multilingual fields are nullable
- System gracefully handles missing data
- Fallback ensures no empty displays

### Validation Rules

1. `match` must be 5-character binary string (e.g., "10110")
2. `avatarUrl` should point to valid image or be NULL
3. HTML content should be sanitized (future enhancement)
4. Character names should be unique per language

---

This architecture ensures clean separation between UI and PDF content while maintaining full backward compatibility.











