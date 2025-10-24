# Database Index Optimization Analysis

## Executive Summary

After analyzing the database schema and query patterns, I've identified **significant opportunities for index optimization**. The current schema has **176 indexes**, which is excessive and likely causing performance issues with INSERT/UPDATE operations.

## Key Findings

### 1. **Excessive Indexing**
- **Current**: 176 indexes across all tables
- **Problem**: Too many indexes slow down write operations and consume unnecessary storage
- **Impact**: Each index adds overhead to INSERT/UPDATE operations

### 2. **Query Pattern Analysis**
Based on codebase analysis, the most frequently used query patterns are:

#### **High Priority Indexes (KEEP)**
- `Candidate.positionId` - Used in JOINs
- `Candidate.recruiterId` - Used in JOINs  
- `Candidate.statusId` - Used in JOINs
- `Candidate.sourceId` - Used in JOINs
- `Candidate.fitScore` - Used in WHERE clauses and sorting
- `Candidate.applicationDate` - Used in ORDER BY
- `Position.recruiterId` - Used in WHERE clauses
- `Position.gradeId` - Used in JOINs and WHERE clauses
- `Position.isOpen` - Used in WHERE clauses
- `User.role` - Used in WHERE clauses
- `User.isActive` - Used in WHERE clauses
- `User.email` - Used in WHERE clauses

#### **Low Priority Indexes (REMOVE)**
- Single-column indexes on rarely filtered fields
- Indexes on fields only used in SELECT (not WHERE/ORDER BY)
- Redundant indexes where composite indexes would be better

### 3. **Identified Unused Indexes**

#### **User Table** (Remove 6 indexes)
- `User_avatarUrl_idx`
- `User_image_idx` 
- `User_dataAiHint_idx`
- `User_personalColor_idx`
- `User_createdAt_idx`
- `User_updatedAt_idx`

#### **Position Table** (Remove 5 indexes)
- `Position_description_idx`
- `Position_positionAttribute_idx`
- `Position_companyId_idx`
- `Position_createdAt_idx`
- `Position_updatedAt_idx`

#### **Candidate Table** (Remove 8 indexes)
- `Candidate_phone_idx`
- `Candidate_resumePath_idx`
- `Candidate_avatarUrl_idx`
- `Candidate_dataAiHint_idx`
- `Candidate_assignmentJustification_idx`
- `Candidate_companyId_idx`
- `Candidate_updatedAt_idx`
- `Candidate_createdAt_idx`

#### **Other Tables** (Remove 50+ indexes)
- Grade, RecruitmentStage, TransitionRecord, LogEntry
- UserGroup, UserTeam, CustomFieldDefinition
- Attachment, UploadQueue, Dashboard
- WarningConfiguration, Headcount
- ExpertiseGroup, ExpertiseSkill
- PersonalityGroup, PersonalityTrait
- CandidateEvaluation tables

## Optimization Strategy

### Phase 1: Remove Unused Indexes
1. **Remove 70+ unused single-column indexes**
2. **Focus on fields that are never used in WHERE clauses**
3. **Remove indexes on timestamp fields that are rarely filtered**

### Phase 2: Create Composite Indexes
1. **Create composite indexes for common query patterns**
2. **Combine frequently used filter combinations**
3. **Optimize for the most common JOIN patterns**

### Phase 3: Monitor and Validate
1. **Run performance tests before/after**
2. **Monitor query execution times**
3. **Validate that no critical queries are broken**

## Expected Benefits

### **Performance Improvements**
- **Faster INSERT/UPDATE operations** (reduced index maintenance)
- **Reduced storage usage** (smaller database size)
- **Better query performance** (optimized composite indexes)

### **Storage Savings**
- **Estimated 30-40% reduction** in index storage
- **Faster backup/restore operations**
- **Reduced memory usage**

### **Maintenance Benefits**
- **Easier schema evolution**
- **Faster migration operations**
- **Reduced complexity**

## Implementation Plan

### **Step 1: Analysis** ✅
- [x] Analyze current index usage
- [x] Identify query patterns
- [x] Create optimization scripts

### **Step 2: Validation** 
- [ ] Run validation queries
- [ ] Test performance impact
- [ ] Verify no breaking changes

### **Step 3: Implementation**
- [ ] Remove unused indexes in batches
- [ ] Create composite indexes
- [ ] Monitor performance

### **Step 4: Monitoring**
- [ ] Track query performance
- [ ] Monitor index usage
- [ ] Adjust as needed

## Risk Mitigation

### **Low Risk Approach**
1. **Remove indexes in small batches**
2. **Test each batch thoroughly**
3. **Keep rollback scripts ready**
4. **Monitor performance continuously**

### **Validation Steps**
1. **Run performance tests before changes**
2. **Test critical queries after each batch**
3. **Monitor database performance metrics**
4. **Have rollback plan ready**

## Files Created

1. **`scripts/analyze-index-usage.sql`** - Analysis queries
2. **`scripts/optimize-indexes.sql`** - Index removal script
3. **`scripts/validate-index-removal.sql`** - Validation queries
4. **`docs/index-optimization-analysis.md`** - This analysis

## Next Steps

1. **Review the optimization script** (`scripts/optimize-indexes.sql`)
2. **Run validation queries** to ensure no breaking changes
3. **Execute index removal in small batches**
4. **Monitor performance and adjust as needed**

## Conclusion

This optimization will significantly improve database performance by removing unused indexes and creating efficient composite indexes for common query patterns. The approach is low-risk with proper validation and monitoring.
