# AI Power Search Configuration System

## Overview

The AI Power Search Configuration System allows administrators to customize the system prompt used by AI Power Search for precise candidate matching. This system ensures that only users with proper permissions can modify the AI search behavior.

## Features

### 1. **Permission-Based Access Control**
- Only users with `SYSTEM_SETTINGS_MANAGE` permission can access the configuration
- Admin users automatically have access
- Non-authorized users see an access denied page with clear permission requirements

### 2. **Configurable System Prompt**
- Customizable system prompt stored in database
- Template-based approach with placeholders for dynamic content
- Fallback to default prompt if no custom prompt is configured

### 3. **User-Friendly Interface**
- Rich text editor for prompt configuration
- Preview mode for viewing current prompt
- Reset to default functionality
- Real-time validation and error handling

### 4. **Database Integration**
- System prompt stored in `SystemSetting` table
- Key: `aiPowerSearchSystemPrompt`
- Automatic initialization with default prompt

## Implementation Details

### Database Schema

The system prompt is stored in the `SystemSetting` table:

```sql
-- Key: aiPowerSearchSystemPrompt
-- Value: The complete system prompt template
-- Type: TEXT
```

### API Endpoints

#### 1. Permission Check API
```
POST /api/auth/check-permissions
```

**Request Body:**
```json
{
  "permissions": ["SYSTEM_SETTINGS_MANAGE"]
}
```

**Response:**
```json
{
  "hasPermission": true,
  "userRole": "Admin",
  "userModulePermissions": ["SYSTEM_SETTINGS_MANAGE"],
  "requestedPermissions": ["SYSTEM_SETTINGS_MANAGE"]
}
```

#### 2. System Settings API
```
GET /api/settings/system-settings
POST /api/settings/system-settings
```

Used for reading and updating the system prompt configuration.

### Frontend Components

#### 1. AI Power Search Config Page
- **Location:** `/settings/ai-power-search-config`
- **Component:** `src/app/settings/ai-power-search-config/page.tsx`
- **Features:**
  - Permission checking
  - Rich text editor for prompt configuration
  - Save/Reset functionality
  - Error handling and validation

#### 2. Settings Navigation
- **Location:** `/settings`
- **Integration:** Added to settings navigation with permission check
- **Icon:** BrainCircuit
- **Description:** "Configure AI Power Search system prompt for precise candidate matching"

### AI Search Flow Integration

The AI search flow (`src/ai/flows/search-candidates-flow.ts`) has been updated to:

1. **Fetch Custom Prompt:** Retrieve the configurable system prompt from database
2. **Template Processing:** Replace placeholders with actual data
3. **Fallback Handling:** Use default prompt if no custom prompt is configured

```typescript
// Get configurable system prompt from settings
const customSystemPrompt = await getSystemSetting('aiPowerSearchSystemPrompt');

// Use custom prompt if available, otherwise use default
const systemPromptTemplate = customSystemPrompt || DEFAULT_PROMPT;

// Replace placeholders in the system prompt
const prompt = systemPromptTemplate
  .replace(/\{query\}/g, input.query)
  .replace(/\{candidateData\}/g, effectiveCandidateData);
```

## Default System Prompt

The default system prompt includes:

### 1. **Critical Search Rules**
- Exact matching only
- No semantic inference
- Verification required
- Case insensitive matching

### 2. **Search Guidelines by Query Type**
- Language/Certification searches (TOEIC, IELTS, etc.)
- Skill searches (React, Python, etc.)
- Education searches (MIT, MBA, etc.)
- Experience searches (Google, 5 years, etc.)
- Fit score searches
- Position/Job searches
- Date searches
- Location searches
- Recruiter searches
- Status searches
- Custom field searches

### 3. **Examples of Correct Behavior**
- Specific examples for TOEIC searches
- React experience searches
- Fit score searches

### 4. **Template Placeholders**
- `{query}` - User's search query
- `{candidateData}` - Formatted candidate data

## Usage Instructions

### For Administrators

1. **Access Configuration:**
   - Navigate to Settings → AI Power Search Config
   - Ensure you have `SYSTEM_SETTINGS_MANAGE` permission

2. **Edit System Prompt:**
   - Click "Edit Prompt" button
   - Use the rich text editor to modify the prompt
   - Use placeholders `{query}` and `{candidateData}` for dynamic content

3. **Save Changes:**
   - Click "Save Changes" to apply the new prompt
   - Changes take effect immediately for all AI Power Search queries

4. **Reset to Default:**
   - Click "Reset to Default" to restore the original prompt
   - Confirmation dialog prevents accidental resets

### For Developers

1. **Initialize System:**
   ```bash
   npm run init-ai-prompt
   ```

2. **Add TOEIC Custom Field:**
   ```bash
   npm run add-toeic-field
   ```

3. **Access Configuration Page:**
   - Navigate to `/settings/ai-power-search-config`
   - Requires `SYSTEM_SETTINGS_MANAGE` permission

## Security Considerations

### 1. **Permission Validation**
- Server-side permission checking in API endpoints
- Client-side permission validation for UI access
- Clear error messages for unauthorized access

### 2. **Input Validation**
- Rich text editor with sanitization
- Template placeholder validation
- SQL injection prevention through parameterized queries

### 3. **Audit Logging**
- All system prompt changes are logged
- User identification and timestamp tracking
- Change history for compliance

## Troubleshooting

### Common Issues

1. **Access Denied Error:**
   - Ensure user has `SYSTEM_SETTINGS_MANAGE` permission
   - Check user role (Admin users have automatic access)
   - Verify module permissions in user profile

2. **Prompt Not Loading:**
   - Run initialization script: `npm run init-ai-prompt`
   - Check database connection
   - Verify SystemSetting table exists

3. **Changes Not Taking Effect:**
   - Clear browser cache
   - Restart AI search service
   - Check for JavaScript errors in browser console

### Debug Commands

```bash
# Initialize system prompt
npm run init-ai-prompt

# Add TOEIC custom field
npm run add-toeic-field

# Check database connection
npm run db:status
```

## Future Enhancements

### 1. **Version Control**
- Prompt version history
- Rollback functionality
- Change comparison tools

### 2. **A/B Testing**
- Multiple prompt versions
- Performance metrics
- Automatic optimization

### 3. **Template Library**
- Pre-built prompt templates
- Industry-specific configurations
- Community prompt sharing

### 4. **Advanced Validation**
- Prompt syntax validation
- Performance impact analysis
- Security scanning for prompt injection

## Related Documentation

- [Enhanced Custom Attributes System](../enhanced-custom-attributes.md)
- [System Settings API](../api/system-settings.md)
- [Permission System](../permissions.md)
- [AI Search Flow](../ai/search-candidates-flow.md)
