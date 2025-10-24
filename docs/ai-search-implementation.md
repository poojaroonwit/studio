# AI Search Implementation Documentation

## Overview

The AI Search Implementation provides intelligent, semantic search capabilities for candidate profiles using Google Gemini AI. This implementation replaces the placeholder TODO with a fully functional AI-powered search system.

## Features

### 🧠 **Intelligent Search**
- **Semantic Understanding**: Uses AI to understand natural language queries
- **Context-Aware Matching**: Analyzes candidate profiles holistically
- **Multi-Criteria Search**: Supports complex queries with multiple conditions

### 🔍 **Search Capabilities**
- **Skill-Based Search**: "Find candidates with React experience"
- **Education Search**: "Graduates from MIT with MBA"
- **Experience Search**: "Worked at Google for 5+ years"
- **Fit Score Search**: "Candidates with fit score above 80%"
- **Status Search**: "Candidates in interview stage"
- **Recruiter Search**: "Assigned to John Smith"
- **Custom Field Search**: "Candidates with TOEIC certification"

### 📊 **Enhanced Results**
- **Match Reasons**: Detailed explanations of why candidates match
- **AI Reasoning**: Transparent AI decision-making process
- **Rich Candidate Data**: Complete profile information with context
- **Pagination Support**: Efficient handling of large result sets

## API Endpoint

### `POST /api/v1/ai/search-candidates`

**Authentication**: Bearer token required

**Request Body**:
```json
{
  "query": "software engineer with React experience",
  "positionId": "optional-position-uuid",
  "limit": 20,
  "offset": 0
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "candidate-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "Applied",
      "fitScore": 85,
      "matchReasons": [
        "Has React skill",
        "Software engineering background"
      ],
      "parsedData": { /* full candidate profile */ },
      "positionTitle": "Senior Software Engineer",
      "recruiterName": "Jane Smith"
    }
  ],
  "total": 1,
  "query": "software engineer with React experience",
  "aiReasoning": "Found candidates with React experience and software engineering background",
  "recordCount": 150
}
```

## Implementation Details

### Core Components

1. **AI Search Flow** (`src/ai/flows/search-candidates-flow.ts`)
   - Leverages existing AI infrastructure
   - Uses Google Gemini API for semantic analysis
   - Implements sophisticated candidate matching logic

2. **API Endpoint** (`src/app/api/v1/ai/search-candidates/route.ts`)
   - Handles authentication and validation
   - Integrates with AI search flow
   - Provides rich candidate data and match explanations

3. **Match Reason Generation**
   - Analyzes query against candidate data
   - Generates specific match reasons
   - Provides transparent matching logic

### Search Process

1. **Query Validation**: Validates input parameters and authentication
2. **AI Analysis**: Uses Gemini AI to analyze candidate profiles against query
3. **Candidate Retrieval**: Fetches detailed information for matched candidates
4. **Result Formatting**: Formats response with match reasons and AI reasoning
5. **Audit Logging**: Logs search requests for analytics

### AI Integration

The implementation leverages the existing AI infrastructure:

- **API Key Management**: Uses `aiApiKeyManager.ts` for key rotation
- **Model Selection**: Supports multiple Gemini models
- **Error Handling**: Robust fallback mechanisms
- **Rate Limiting**: Built-in API key management

## Usage Examples

### Basic Skill Search
```bash
curl -X POST http://localhost:8021/api/v1/ai/search-candidates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "candidates with Python and machine learning experience",
    "limit": 10
  }'
```

### Education-Based Search
```bash
curl -X POST http://localhost:8021/api/v1/ai/search-candidates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "graduates from Stanford with computer science degree",
    "limit": 5
  }'
```

### Position-Specific Search
```bash
curl -X POST http://localhost:8021/api/v1/ai/search-candidates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "senior developers with 5+ years experience",
    "positionId": "position-uuid-here",
    "limit": 20
  }'
```

## Testing

### Manual Testing
Use the provided test script:
```bash
node test-ai-search.js
```

### API Testing
1. Ensure API keys are configured in system settings
2. Generate a valid API token
3. Test with various query types
4. Verify response format and data accuracy

## Configuration

### Required Settings
- **Google API Keys**: Configure in system settings
- **Model Selection**: Choose appropriate Gemini model
- **Database Access**: Ensure proper database permissions

### Environment Variables
```env
GOOGLE_API_KEY=your-google-api-key  # Fallback key
DATABASE_URL=your-database-url
```

## Performance Considerations

### Optimization Features
- **Pagination**: Efficient handling of large result sets
- **Database Indexing**: Optimized queries with proper indexes
- **AI Caching**: Leverages existing AI infrastructure caching
- **Connection Pooling**: Uses database connection pooling

### Monitoring
- **Audit Logging**: All searches are logged for analytics
- **Performance Metrics**: Track search performance and accuracy
- **Error Tracking**: Comprehensive error handling and logging

## Security

### Authentication
- **Bearer Token**: Required for all API calls
- **Token Validation**: Secure token verification
- **User Context**: Search requests are tied to authenticated users

### Data Privacy
- **Audit Trail**: Complete search history tracking
- **Data Access**: Respects user permissions and data access controls
- **API Key Security**: Secure API key management and rotation

## Troubleshooting

### Common Issues

1. **"AI features are not available"**
   - Check API key configuration
   - Verify Google API key validity
   - Ensure proper model selection

2. **"No candidates found"**
   - Verify database has candidate data
   - Check query specificity
   - Review AI reasoning in response

3. **Authentication errors**
   - Verify API token validity
   - Check token permissions
   - Ensure proper authorization headers

### Debug Information
- Check audit logs for search requests
- Review AI reasoning in responses
- Monitor API key usage and errors

## Future Enhancements

### Planned Features
- **Search Analytics**: Detailed search performance metrics
- **Query Suggestions**: AI-powered query recommendations
- **Advanced Filtering**: More sophisticated filtering options
- **Search History**: User search history and favorites

### Integration Opportunities
- **Dashboard Widgets**: AI search results in dashboard
- **Notification System**: Search result notifications
- **Export Functionality**: Export search results
- **Bulk Operations**: Bulk actions on search results

## Support

For issues or questions:
1. Check the audit logs for detailed error information
2. Verify API key configuration in system settings
3. Review the AI reasoning in search responses
4. Contact system administrator for API key issues

---

**Implementation Status**: ✅ Complete
**Last Updated**: January 2025
**Version**: 1.0.0

