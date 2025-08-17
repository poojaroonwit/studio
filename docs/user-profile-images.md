# User Profile Images Feature

## Overview

The User Profile Images feature allows users to upload and display profile pictures throughout the application. This replaces the previous thumbnail system with a more robust and user-friendly profile image system.

## Features

### ✅ **Profile Image Upload**
- **File Types**: JPG, PNG, GIF
- **Size Limit**: 5MB maximum
- **Storage**: Images stored in MinIO object storage
- **Database**: Image URLs stored in `avatarUrl` field in User table

### ✅ **Smart Fallback System**
- **Profile Image**: Shows user's uploaded profile image
- **Initials Fallback**: Shows user's initials when no image is available
- **Consistent Display**: Same fallback logic across all components

### ✅ **Multiple Component Support**
- **User Lists**: Settings > Users page
- **Header**: User avatar in top navigation
- **Task Board**: User avatars in task cards
- **Candidate Lists**: User avatars in candidate tables
- **My Tasks**: User avatars in task assignments

## Technical Implementation

### Database Schema
The User model already includes the necessary fields:
```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  email     String   @unique
  avatarUrl String?  // Profile image URL
  image     String?  // Alternative image field
  // ... other fields
}
```

### API Endpoints
- **POST `/api/upload-image`**: Upload profile images to MinIO
- **GET `/api/users`**: Retrieve user data including avatar URLs
- **PUT `/api/users/[id]`**: Update user profile including avatar

### Storage
- **MinIO Bucket**: `uploads` (configurable via `MINIO_BUCKET` env var)
- **Object Path**: `profile-images/{timestamp}-{uuid}.{extension}`
- **Public Access**: Images are publicly accessible via MinIO public URL
- **Metadata**: Includes original filename, uploader ID, and upload date

### Components

#### 1. UserAvatar Component (`src/components/ui/user-avatar.tsx`)
```typescript
// Main avatar component with fallback
<UserAvatar 
  user={user} 
  size="md" 
  showTooltip={true} 
/>

// Compact version for lists
<UserAvatarCompact 
  user={user} 
  size="sm" 
/>

// Large version for profile pages
<UserAvatarLarge 
  user={user} 
/>
```

#### 2. ProfileImageUpload Component (`src/components/ui/profile-image-upload.tsx`)
```typescript
// Full upload interface with preview
<ProfileImageUpload
  user={user}
  onImageUpload={handleImageUpload}
  onImageRemove={handleImageRemove}
/>

// Compact version for forms
<ProfileImageUploadCompact
  user={user}
  onImageUpload={handleImageUpload}
  onImageRemove={handleImageRemove}
/>
```

## Usage Guide

### For Users

#### Uploading a Profile Image
1. **Navigate to Settings**: Go to Settings > Users
2. **Edit User**: Click "Edit" on your user account
3. **Upload Image**: Click "Upload Photo" or "Change Photo"
4. **Select File**: Choose an image file (JPG, PNG, GIF, max 5MB)
5. **Preview**: Review the image in the preview dialog
6. **Confirm**: Click "Upload" to save the image
7. **Save Changes**: Click "Save Changes" to update your profile

#### Removing a Profile Image
1. **Edit Profile**: Follow steps 1-2 above
2. **Remove Image**: Click "Remove" button next to your current image
3. **Confirm**: The image will be removed and initials will be shown instead

### For Developers

#### Adding Profile Images to New Components
```typescript
import { UserAvatarCompact } from '@/components/ui/user-avatar';

// In your component
<UserAvatarCompact
  user={{
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    email: user.email
  }}
  size="md"
  className="border border-border"
/>
```

#### Adding Upload Functionality
```typescript
import { ProfileImageUploadCompact } from '@/components/ui/profile-image-upload';

// In your form/modal
<ProfileImageUploadCompact
  user={user}
  onImageUpload={async (imageUrl) => {
    // Update user with new image URL
    await updateUser({ ...user, avatarUrl: imageUrl });
  }}
  onImageRemove={async () => {
    // Remove image URL from user
    await updateUser({ ...user, avatarUrl: null });
  }}
/>
```

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── user-avatar.tsx          # Avatar display components
│   │   └── profile-image-upload.tsx # Upload interface components
│   └── users/
│       ├── RedesignedUserModal.tsx  # User modal with avatar upload
│       └── UnifiedUserModal.tsx     # Alternative user modal
├── app/
│   └── api/
│       └── upload-image/
│           └── route.ts             # MinIO upload endpoint
└── lib/
    └── minio.ts                     # MinIO client configuration
```

## Environment Variables

The following environment variables are required for MinIO storage:

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=uploads
MINIO_PUBLIC_BASE_URL=http://localhost:8621
```

## Security Considerations

- **Authentication**: Upload endpoint requires valid session
- **File Validation**: Only image files (JPG, PNG, GIF) are allowed
- **Size Limits**: Maximum file size of 5MB
- **Public Access**: Images are publicly readable for display purposes
- **Metadata**: Upload tracking includes user ID and timestamp
