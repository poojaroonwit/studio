# Recruiter Assignment System

Automatically assigns recruiters to candidates who don't have one, using the recruiter from their applied position. Existing recruiter assignments are preserved.

## Features

- **Automatic Assignment**: When candidates are assigned to positions, they get the position's recruiter if they don't have one
- **Preserve Existing**: Candidates who already have a recruiter keep their assignment
- **Manual Sync**: Admin can trigger bulk assignment for unassigned candidates
- **Audit Trail**: All assignments are logged in transition history
- **Error Handling**: Graceful handling of assignment failures

## Usage

1. **Automatic**: Works transparently when candidates are assigned to positions
2. **Manual**: Go to Settings > Recruiter Sync for bulk assignment operations
3. **API**: Use `/api/settings/recruiter-sync` endpoint

## Testing

Run: `node scripts/test-recruiter-sync.js`
