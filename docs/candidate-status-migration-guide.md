# Candidate Status Migration Guide

## Overview
The candidate status field has been updated from a simple string to a foreign key reference to the `RecruitmentStage.id`. This change improves data integrity and allows for better stage management.

## Database Changes

### Before (Old Structure)
```sql
-- Candidate table had a simple string status field
status TEXT NOT NULL DEFAULT 'Applied'
```

### After (New Structure)
```sql
-- Candidate table now has a foreign key to RecruitmentStage
status UUID NOT NULL REFERENCES "RecruitmentStage"(id)
```

## Prisma Schema Changes

### Candidate Model
```prisma
model Candidate {
  // ... other fields
  status                  String             @db.Uuid  // Now references RecruitmentStage.id
  recruitmentStage        RecruitmentStage   @relation("RecruitmentStageCandidates", fields: [status], references: [id])
  // ... other fields
}
```

### RecruitmentStage Model
```prisma
model RecruitmentStage {
  // ... other fields
  candidates     Candidate[] @relation("RecruitmentStageCandidates")
  // ... other fields
}
```

## TypeScript Interface Changes

### Before
```typescript
export interface Candidate {
  // ... other fields
  status: CandidateStatus; // string type
  // ... other fields
}
```

### After
```typescript
export interface Candidate {
  // ... other fields
  status: string; // Now references RecruitmentStage.id
  recruitmentStage?: RecruitmentStage | null; // The actual stage object
  // ... other fields
}
```

## Code Migration Steps

### 1. Update Status Access Patterns

#### Before
```typescript
// Direct string access
const candidateStatus = candidate.status;
if (candidate.status === 'Applied') {
  // handle applied status
}
```

#### After
```typescript
// Access via recruitmentStage relation
const candidateStatus = candidate.recruitmentStage?.name;
if (candidate.recruitmentStage?.name === 'Applied') {
  // handle applied status
}

// Or check status ID directly
if (candidate.status === appliedStageId) {
  // handle applied status
}
```

### 2. Update Status Setting Patterns

#### Before
```typescript
// Direct string assignment
await updateCandidate(candidateId, { status: 'Applied' });
```

#### After
```typescript
// Set by stage ID
const appliedStage = await getRecruitmentStageByName('Applied');
await updateCandidate(candidateId, { status: appliedStage.id });

// Or if you have the stage ID
await updateCandidate(candidateId, { status: appliedStageId });
```

### 3. Update Status Filtering

#### Before
```typescript
// Filter by string status
const appliedCandidates = candidates.filter(c => c.status === 'Applied');
```

#### After
```typescript
// Filter by stage name
const appliedCandidates = candidates.filter(c => c.recruitmentStage?.name === 'Applied');

// Or filter by stage ID
const appliedCandidates = candidates.filter(c => c.status === appliedStageId);
```

### 4. Update Status Comparisons

#### Before
```typescript
// String comparison
const isApplied = candidate.status === 'Applied';
const isHired = candidate.status === 'Hired';
```

#### After
```typescript
// Stage name comparison
const isApplied = candidate.recruitmentStage?.name === 'Applied';
const isHired = candidate.recruitmentStage?.name === 'Hired';

// Or stage ID comparison (more efficient)
const isApplied = candidate.status === appliedStageId;
const isHired = candidate.status === hiredStageId;
```

## Key Files to Update

### API Routes
- `src/app/api/v1/candidates/route.ts`
- `src/app/api/v1/candidates/[id]/route.ts`
- `src/app/api/v1/candidates/import/route.ts`
- `src/app/api/v1/candidates/bulk-action/route.ts`

### Components
- `src/components/candidates/AddCandidateModal.tsx`
- `src/components/candidates/CandidateFilters.tsx`
- `src/components/candidates/CandidatesPageClient.tsx`
- `src/components/candidates/ManageTransitionsModal.tsx`
- `src/components/dashboard/DashboardPageClient.tsx`

### Utilities
- `src/lib/headcountUtils.ts`
- `src/hooks/use-candidate-filters-data.ts`

## Migration Helper Functions

### Get Stage by Name
```typescript
export async function getRecruitmentStageByName(name: string): Promise<string | null> {
  const stage = await prisma.recruitmentStage.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true }
  });
  return stage?.id || null;
}
```

### Get Stage Name by ID
```typescript
export async function getRecruitmentStageName(id: string): Promise<string | null> {
  const stage = await prisma.recruitmentStage.findUnique({
    where: { id },
    select: { name: true }
  });
  return stage?.name || null;
}
```

### Update Candidate Status
```typescript
export async function updateCandidateStatus(
  candidateId: string, 
  stageName: string
): Promise<void> {
  const stage = await getRecruitmentStageByName(stageName);
  if (!stage) {
    throw new Error(`Recruitment stage '${stageName}' not found`);
  }
  
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: stage }
  });
}
```

## Common Status Values

The following status values are commonly used and should be migrated:

- `Applied` → Find stage with name "Applied"
- `Screening` → Find stage with name "Screening"
- `Shortlisted` → Find stage with name "Shortlisted"
- `Interview Scheduled` → Find stage with name "Interview Scheduled"
- `Interviewing` → Find stage with name "Interviewing"
- `Offer Extended` → Find stage with name "Offer Extended"
- `Hired` → Find stage with name "Hired"
- `On Hold` → Find stage with name "On Hold"
- `Rejected` → Find stage with name "Rejected"

## Testing

After migration, test the following scenarios:

1. **Candidate Creation**: Ensure new candidates get the correct status
2. **Status Updates**: Verify status changes work correctly
3. **Filtering**: Test status-based filtering in candidate lists
4. **Bulk Operations**: Verify bulk status updates work
5. **Import**: Test candidate import with status mapping
6. **API Endpoints**: Ensure all API endpoints return correct status data

## Rollback Plan

If issues arise, the migration can be rolled back by:

1. Restoring the old `status` string column
2. Reverting the Prisma schema changes
3. Restoring the old TypeScript interfaces
4. Reverting code changes

## Notes

- The `status` field in the database is now a UUID that references `RecruitmentStage.id`
- The `recruitmentStage` relation provides access to the full stage object
- All existing status string values are mapped to their corresponding stage IDs during migration
- The migration maintains backward compatibility by keeping the field name as `status`
- Performance is improved as status comparisons can now use UUIDs instead of string comparisons
