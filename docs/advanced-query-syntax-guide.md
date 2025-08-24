# Advanced Query Syntax Guide

## Overview

The Advanced Query Syntax Guide provides users with comprehensive documentation on how to use the advanced search functionality in the candidate filters. This feature helps users write precise search queries to find candidates with specific criteria.

## Features

### 1. **Interactive Modal**
- Accessible via the FileText icon button next to "Advanced Query Syntax" label
- Comprehensive documentation with examples
- Copy-to-clipboard functionality for all examples
- Responsive design that works on all screen sizes

### 2. **Search Field Documentation**
The guide covers all available search fields:

#### Basic Information
- **name**: Search by candidate name
- **email**: Search by email address
- **phone**: Search by phone number

#### Skills & Experience
- **skills**: Search by skills (comma-separated for multiple)
- **minExperienceYears**: Minimum experience years
- **maxExperienceYears**: Maximum experience years

#### Fit Scores
- **minFitScore**: Minimum fit score percentage (0-100)
- **maxFitScore**: Maximum fit score percentage (0-100)

#### Application Status
- **status**: Application status (can combine multiple with commas)
- **position**: Position title

#### Location & Education
- **location**: Candidate location
- **education**: Education/degree information

#### Recruiter & Source
- **recruiter**: Assigned recruiter name
- **source**: Candidate source

### 3. **Search Examples**

#### Basic Search Examples
```
name:John
email:john@example.com
phone:+1234567890
```

#### Skills & Experience Examples
```
skills:React
skills:Python,JavaScript
minExperienceYears:5
maxExperienceYears:10
```

#### Fit Score Examples
```
minFitScore:80
maxFitScore:30
minFitScore:70 maxFitScore:90
```

#### Status & Position Examples
```
status:Applied
status:Applied,Screening
position:Software Engineer
```

#### Complex Query Examples
```
minFitScore:80 status:Applied skills:React
location:San Francisco minExperienceYears:3 skills:Python,JavaScript
minFitScore:70 maxFitScore:90 status:Screening position:Senior Engineer
```

### 4. **Pro Tips**
- Use comma-separated values for multiple options: `status:Applied,Screening`
- Combine multiple filters for precise searches
- Fit scores are percentages (0-100), not decimals
- Text searches are case-insensitive
- Use quotes for values with spaces: `name:"John Smith"`

## Implementation Details

### Component Structure
- **AdvancedQuerySyntaxModal.tsx**: Main modal component
- **CandidateFilters.tsx**: Parent component with modal integration

### State Management
```typescript
const [isAdvancedQuerySyntaxModalOpen, setIsAdvancedQuerySyntaxModalOpen] = useState(false);
```

### Modal Integration
The modal is triggered by clicking the FileText icon button in the Advanced Query tab:

```typescript
<Button 
  variant="ghost" 
  size="icon" 
  className="p-1 h-6 w-6" 
  type="button"
  onClick={() => setIsAdvancedQuerySyntaxModalOpen(true)}
>
  <FileText className="w-4 h-4 text-blue-600" />
</Button>
```

### Copy-to-Clipboard Functionality
- Uses the browser's Clipboard API
- Provides visual feedback with toast notifications
- Handles errors gracefully

## Usage Instructions

### For Users
1. Navigate to the Candidates page
2. Click on the "Filters" button to open the filter modal
3. Switch to the "Advanced" tab
4. Click the FileText icon next to "Advanced Query Syntax"
5. Browse the documentation and examples
6. Click the copy button next to any example to copy it to clipboard
7. Paste the example into the query textarea and modify as needed

### For Developers
The modal component is self-contained and can be easily extended:

1. **Add New Examples**: Modify the `examples` array in the component
2. **Add New Fields**: Update the field documentation section
3. **Customize Styling**: Modify the CSS classes and styling
4. **Add New Features**: Extend the component with additional functionality

## Technical Notes

### Dependencies
- React hooks for state management
- Radix UI Dialog for modal functionality
- Lucide React for icons
- React Hot Toast for notifications
- Tailwind CSS for styling

### Browser Compatibility
- Requires modern browser with Clipboard API support
- Graceful fallback for older browsers
- Responsive design for mobile devices

### Performance
- Modal content is rendered only when opened
- Efficient state management with React hooks
- Minimal re-renders with proper dependency arrays

## Future Enhancements

### Potential Improvements
1. **Search within Examples**: Add a search box to filter examples
2. **Favorite Examples**: Allow users to save frequently used queries
3. **Query Builder**: Visual query builder interface
4. **Query History**: Track and suggest previously used queries
5. **Export/Import**: Save and share query configurations

### Accessibility Improvements
1. **Keyboard Navigation**: Full keyboard support for modal
2. **Screen Reader**: Enhanced ARIA labels and descriptions
3. **High Contrast**: Better support for high contrast themes
4. **Focus Management**: Proper focus trapping and restoration
