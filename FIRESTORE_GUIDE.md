# Firestore Database Setup

## Overview
This project uses Firebase Firestore as the database for storing attendance, user profiles, leave requests, and other application data.

## Collections Structure

### 📁 Collections

#### 1. **users** - User profiles
```typescript
{
  id: string (auto-generated or Firebase Auth UID)
  uid: string (Firebase Auth UID)
  email: string
  displayName?: string
  photoURL?: string
  role: 'employee' | 'manager' | 'admin'
  department?: string
  position?: string
  phoneNumber?: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### 2. **attendance** - Daily attendance records
```typescript
{
  id: string (auto-generated)
  userId: string (ref to users)
  date: Timestamp
  checkInTime?: Timestamp
  checkOutTime?: Timestamp
  status: 'present' | 'absent' | 'late' | 'on-leave' | 'half-day'
  location?: { latitude, longitude, address }
  notes?: string
  approvedBy?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### 3. **leaveRequests** - Leave applications
```typescript
{
  id: string (auto-generated)
  userId: string (ref to users)
  startDate: Timestamp
  endDate: Timestamp
  leaveType: 'sick' | 'vacation' | 'personal' | 'emergency' | 'other'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvalDate?: Timestamp
  approverNotes?: string
  totalDays: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### 4. **officeLocations** - Office locations
```typescript
{
  id: string (auto-generated)
  name: string
  address: string
  coordinates: { latitude, longitude }
  radius: number (meters)
  isActive: boolean
  capacity?: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## Usage Examples

### 1. Create User Profile After Registration
```typescript
import { setDocument } from '@/services/database';
import type { UserProfile } from '@/types/database';

// After Firebase Auth registration
const createUserProfile = async (uid: string, email: string, displayName?: string) => {
  const userProfile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
    uid,
    email,
    displayName,
    role: 'employee',
    isActive: true,
  };
  
  await setDocument('users', uid, userProfile);
};
```

### 2. Mark Attendance
```typescript
import { createDocument } from '@/services/database';
import type { AttendanceRecord } from '@/types/database';
import { Timestamp } from 'firebase/firestore';

const checkIn = async (userId: string) => {
  const attendance: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> = {
    userId,
    date: Timestamp.now(),
    checkInTime: Timestamp.now(),
    status: 'present',
  };
  
  const attendanceId = await createDocument('attendance', attendance);
  return attendanceId;
};
```

### 3. Query User's Attendance Records
```typescript
import { queryDocuments } from '@/services/database';
import type { AttendanceRecord } from '@/types/database';

const getUserAttendance = async (userId: string, month: number, year: number) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const records = await queryDocuments<AttendanceRecord>(
    'attendance',
    [
      { field: 'userId', operator: '==', value: userId },
      { field: 'date', operator: '>=', value: Timestamp.fromDate(startDate) },
      { field: 'date', operator: '<=', value: Timestamp.fromDate(endDate) },
    ],
    'date',
    'desc'
  );
  
  return records;
};
```

### 4. Submit Leave Request
```typescript
import { createDocument } from '@/services/database';
import type { LeaveRequest } from '@/types/database';
import { Timestamp } from 'firebase/firestore';

const submitLeaveRequest = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  leaveType: string,
  reason: string
) => {
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const leaveRequest: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'> = {
    userId,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    leaveType: leaveType as any,
    reason,
    status: 'pending',
    totalDays,
  };
  
  const requestId = await createDocument('leaveRequests', leaveRequest);
  return requestId;
};
```

### 5. Get User Profile
```typescript
import { getDocument } from '@/services/database';
import type { UserProfile } from '@/types/database';

const getUserProfile = async (uid: string) => {
  const profile = await getDocument<UserProfile>('users', uid);
  return profile;
};
```

### 6. Update User Profile
```typescript
import { updateDocument } from '@/services/database';

const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  await updateDocument('users', uid, data);
};
```

### 7. Real-time Listeners (Advanced)
For real-time updates, use Firestore's `onSnapshot`:

```typescript
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';

const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile) => void) => {
  const unsubscribe = onSnapshot(doc(db, 'users', uid), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as UserProfile);
    }
  });
  
  // Call unsubscribe() when component unmounts
  return unsubscribe;
};
```

## Firestore Security Rules

Add these rules in Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isManagerOrAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'admin'];
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Attendance collection
    match /attendance/{attendanceId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId) || isManagerOrAdmin();
      allow delete: if isAdmin();
    }
    
    // Leave requests collection
    match /leaveRequests/{requestId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId) || isManagerOrAdmin();
      allow delete: if isOwner(resource.data.userId) || isAdmin();
    }
    
    // Office locations collection
    match /officeLocations/{locationId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Departments collection
    match /departments/{deptId} {
      allow read: if isAuthenticated();
      allow write: if isManagerOrAdmin();
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
  }
}
```

## Indexing (Performance Optimization)

Create these composite indexes in Firebase Console → Firestore Database → Indexes:

1. **attendance** collection:
   - Fields: `userId` (Ascending), `date` (Descending)
   - For querying user attendance by date

2. **leaveRequests** collection:
   - Fields: `userId` (Ascending), `status` (Ascending), `startDate` (Descending)
   - For querying user's leave requests by status

3. **attendance** collection:
   - Fields: `date` (Ascending), `status` (Ascending)
   - For admin dashboard queries

## Best Practices

1. **Always use TypeScript types** from `@/types/database.ts`
2. **Use the generic database service** in `@/services/database.ts`
3. **Add indexes** for frequently queried fields
4. **Implement proper security rules** in Firebase Console
5. **Handle errors gracefully** - all database functions throw errors
6. **Use transactions** for operations that need atomicity
7. **Paginate large collections** using Firestore's cursor-based pagination
8. **Clean up listeners** when components unmount

## Next Steps

1. Enable Firestore in your Firebase project (Console → Build → Firestore Database)
2. Set up security rules (copy from above)
3. Create indexes as needed (Firebase will prompt you)
4. Start using the database service in your components!

## Deployment Notes

When deploying, you'll use:
- **Vercel** or **Firebase Hosting** for frontend
- **Firestore** handles scaling automatically
- No backend server needed!
