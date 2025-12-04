# Mobile Improvements Implementation Plan

## Overview
Comprehensive mobile UI improvements for positions and candidates pages.

## Tasks

### 1. ✅ Float Button Icons (Already Implemented)
- Filter icon button - DONE
- Add position icon button - DONE
- Located at: `src/components/positions/PositionsPageClient.tsx` lines 2208-2244

### 2. Position Detail - Full Page on Mobile
**Current State**: Position detail opens in a drawer/modal
**Target**: Show as full page on mobile devices

**Implementation**:
- Create `src/app/positions/[id]/page.tsx` for mobile full-page view
- Detect mobile and navigate to full page instead of opening drawer
- Keep drawer for desktop

**Files to modify**:
- `src/components/positions/PositionsPageClient.tsx` - Add navigation logic
- `src/components/positions/PositionsMobileListView.tsx` - Update click handler
- Create: `src/app/positions/[id]/page.tsx` - New mobile full-page view

### 3. Candidate Detail - Responsive Mobile Component
**Current State**: `MobileCandidateDetail.tsx` exists but needs improvements
**Target**: Separate mobile component with tabs, no activity timeline

**Implementation**:
- Enhance existing `src/components/candidates/MobileCandidateDetail.tsx`
- Add tabs: Info, Job Applied, Education, Experience, Attachments, Comments
- Remove activity timeline section on mobile
- Make fully responsive

**Files to modify**:
- `src/components/candidates/MobileCandidateDetail.tsx` - Major refactor
- Add new tab: `src/components/candidates/tabs/AttachmentsTab.tsx`

### 4. Attachments in Separate Tab (Mobile Only)
**Current State**: Attachments shown inline
**Target**: Separate "Attachments" tab on mobile

**Implementation**:
- Create `AttachmentsTab.tsx` component
- Add to mobile tab navigation
- Show file list with download/preview options

### 5. Hide Activity Timeline on Mobile
**Current State**: Activity timeline shown on mobile
**Target**: Hide completely on mobile

**Implementation**:
- Add conditional rendering based on `isMobile` hook
- Remove from mobile candidate detail component

## Priority Order
1. Position detail full page (High impact)
2. Candidate detail tabs refactor (High impact)
3. Attachments tab (Medium impact)
4. Hide activity timeline (Low effort)

## Technical Approach
- Use `useIsMobile()` hook for device detection
- Use Next.js App Router for position full-page view
- Maintain backward compatibility with desktop views
- Ensure smooth transitions and loading states
