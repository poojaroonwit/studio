# User Management Pagination

## Overview

The User Management section now includes comprehensive pagination functionality to handle large numbers of users efficiently. This feature improves performance and user experience when managing extensive user lists.

## Features

### 1. Server-Side Pagination
- **API Support**: The `/api/users` endpoint now supports pagination parameters
- **Efficient Queries**: Uses database-level pagination with `skip` and `take` parameters
- **Total Count**: Returns accurate total count for pagination calculations

### 2. Frontend Pagination Controls
- **Page Navigation**: First, previous, next, and last page buttons
- **Page Size Selection**: Configurable items per page (5, 10, 20, 50)
- **Current Page Display**: Shows current page and total pages
- **Responsive Design**: Works on all screen sizes

### 3. Filter Integration
- **Filter Persistence**: Pagination works seamlessly with existing filters
- **Filter Reset**: Applying or resetting filters automatically resets to page 1
- **Combined Queries**: Filters and pagination work together in API calls

## API Changes

### Request Parameters
The `/api/users` endpoint now accepts these additional parameters:

```typescript
// Pagination parameters
page?: number        // Current page (default: 1)
pageSize?: number    // Items per page (default: 10)

// Existing filter parameters
name?: string        // Filter by name
email?: string       // Filter by email
role?: string        // Filter by role
```

### Response Format
The API now returns a structured response with pagination metadata:

```typescript
{
  users: UserProfile[],           // Array of users for current page
  pagination: {
    currentPage: number,          // Current page number
    totalPages: number,           // Total number of pages
    totalCount: number,           // Total number of users
    pageSize: number             // Items per page
  }
}
```

## Frontend Implementation

### State Management
The User Management page now includes pagination state:

```typescript
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const [totalPages, setTotalPages] = useState(1);
const [totalCount, setTotalCount] = useState(0);
```

### Event Handlers
- `handlePageChange(page)`: Navigate to specific page
- `handlePageSizeChange(pageSize)`: Change items per page
- Filter handlers automatically reset to page 1

### UI Components
- **Pagination Component**: Reusable pagination controls
- **Conditional Display**: Only shows when multiple pages exist
- **Loading States**: Proper loading indicators during page changes

## Usage Examples

### Basic Pagination
```typescript
// Navigate to page 2
handlePageChange(2);

// Change page size to 20
handlePageSizeChange(20);
```

### With Filters
```typescript
// Apply filters (resets to page 1)
handleApplyFilters();

// Navigate with active filters
handlePageChange(3); // Goes to page 3 with current filters
```

## Backward Compatibility

The implementation maintains full backward compatibility:

- **API**: Handles both old array format and new paginated format
- **Frontend**: Gracefully handles both response types
- **Existing Features**: All existing functionality remains unchanged

## Performance Benefits

1. **Reduced Memory Usage**: Only loads current page of users
2. **Faster Initial Load**: Smaller data payloads
3. **Better UX**: Responsive navigation for large datasets
4. **Database Efficiency**: Optimized queries with proper indexing

## Testing

The pagination functionality includes comprehensive tests covering:

- API pagination parameters
- Filter integration
- Error handling
- Edge cases (empty results, single page)
- Database error scenarios

## Future Enhancements

Potential improvements for future versions:

1. **URL State**: Pagination state in URL parameters
2. **Infinite Scroll**: Alternative to pagination controls
3. **Bulk Operations**: Select across multiple pages
4. **Export Pagination**: Export current page or all filtered results
5. **Advanced Sorting**: Sort by different columns with pagination
