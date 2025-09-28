# PDF Reports Directory

This directory can be used to store pre-generated PDF templates or mock PDFs for happiness survey results.

## Current Implementation

The current implementation generates PDFs dynamically using jsPDF when the user clicks the "Download Your Report" button. This provides:

- Real-time generation with actual user data
- Multilingual support (English/Arabic)
- Personalized content based on survey results
- Proper character names and descriptions

## Alternative: Static PDF Templates

If you prefer to use static PDF templates, you can:

1. Create PDF files for each character (32 total)
2. Name them using the character code: `00000.pdf`, `00001.pdf`, etc.
3. Update the download logic to serve static files instead of generating dynamically

## File Naming Convention

For static PDFs, use the character match code:

- `00000.pdf` - Character with match code "00000"
- `00001.pdf` - Character with match code "00001"
- `00010.pdf` - Character with match code "00010"
- ... and so on for all 32 characters

## Dynamic vs Static Approach

**Dynamic Generation (Current):**

- ✅ Personalized with actual scores
- ✅ Real-time multilingual support
- ✅ Always up-to-date content
- ✅ Smaller storage footprint

**Static Templates:**

- ✅ Faster download (no generation time)
- ✅ Consistent design
- ❌ Generic content only
- ❌ Larger storage requirements
- ❌ Manual updates needed for changes
