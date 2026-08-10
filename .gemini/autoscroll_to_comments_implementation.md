# Auto-Scroll to Comments After Last Question - Implementation Summary

## Overview

Successfully implemented automatic navigation to the comments section when the user selects a score for the last question in the evaluation form.

## Changes Made

### File: `src/app/applicants/[id]/evaluate/page.tsx`

**Modified Function:** `handleScoreChange` (lines 951-985)

#### Before:
```typescript
// Auto-advance to next question with smooth transition (except on last question or comments view)
if (!isLastQuestion && !isCommentsView) {
  setTimeout(() => {
    setFormData(prev => prev ? {
      ...prev,
      questions: updatedQuestions,
      overallScore,
      currentQuestionIndex: currentIndex + 1
    } : null);
  }, 300); // Small delay for smooth transition
}
```

#### After:
```typescript
// Auto-advance to next question or comments section (except when already on comments view)
// This includes advancing from the last question to the comments section
if (!isCommentsView) {
  setTimeout(() => {
    setFormData(prev => prev ? {
      ...prev,
      questions: updatedQuestions,
      overallScore,
      currentQuestionIndex: currentIndex + 1
    } : null);
  }, 300); // Small delay for smooth transition
}
```

## Key Changes

1. **Removed the `!isLastQuestion` condition** - Previously prevented auto-advance on the last question
2. **Updated comment to reflect new behavior** - Clarifies that it now advances to comments after the last question
3. **Maintained smooth transition** - 300ms delay provides smooth UX

## How It Works

### User Flow:

1. **User answers questions 1 through N-1:**
   - Each time a score is selected, automatically advances to the next question
   - Provides smooth, efficient evaluation experience

2. **User answers the last question (question N):**
   - When score is selected, automatically advances to the **comments section**
   - No manual navigation required
   - Seamless transition from evaluation to summary

3. **User on comments section:**
   - Does NOT auto-advance (already at the end)
   - User can add comments and submit when ready

### Logic Flow:

```
Select score on question → Is comments view?
                            ├─ No → Auto-advance (increment currentQuestionIndex)
                            │       ├─ If current is last question → Go to comments
                            │       └─ Otherwise → Go to next question
                            └─ Yes → Stay on comments (do nothing)
```

## Technical Details

- **State Management**: Uses `currentQuestionIndex` to track position
- **Comments View**: Detected when `currentQuestionIndex === formData.questions.length`
- **Smooth Transition**: 300ms setTimeout provides visual smoothness
- **Auto-save**: Evaluation is auto-saved before advancing

## Benefits

✅ **Improved UX**: Natural flow from last question to comments  
✅ **Time Saving**: No manual navigation needed  
✅ **Consistent**: Same auto-advance behavior for all questions including the last one  
✅ **Intuitive**: Matches user expectations for form completion flow

## Testing Instructions

1. **Navigate to an evaluate page** for a applicant
2. **Start answering questions** - verify auto-advance works for questions 1 through N-1
3. **Answer the last question** - verify it automatically scrolls/navigates to the comments section
4. **Verify comments section** - should not auto-advance when on comments
5. **Test on mobile and desktop** - both should work identically

## Affected Components

- **Main Evaluate Page**: `/applicants/[id]/evaluate`
- **Desktop Users**: Standard web interface
- **Mobile Users**: Mobile-responsive interface
- **Tablet Users**: Works on all screen sizes

## Notes

- This change applies to the main evaluate page where interviewers score applicants
- The Mobile Evaluate Form component already had similar behavior (automatically advancing after score selection)
- No breaking changes - only enhances the existing flow
