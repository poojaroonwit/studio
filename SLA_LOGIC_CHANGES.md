# SLA Calculation Logic Changes

## Overview
Updated the SLA calculation logic for headcounts to handle two different scenarios based on headcount status.

## New Logic

### For Vacant Headcounts
- **Calculation**: `(current_date - request_date)` vs grade SLA days
- **Purpose**: Track how long a position has been open since the request date
- **Status Check**: `headcount.status === 'vacant'` or no `candidateId`

### For Filled Headcounts  
- **Calculation**: `(hired_date - request_date)` vs grade SLA days
- **Purpose**: Track how long it took to fill the position from request to hire
- **Status Check**: `headcount.status === 'filled'` and has `candidateId`
- **Hired Date Source**: Latest `TransitionRecord` with `stage = 'Hired'` for the candidate

## Implementation Details

### Modified Functions

#### `checkSLAViolationForHeadcount(headcount)`
- **Location**: `src/lib/slaUtils.ts`
- **Changes**:
  - Added logic to determine calculation type based on headcount status
  - For filled headcounts: calls `getHiredDateForHeadcount()` to get hired date
  - For vacant headcounts: uses current date
  - Returns additional metadata: `calculationType`, `daysElapsed`, `endDate`

#### `getHiredDateForHeadcount(headcount)`
- **Location**: `src/lib/slaUtils.ts` (new function)
- **Purpose**: Retrieves the hired date for a specific headcount's candidate
- **Query**: Gets latest `TransitionRecord` with `stage = 'Hired'` for the candidate

### Updated Services

#### `slaNotificationService.ts`
- **Changes**:
  - Updated queries to include `candidateId` field
  - Removed filter for only vacant headcounts (now checks both vacant and filled)
  - Updated headcount object construction to include `candidateId`

## API Response Changes

The SLA API now returns additional fields:
```json
{
  "violation": {
    "isViolated": boolean,
    "daysOverdue": number,
    "daysRemaining": number,
    "slaDays": number,
    "gradeName": string,
    "requestDate": "ISO string",
    "endDate": "ISO string",
    "calculationType": "vacant" | "filled_with_hired_date" | "filled_no_hired_date",
    "daysElapsed": number
  }
}
```

## Calculation Types

1. **`vacant`**: Headcount is vacant, using current date
2. **`filled_with_hired_date`**: Headcount is filled and hired date found
3. **`filled_no_hired_date`**: Headcount is filled but no hired date found (falls back to current date)

## Backward Compatibility

- All existing API endpoints continue to work
- Existing SLA calculations for positions (legacy) remain unchanged
- Only headcount-specific SLA calculations use the new logic

## Testing

Use the provided test script `test-sla-logic.js` to verify the new logic works correctly.

## Database Requirements

- Headcounts must have `requestDate` set
- Positions must have grades with `sla_days` configured
- For filled headcounts: candidates should have `TransitionRecord` with `stage = 'Hired'`
