# Firestore Database Guide

## Overview

Attendly uses Firebase Firestore as its database. There are three active collections:

| Collection | Document ID pattern | Purpose |
|---|---|---|
| `users` | `{uid}` | User profiles & settings |
| `holidayLeave` | `{uid}` | Per-user leave allowance and leave entries |
| `officeTracker` | `{uid}_{YYYY-MM}` | Per-user, per-month office-day tracking |

---

## Collection Schemas

### 1. `users` — User profiles

One document per Firebase Auth user. Created automatically on registration or first social sign-in.

```typescript
{
  uid: string;            // Firebase Auth UID (mirrors the document ID)
  email: string;
  displayName?: string;
  photoURL?: string;      // Stored as a base64 data-URL after profile image upload
  role: string;           // Default: 'employee'
  isActive: boolean;      // Default: true
  company?: string;       // Set by user in Profile page
  country?: string;       // Set by user in Profile page
  updatedAt: Timestamp;
}
```

> **Note:** `role` and `isActive` are written with defaults (`'employee'` / `true`) at account
> creation time so that downstream reads always find a valid document.

---

### 2. `holidayLeave` — Leave tracker

One document per user. Stores the total leave allowance and the list of leave bookings.

```typescript
{
  availableDays: number;          // Total leave days available (default: 25)
  entries: Array<{
    id: string;                   // Client-generated unique ID
    fromDate: string;             // YYYY-MM-DD
    toDate: string;               // YYYY-MM-DD
    note?: string;                // Optional free-text note
  }>;
  updatedAt: Timestamp;
}
```

**Counting working days:** The UI excludes weekends and UK bank holidays when
calculating how many days an entry consumes.

---

### 3. `officeTracker` — Office-day tracker

One document per user per calendar month. Stores which days the user marked as
office days, plus the compliance requirement percentage.

```typescript
{
  userId: string;                  // Firebase Auth UID
  month: string;                   // YYYY-MM (e.g. "2026-02")
  reqValue: number;                // Required office percentage (0–100)
  excludeWeekends: boolean;        // Whether weekends are excluded from calculation
  excludeBankHolidays: boolean;    // Whether UK bank holidays are excluded
  officeDays: string[];            // Array of YYYY-MM-DD strings marked as office days
  excludedDays: Record<string, 'excluded' | 'holiday'>; // Manually excluded dates
  updatedAt: Timestamp;
}
```

---

## Reading & Writing Data

All database operations go through `src/services/database.ts`.

### Read a user profile

```typescript
import { getDocument } from '@/services/database';

const profile = await getDocument('users', uid);
// Returns null if no document exists yet
```

### Write / update a user profile

```typescript
import { setDocument } from '@/services/database';

// merge=true → partial update (preserves existing fields)
await setDocument('users', uid, { company: 'Acme', country: 'United Kingdom' }, true);
```

### Create the initial profile on registration

This is handled automatically inside `AuthProvider` for email/password
registration and for the first-ever Google or GitHub sign-in:

```typescript
await setDocument('users', uid, {
  uid,
  email,
  role: 'employee',
  isActive: true,
}, false); // merge=false → clean initial write
```

### Read leave data

```typescript
import { getDocument } from '@/services/database';

const data = await getDocument<{ availableDays: number; entries: LeaveEntry[] }>(
  'holidayLeave',
  uid
);
```

### Write leave data

```typescript
import { setDocument } from '@/services/database';

await setDocument('holidayLeave', uid, {
  availableDays,
  entries, // strip undefined fields before writing
});
```

### Read office-tracker data for a month

```typescript
import { getDocument } from '@/services/database';

const monthKey = '2026-02';
const data = await getDocument('officeTracker', `${uid}_${monthKey}`);
```

### Write office-tracker data

```typescript
import { setDocument } from '@/services/database';

await setDocument('officeTracker', `${uid}_${monthKey}`, {
  userId: uid,
  month: monthKey,
  reqValue,
  excludeWeekends,
  excludeBankHolidays,
  officeDays: [...officeDays],
  excludedDays: Object.fromEntries(excludedDays),
});
```

---

## Firestore Security Rules

Copy these rules into **Firebase Console → Firestore Database → Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User profiles — owner can read/write; others can read (for team features)
    match /users/{userId} {
      allow read:   if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);
    }

    // Holiday leave — strictly per-user
    match /holidayLeave/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Office tracker — document IDs are "{uid}_{YYYY-MM}"
    match /officeTracker/{docId} {
      allow read, write: if isAuthenticated() &&
        request.auth.uid == resource.data.userId;
      // Allow create (resource.data is not yet available)
      allow create: if isAuthenticated() &&
        request.auth.uid == request.resource.data.userId;
    }
  }
}
```

---

## Composite Indexes

Create these in **Firebase Console → Firestore Database → Indexes** if you add
query-based features in future:

| Collection | Fields | Direction |
|---|---|---|
| `officeTracker` | `userId` ASC, `month` DESC | For listing a user's month history |
| `holidayLeave` | *(no composite index needed — single-document per user)* | — |

---

## Best Practices

1. **Never store `undefined` values** — Firestore rejects them. Strip them before
   writing (see the `persist` helper in `Leave.tsx`).
2. **Use `merge: true`** for partial profile updates so you never accidentally
   overwrite unrelated fields.
3. **Use `merge: false`** only for the initial document creation, so you get a
   clean write without stale fields from a previous account with the same UID.
4. **Clean up listeners** when components unmount (the `onAuthStateChanged`
   unsubscribe is already handled in `AuthProvider`).
5. **All database functions throw** — always `await` them inside a `try/catch`.

---

## Local Development Notes

1. Enable Firestore in your Firebase project (Console → Build → Firestore Database).
2. Set up security rules (copy from above).
3. Copy `.env.example` to `.env.local` and fill in your Firebase config values.
4. Run `npm run dev` — the app will connect to your real Firestore project.

> There is no local Firestore emulator configured. To add one, install the
> Firebase CLI and follow the emulator setup guide.
