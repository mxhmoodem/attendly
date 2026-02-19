# Attendly

A personal attendance and leave management web app built with React, TypeScript and Firebase.

---

## Features

| Page | Description |
|---|---|
| **Home** | Dashboard overview |
| **Leave** | Book holiday leave, track remaining days against a configurable allowance, view a monthly calendar |
| **Office Tracker** | Mark office vs. remote days each month, set a required office-day percentage, and track compliance |
| **Profile** | Update display name, company, role, country, and profile photo |

**Authentication:** email/password, Google OAuth, GitHub OAuth — all powered by Firebase Auth.  
**Data:** all user data is persisted to Cloud Firestore (see [FIRESTORE_GUIDE.md](FIRESTORE_GUIDE.md)).

---

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 7** (dev server & build)
- **Firebase 12** (Auth + Firestore)
- **React Router 7**
- **React Icons**

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A Firebase project with **Authentication** and **Firestore** enabled

### 1. Clone & install

```bash
git clone https://github.com/your-org/attendly.git
cd attendly
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root (never commit this):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

All values are available in **Firebase Console → Project Settings → Your apps**.

### 3. Enable Firebase services

1. **Authentication** — enable Email/Password, Google, and GitHub providers.
2. **Firestore** — create a database (start in test mode, then apply the security rules from [FIRESTORE_GUIDE.md](FIRESTORE_GUIDE.md)).

### 4. Run the dev server

```bash
npm run dev
```

The app is available at `http://localhost:5173`.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
src/
├── assets/          # Icons and images
├── components/
│   ├── common/      # Shared UI components
│   └── layout/      # Dashboard shell, Header, Navbar, ProtectedRoute
├── constants/       # Route constants
├── context/         # AuthContext + AuthProvider (Firebase Auth state)
├── hooks/           # useAuth
├── pages/
│   ├── Auth/        # Login & Register pages
│   ├── Home/        # Home dashboard
│   ├── Leave/       # Holiday leave tracker
│   ├── office/      # Office-day tracker
│   └── Profile/     # User profile editor
├── services/
│   ├── firebase.ts  # Firebase app initialisation & provider exports
│   └── database.ts  # Generic Firestore CRUD helpers
├── styles/          # Global CSS, theme variables
└── types/
    └── database.ts  # TypeScript interfaces for Firestore documents
```

---

## Database

See **[FIRESTORE_GUIDE.md](FIRESTORE_GUIDE.md)** for:

- Collection schemas (`users`, `holidayLeave`, `officeTracker`)
- Example read/write snippets
- Firestore security rules
- Recommended indexes

---

## Deployment

The project includes a `vercel.json` for single-page app routing on Vercel.

```bash
# Build
npm run build

# Deploy (requires Vercel CLI)
vercel --prod
```

Set the same `VITE_*` environment variables in your Vercel project settings.

---
