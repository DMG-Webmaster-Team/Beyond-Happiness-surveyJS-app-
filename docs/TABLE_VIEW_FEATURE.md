# Table View Feature Documentation

## Overview

The **Table View** feature provides a comprehensive, spreadsheet-like view of survey results in the admin dashboard. It displays all survey submissions in a structured table format with the ability to export data to CSV.

## Features

### 🎯 **Core Functionality**

- **Tabular Display**: Shows survey results in a clean, organized table format
- **Dynamic Columns**: Automatically generates columns based on survey questions
- **Data Processing**: Intelligently parses and formats survey response data
- **CSV Export**: Download results as a CSV file for external analysis

### 📊 **Table Structure**

The table includes the following standard columns:

- **#**: Sequential row number
- **User**: User's name (falls back to email if no name, then to User ID if no email)
- **Email**: User's email address
- **Submitted**: Timestamp of submission
- **Admin ID**: Administrator who created the survey
- **Question Columns**: Dynamic columns for each survey question (using question titles)

### 🔧 **Technical Implementation**

- **Component**: `src/components/TableViewModal.tsx`
- **Integration**: Added to admin dashboard alongside Results and Analytics
- **Data Source**: Uses existing `/api/results/[surveyId]` endpoint
- **State Management**: React hooks for data processing and UI state

## Usage

### **Accessing Table View**

1. Navigate to **Admin Dashboard** (`/admin/dashboard`)
2. Find the survey you want to analyze
3. Click the **"Table View"** button (purple button)
4. The modal will open displaying the table

### **Table View Interface**

- **Header**: Shows survey title and close button
- **Export Button**: Green "Export to CSV" button at the top right
- **Table**: Scrollable table with all survey results
- **Summary**: Row count and column count at the bottom

### **CSV Export**

1. Click **"Export to CSV"** button
2. File automatically downloads with filename: `{survey_title}_results.csv`
3. CSV includes all table data with proper escaping for special characters

## Data Processing

### **Survey Definition Parsing**

- Extracts question titles from SurveyJS JSON definition
- Maps question names to human-readable titles
- Handles both string and object survey definitions

### **Response Data Formatting**

- **Arrays**: Converted to comma-separated strings
- **Booleans**: Converted to "Yes"/"No"
- **Null/Undefined**: Displayed as "-"
- **Strings**: Displayed as-is
- **Objects**: JSON stringified

### **Column Generation**

- Automatically detects all unique question responses
- Orders columns logically (metadata first, then questions)
- Handles missing data gracefully

### **User Information Enhancement**

- **Smart Display Names**: Shows user names when available, falls back to email (never shows User ID)
- **Email Column**: Always displays user email for easy identification
- **Batch User Fetching**: Efficiently fetches user data for all results in parallel
- **Graceful Fallbacks**: Handles missing user information gracefully
- **Consistent with Results**: Both Table View and Results modal use the same display logic

## Integration Points

### **Admin Dashboard**

- Added as a new button alongside existing Results and Analytics buttons
- Uses the same modal pattern for consistency
- Maintains existing state management patterns

### **API Endpoints**

- **Results**: `/api/results/[surveyId]` - Fetches survey results
- **Survey**: `/api/surveys/[surveyId]` - Fetches survey definition
- **Users**: `/api/users/[id]` - Fetches user information for display names

### **Component Dependencies**

- **useSWR**: For data fetching and caching
- **React Hooks**: useState, useEffect for state management
- **Tailwind CSS**: For styling and responsive design

## Benefits

### **For Administrators**

- **Quick Overview**: See all responses at a glance
- **Data Export**: Easy CSV download for external analysis
- **Question Mapping**: Clear correlation between responses and questions
- **Consistent UI**: Follows existing modal design patterns
- **User-Friendly Display**: Both Table View and Results show names/emails instead of cryptic User IDs

### **For Data Analysis**

- **Structured Format**: Tabular data ready for spreadsheet applications
- **Complete Dataset**: All responses in one view
- **Question Context**: Question titles instead of technical names
- **Export Ready**: Direct CSV download for further processing

## Technical Details

### **Performance Considerations**

- **Lazy Loading**: Data fetched only when modal opens
- **Efficient Processing**: Data processed once and cached
- **Responsive Design**: Handles large datasets gracefully

### **Error Handling**

- **Graceful Degradation**: Shows appropriate messages for missing data
- **Loading States**: Clear feedback during data processing
- **Error Recovery**: Retry options for failed requests

### **Accessibility**

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels and semantic HTML
- **Responsive**: Works on all device sizes

## Future Enhancements

### **Potential Improvements**

- **Sorting**: Click column headers to sort data
- **Filtering**: Filter results by specific criteria
- **Pagination**: Handle very large datasets
- **Real-time Updates**: Live data refresh
- **Advanced Export**: Excel, JSON, or other formats

### **Customization Options**

- **Column Selection**: Choose which columns to display
- **Date Range**: Filter by submission date
- **User Groups**: Filter by specific user categories
- **Question Types**: Different display formats for different question types

## Troubleshooting

### **Common Issues**

1. **Empty Table**: Check if survey has submissions
2. **Missing Questions**: Verify survey definition is valid
3. **Export Fails**: Check browser download settings
4. **Slow Loading**: Large datasets may take time to process

### **Debug Information**

- Check browser console for error messages
- Verify API endpoints are responding correctly
- Confirm survey data structure is valid

## Conclusion

The Table View feature provides administrators with a powerful, user-friendly way to analyze survey results. It combines the simplicity of a spreadsheet view with the power of SurveyJS data processing, making it easy to understand and export survey data for further analysis.
