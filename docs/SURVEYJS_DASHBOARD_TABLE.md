# SurveyJS Dashboard Table View

## Overview

This feature implements the official SurveyJS Dashboard Table View using Tabulator, providing a powerful, interactive table interface for survey results with advanced filtering, sorting, and export capabilities.

## Features

### 🎯 **Core Functionality**

- **Official SurveyJS Integration**: Uses `survey-analytics` package with Tabulator
- **Advanced Data Display**: Raw survey responses in tabular format
- **Interactive Filtering**: Column-based filtering and search
- **Sorting & Pagination**: Client-side sorting and pagination
- **Export Capabilities**: CSV, PDF (with jsPDF), XLSX (with SheetJS)

### 🚀 **Performance & Scalability**

- **Client-Side Processing**: Optimized for datasets up to ~10,000 rows
- **Memory Management**: Proper cleanup and disposal of SurveyJS components
- **Lazy Loading**: Dynamic imports with SSR disabled
- **Ready for Server-Side**: Architecture prepared for future server-side pagination

## Technical Implementation

### 📦 **Dependencies**

```json
{
  "survey-analytics": "^1.9.0",
  "jspdf": "^2.4.0",
  "jspdf-autotable": "^3.5.20",
  "xlsx": "^0.18.5"
}
```

### 🏗️ **Component Architecture**

#### 1. **TableView Component** (`src/components/analytics/TableView.tsx`)

- **Client-Only**: Uses `"use client"` directive
- **SurveyJS Integration**: Imports SurveyJS Model and Tabulator
- **Export Support**: Integrates jsPDF and XLSX for export functionality
- **Memory Management**: Proper cleanup with `dispose()` and `destroy()`

#### 2. **Route Page** (`src/app/admin/table/[surveyId]/page.tsx`)

- **Dynamic Import**: Uses Next.js dynamic imports with `ssr: false`
- **Suspense Support**: Loading states and error boundaries
- **Responsive Design**: Mobile-friendly layout

#### 3. **Admin Dashboard Integration**

- **New Button**: "Dashboard Table" button added to survey rows
- **Navigation**: Direct routing to table view pages

### 🔧 **Key Implementation Details**

#### **SurveyJS Model Initialization**

```typescript
const model = useMemo(() => (schema ? new Model(schema) : null), [schema]);
```

#### **Tabulator Integration**

```typescript
const table = new SurveyTable(model, rows, { jspdf: jsPDF, xlsx: XLSX });
table.render(containerId);
```

#### **Export Configuration**

```typescript
// PDF Export with AutoTable
import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);

// Excel Export
import * as XLSX from "xlsx";
```

#### **Memory Cleanup**

```typescript
return () => {
  try {
    (panelRef.current as any)?.destroy?.();
  } catch (e) {
    console.warn("Error destroying table:", e);
  }
  try {
    (panelRef.current as any)?.dispose?.();
  } catch (e) {
    console.warn("Error disposing table:", e);
  }
  panelRef.current = null;
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = "";
};
```

## Usage

### 🎮 **Accessing the Table View**

1. **From Admin Dashboard**:

   - Navigate to `/admin/dashboard`
   - Click "Dashboard Table" button on any survey row
   - Opens `/admin/table/[surveyId]`

2. **Direct URL Access**:
   - Navigate to `/admin/table/[surveyId]`
   - Replace `[surveyId]` with actual survey ID

### 📊 **Table View Features**

#### **Data Display**

- **Question Columns**: Each survey question becomes a table column
- **Response Data**: Raw user responses displayed in cells
- **Metadata**: User ID, submission time, admin ID

#### **Interactive Features**

- **Column Sorting**: Click column headers to sort
- **Filtering**: Use filter inputs above columns
- **Search**: Global search across all data
- **Pagination**: Navigate through large datasets

#### **Export Options**

- **CSV**: Default export format, works immediately
- **PDF**: Requires jsPDF integration (configured)
- **XLSX**: Excel format with proper formatting

## API Requirements

### 📡 **Data Endpoints**

#### **Survey Schema** (`GET /api/surveys/[id]`)

```typescript
{
  id: string;
  title: string;
  description?: string;
  json: SurveyJSDefinition; // SurveyJS JSON schema
  // ... other fields
}
```

#### **Survey Results** (`GET /api/results?surveyId=[id]`)

```typescript
Array<{
  id: string;
  surveyId: string;
  userId: string;
  adminId: string;
  data: Record<string, any>; // Question responses
  submittedAt: string;
}>;
```

### 🔄 **Data Transformation**

The component expects:

- **Survey Schema**: Valid SurveyJS JSON definition
- **Results Data**: Array of objects where keys match question names
- **Consistent Format**: All results must have the same structure

## Configuration

### 🌍 **Environment Variables**

No additional environment variables required. The component uses relative URLs for API calls.

### 🎨 **Styling**

#### **CSS Imports**

```typescript
import "tabulator-tables/dist/css/tabulator.css";
import "survey-analytics/survey.analytics.tabulator.css";
```

#### **Custom Styling**

- Component uses Tailwind CSS classes
- Responsive design with mobile support
- Loading states and error handling

### ⚙️ **Performance Settings**

#### **Client-Side Processing**

- **Current**: All data loaded and processed in browser
- **Future**: Server-side pagination and filtering
- **Memory**: Optimized for datasets up to 10,000 rows

#### **Caching Strategy**

- **API Calls**: No caching (`cache: "no-store"`)
- **Component State**: React state management
- **Cleanup**: Proper disposal to prevent memory leaks

## Error Handling

### 🚨 **Error Scenarios**

1. **Survey Not Found**: 404 errors from API
2. **No Results**: Empty dataset handling
3. **Invalid Schema**: Malformed SurveyJS JSON
4. **Export Failures**: PDF/XLSX generation errors

### 🛡️ **Error Recovery**

- **Retry Mechanism**: Reload button for failed loads
- **Graceful Degradation**: Fallback to error states
- **User Feedback**: Clear error messages and loading states
- **Console Logging**: Detailed error information for debugging

## Future Enhancements

### 🚀 **Server-Side Processing**

#### **Tabulator Server-Side Mode**

```typescript
// TODO: Implement server-side data source
const table = new SurveyTable(model, [], {
  jspdf: jsPDF,
  xlsx: XLSX,
  // serverSide: true,
  // ajaxURL: `/api/results/${surveyId}/table`,
  // ajaxParams: { page, size, sort, filter }
});
```

#### **API Endpoints**

- **Paged Results**: `/api/results/[surveyId]/table?page=1&size=50`
- **Sorting**: `?sort=column&order=asc`
- **Filtering**: `?filter[column]=value`

### 📱 **Mobile Optimization**

- **Responsive Tables**: Mobile-friendly table layouts
- **Touch Gestures**: Swipe navigation and gestures
- **Progressive Loading**: Lazy loading for mobile devices

### 🔐 **Security & Access Control**

- **Admin Authentication**: Verify admin access to table views
- **Data Privacy**: Filter sensitive information
- **Export Controls**: Limit export capabilities based on permissions

## Testing

### 🧪 **Test Scripts**

```bash
# Test SurveyJS Table View setup
npm run test:surveyjs-table

# Test user fetching functionality
npm run test:user-fetch

# Test table view component
npm run test:table
```

### ✅ **Test Coverage**

- **Component Rendering**: Table view loads correctly
- **Data Fetching**: API calls work as expected
- **Export Functionality**: CSV, PDF, XLSX generation
- **Error Handling**: Graceful error recovery
- **Memory Management**: Proper cleanup and disposal

## Troubleshooting

### 🔍 **Common Issues**

#### **Table Not Rendering**

1. Check browser console for errors
2. Verify survey schema is valid SurveyJS JSON
3. Ensure results data structure matches questions
4. Check if SurveyJS license is required

#### **Export Failures**

1. **PDF**: Verify jsPDF and AutoTable are loaded
2. **XLSX**: Check XLSX library integration
3. **CSV**: Should work by default

#### **Performance Issues**

1. **Large Datasets**: Consider server-side pagination
2. **Memory Leaks**: Check cleanup implementation
3. **Slow Rendering**: Verify data structure optimization

### 🛠️ **Debug Mode**

Enable detailed logging:

```typescript
// Add to component for debugging
console.log("Survey Schema:", schema);
console.log("Results Data:", rows);
console.log("SurveyJS Model:", model);
```

## License Considerations

### ⚠️ **SurveyJS Dashboard License**

- **Development**: Works with evaluation/development license
- **Production**: Requires commercial SurveyJS Dashboard license
- **Activation**: Component ready for license activation
- **Alternatives**: Custom table implementation available if needed

### 🔄 **License-Free Alternative**

If SurveyJS Dashboard license is not available:

- Use existing custom `TableViewModal` component
- Implement custom export functionality
- Build custom filtering and sorting

## Support & Maintenance

### 📚 **Documentation Resources**

- [SurveyJS Analytics Documentation](https://surveyjs.io/Documentation/Library?id=analytics)
- [Tabulator Documentation](https://tabulator.info/docs)
- [jsPDF AutoTable Plugin](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [SheetJS XLSX Library](https://github.com/SheetJS/sheetjs)

### 🐛 **Issue Reporting**

When reporting issues:

1. **Browser Console**: Include error messages
2. **Data Sample**: Provide sample survey schema and results
3. **Steps to Reproduce**: Clear reproduction steps
4. **Environment**: Browser, OS, and version information

### 🔄 **Updates & Maintenance**

- **Dependencies**: Regular updates for security patches
- **SurveyJS**: Monitor for new features and improvements
- **Performance**: Continuous optimization and monitoring
- **Testing**: Regular testing with different data scenarios

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready (with license)
