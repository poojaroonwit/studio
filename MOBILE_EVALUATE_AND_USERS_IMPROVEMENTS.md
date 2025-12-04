# Mobile Evaluate & User Management Improvements

## Overview
Comprehensive mobile improvements for evaluate page and user management.

## Tasks

### 1. Evaluate Page - Mobile Optimizations

#### A. Make Page Smaller/More Compact
- Reduce padding and margins
- Smaller font sizes
- Compact card layouts
- Optimize spacing

#### B. Improve Cycle Testing Result Display
- Make result cards more compact
- Better visual hierarchy
- Touch-friendly layout

#### C. Remove Attachments from Evaluate Form
- Hide attachment section on mobile
- Attachments can be viewed in candidate detail
- Reduces clutter and form length

#### D. Remove Score Cycle Selector Under Questions
- Already shown in selected scores list
- Redundant on mobile
- Saves vertical space

#### E. Fully Rounded Cards with Top Border
- Apply `rounded-2xl` or `rounded-3xl`
- Add colored top border like evaluate page
- Consistent card styling

**Files to Modify:**
- `src/components/candidates/MobileEvaluateForm.tsx`
- `src/app/candidates/[id]/evaluate/page.tsx`
- `src/app/candidates/[id]/evaluate-result/page.tsx`

### 2. User Management Page - Mobile Improvements

#### A. Add Filter Float Button
- Similar to candidates page
- Show filters in bottom drawer
- Filter by role, status, team, etc.

#### B. Show Users as List (Not Table)
- Create mobile list view component
- Card-based layout
- Avatar, name, email, role
- Touch-friendly actions

#### C. Role/Team/Profile Edit as Full Page
- Navigate to full page instead of drawer
- Better UX on mobile
- More space for forms

**Files to Create:**
- `src/components/users/UsersMobileListView.tsx`
- `src/components/users/UsersMobileFilter.tsx`
- `src/app/settings/users/[id]/page.tsx` (full page edit)
- `src/app/settings/user-groups/[id]/page.tsx` (full page role edit)
- `src/app/settings/user-teams/[id]/page.tsx` (full page team edit)

**Files to Modify:**
- `src/app/settings/users/page.tsx`
- `src/components/settings/UsersTab.tsx`

## Implementation Priority

### Phase 1: Evaluate Page (High Priority)
1. Remove attachments from evaluate form
2. Remove score selector under questions
3. Make cards fully rounded with top border
4. Compact layout adjustments

### Phase 2: User Management (Medium Priority)
1. Create mobile list view
2. Add filter float button
3. Create full-page edit routes

## Technical Approach

### Evaluate Form Changes
```tsx
// Hide attachments section
{!isMobile && (
  <AttachmentsSection />
)}

// Remove score selector under question
{!isMobile && (
  <ScoreSelector />
)}

// Fully rounded cards
<Card className="rounded-3xl border-t-4 border-t-primary">
```

### User List Mobile View
```tsx
<div className="space-y-3 p-4">
  {users.map(user => (
    <Card className="p-4 rounded-2xl">
      <div className="flex items-center gap-3">
        <Avatar />
        <div className="flex-1">
          <h3>{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Badge>{user.role}</Badge>
        </div>
        <Button size="icon" onClick={() => router.push(`/settings/users/${user.id}`)}>
          <Edit />
        </Button>
      </div>
    </Card>
  ))}
</div>
```

### Full Page Edit Pattern
```tsx
// src/app/settings/users/[id]/page.tsx
export default function UserEditPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  // Redirect to settings if not mobile
  if (!isMobile) {
    router.push('/settings/users');
    return null;
  }
  
  return (
    <div className="h-screen">
      <Header with back button />
      <UserEditForm />
    </div>
  );
}
```

## Design Specifications

### Card Styling
- Border radius: `rounded-2xl` (16px) or `rounded-3xl` (24px)
- Top border: `border-t-4 border-t-primary`
- Shadow: `shadow-sm`
- Background: `bg-card`

### Spacing
- Page padding: `p-4` (16px)
- Card gap: `space-y-3` (12px)
- Internal padding: `p-4` (16px)

### Typography
- Headings: `text-base` or `text-lg`
- Body: `text-sm`
- Labels: `text-xs`

### Touch Targets
- Minimum: 44x44px
- Buttons: `h-10` or `h-12`
- Icons: `h-5 w-5`

## Testing Checklist

### Evaluate Page
- [ ] Attachments hidden on mobile
- [ ] Score selector hidden under questions
- [ ] Cards fully rounded with top border
- [ ] Compact layout
- [ ] Easy to navigate questions
- [ ] Submit button accessible

### User Management
- [ ] Filter float button visible
- [ ] Users show as list on mobile
- [ ] Can tap user to edit
- [ ] Edit opens full page on mobile
- [ ] Desktop still uses drawer
- [ ] Filters work correctly

## Benefits

### Evaluate Page
- ✅ Faster evaluation process
- ✅ Less scrolling required
- ✅ Cleaner interface
- ✅ Better focus on questions
- ✅ Consistent card styling

### User Management
- ✅ Touch-friendly interface
- ✅ Easy filtering
- ✅ Better edit experience
- ✅ Consistent with other pages
- ✅ Native app-like feel
