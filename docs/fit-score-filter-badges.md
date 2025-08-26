# Fit Score Filter Badges

## Overview

The Fit Score Filter Badges component provides a horizontal filter interface for candidates based on their fit scores. This component displays badges for different fit score ranges (A, B, C, D, E, No Score) with counts showing how many candidates fall into each category.

## Features

### 1. Horizontal Filter Interface
- **Visual Badges**: Color-coded badges for each fit score range
- **Count Display**: Shows the number of candidates in each range
- **Interactive Selection**: Click to select/deselect score ranges
- **Real-time Updates**: Counts update automatically when filters change

### 2. Fit Score Ranges
- **A Grade**: 90-100% (Dark Blue)
- **B Grade**: 80-89% (Blue)
- **C Grade**: 70-79% (Medium Blue)
- **D Grade**: 60-69% (Light Blue)
- **E Grade**: 50-59% (Very Light Blue)
- **No Score**: Candidates without fit scores (Gray)

### 3. Unlimited Count Display
- **No Pagination Limits**: The fitscore horizon filter shows counts for ALL candidates without any pagination limits
- **Accurate Statistics**: Counts are calculated from the complete dataset, not just the current page
- **Real-time Updates**: Counts update immediately when other filters are applied

## Implementation

### Component Structure

```typescript
interface FitScoreFilterBadgesProps {
  selectedGrades: Set<string>;
  onGradeToggle: (grade: string) => void;
  candidateCounts?: Array<{ letter: string; count: number }>;
  title?: string;
  className?: string;
  filterMode?: 'single' | 'multi';
}
```

### API Integration

The component uses the dedicated `/api/candidates/fit-score-counts` endpoint for efficient count calculations:

```typescript
// Fetch fit score counts using dedicated endpoint
const params = new URLSearchParams();
// Add any filters (excluding fit score filters to prevent circular dependency)
const url = `/api/candidates/fit-score-counts?${params.toString()}`;
```

### Count Calculation

The counts are calculated efficiently using database-level aggregation queries:

```typescript
// Applied Fit Score Counts Query
const appliedFitScoreCountsQuery = `
  SELECT 
    CASE 
      WHEN c."fitScore" IS NULL OR c."fitScore" = 0 THEN 'no-score'
      WHEN c."fitScore" >= 0.81 THEN 'A'
      WHEN c."fitScore" >= 0.61 THEN 'B'
      WHEN c."fitScore" >= 0.41 THEN 'C'
      WHEN c."fitScore" >= 0.21 THEN 'D'
      ELSE 'E'
    END as grade,
    COUNT(*) as count
  FROM "Candidate" c
  ${whereClause}
  GROUP BY grade
  ORDER BY grade
`;

// Matching Fit Score Counts Query
const matchingFitScoreCountsQuery = `
  SELECT 
    CASE 
      WHEN best_match_score IS NULL OR best_match_score = 0 THEN 'no-score'
      WHEN best_match_score >= 0.81 THEN 'A'
      WHEN best_match_score >= 0.61 THEN 'B'
      WHEN best_match_score >= 0.41 THEN 'C'
      WHEN best_match_score >= 0.21 THEN 'D'
      ELSE 'E'
    END as grade,
    COUNT(*) as count
  FROM (
    SELECT 
      c.id,
      GREATEST(
        COALESCE(c."fitScore", 0),
        COALESCE((
          SELECT MAX(CAST(job_match->>'fitScore' AS DECIMAL))
          FROM jsonb_array_elements(c."parsedData"->'job_matches') AS job_match
          WHERE job_match->>'fitScore' IS NOT NULL
        ), 0),
        COALESCE((
          SELECT MAX(jm."fitScore")
          FROM "JobMatch" jm
          WHERE jm."candidateId" = c.id
        ), 0)
      ) as best_match_score
    FROM "Candidate" c
    ${whereClause}
  ) as candidate_scores
  GROUP BY grade
  ORDER BY grade
`;
```

## Usage

### Basic Usage

```tsx
import { FitScoreFilterBadges } from '@/components/candidates/FitScoreFilterBadges';

function CandidatesPage() {
  const [selectedGrades, setSelectedGrades] = useState(new Set());
  const [candidateCounts, setCandidateCounts] = useState([]);

  const handleGradeToggle = (grade: string) => {
    const newSelected = new Set(selectedGrades);
    if (newSelected.has(grade)) {
      newSelected.delete(grade);
    } else {
      newSelected.add(grade);
    }
    setSelectedGrades(newSelected);
  };

  return (
    <FitScoreFilterBadges
      selectedGrades={selectedGrades}
      onGradeToggle={handleGradeToggle}
      candidateCounts={candidateCounts}
      title="Applied Fit Score"
    />
  );
}
```

### Advanced Usage with Multiple Filter Types

```tsx
function CandidatesPage() {
  return (
    <div>
      {/* Applied Fit Score Filter */}
      <FitScoreFilterBadges
        selectedGrades={appliedSelectedGrades}
        onGradeToggle={handleAppliedGradeToggle}
        candidateCounts={appliedCounts}
        title="Applied Fit Score"
        filterMode="multi"
      />
      
      {/* Matching Fit Score Filter */}
      <FitScoreFilterBadges
        selectedGrades={matchingSelectedGrades}
        onGradeToggle={handleMatchingGradeToggle}
        candidateCounts={matchingCounts}
        title="Matching Fit Score"
        filterMode="multi"
      />
    </div>
  );
}
```

## Performance Considerations

### Unlimited Data Fetching
- **Efficient Queries**: Uses optimized database queries with longer timeouts for large datasets
- **Caching**: Implements response caching to improve performance
- **Background Updates**: Counts are updated in the background without blocking the UI

### Memory Management
- **Selective Data**: Only fetches necessary fields for count calculations
- **Lazy Loading**: Counts are calculated on-demand when filters change
- **Optimized Rendering**: Uses React.memo and useMemo for efficient re-renders

## API Changes

### New `/api/candidates/fit-score-counts` Endpoint

A dedicated endpoint for efficient fit score count calculations:

```typescript
// Request fit score counts with filters
GET /api/candidates/fit-score-counts?status=new&positionId=123

// Response with efficient count data
{
  "applied": [
    { "letter": "A", "count": 150 },
    { "letter": "B", "count": 300 },
    { "letter": "C", "count": 200 },
    { "letter": "D", "count": 100 },
    { "letter": "E", "count": 50 },
    { "letter": "no-score", "count": 100 }
  ],
  "matching": [
    { "letter": "A", "count": 120 },
    { "letter": "B", "count": 280 },
    { "letter": "C", "count": 220 },
    { "letter": "D", "count": 120 },
    { "letter": "E", "count": 60 },
    { "letter": "no-score", "count": 120 }
  ],
  "responseTime": "45ms"
}
```

### Performance Optimizations

- **Database Aggregation**: Uses `COUNT(*)` with `GROUP BY` for efficient counting
- **No Data Transfer**: Only count results are returned, not candidate records
- **Parallel Queries**: Applied and matching counts are calculated simultaneously
- **Caching**: 30-second cache with 60-second stale-while-revalidate

## Benefits

1. **Accurate Statistics**: Shows real counts for all candidates, not just the current page
2. **Better UX**: Users can see the complete picture of their candidate data
3. **Improved Filtering**: More informed filtering decisions based on complete data
4. **Performance**: Efficient queries with appropriate timeouts for large datasets

## Future Enhancements

- **Virtual Scrolling**: For extremely large datasets
- **Progressive Loading**: Load counts in chunks for better performance
- **Caching Strategy**: Implement more sophisticated caching for count data
