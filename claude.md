# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A mobile-first housing society contact directory — a static web app (HTML + CSS + Vanilla JS) backed by Firebase Realtime Database. No build step required; the app is deployed directly via Firebase Hosting.

Auto-approval is enabled for all new contact submissions (no manual admin review needed for now).

## Development Commands

```bash
# Install Firebase CLI (one-time)
npm install -g firebase-tools

# Authenticate with Firebase
firebase login

# Serve locally (simulates Firebase Hosting)
firebase serve

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy Realtime Database rules only
firebase deploy --only database
```

The app runs entirely in the browser — open `index.html` directly or via `firebase serve` on `http://localhost:5000`.

## Architecture

Single-page app with no framework or bundler. All logic lives in plain JS files loaded via `<script>` tags.

**Firebase Realtime Database structure:**
```
/contacts/approved/{id}        — live, visible contacts
/contacts/pending/{id}         — submissions (auto-approved currently, written straight to approved)
/ratings/{contactId}/{deviceId} — per-device ratings (1–5)
/reviews/{contactId}[]         — short reviews (max 100 chars), last 2–3 shown
```

**Duplicate prevention:** phone number is the unique key — checked against both `/approved` and `/pending` before any write.

**Device identity:** a random UUID stored in `localStorage` is used as the user/device identifier for ratings (no auth).

## Key Constraints

- **No login** — authentication is planned for the future but not implemented.
- **Phone number** is the unique identifier for contacts; always validate uniqueness before writes.
- **Ratings** are per-device (localStorage UUID), one per contact, updatable.
- **Reviews** cap at 100 characters; display only the latest 2–3 per contact.
- **Auto-approval**: new submissions go directly to `/contacts/approved` (skip pending flow for now).
- Firebase free tier limits apply — avoid unbounded reads; use `.limitToLast()` for reviews.

## UI/UX Direction

Modern, next-gen mobile-first design. Prioritize:
- Touch targets ≥ 44px
- Instant search/filter (no page reload, client-side filtering after initial data fetch)
- Direct call (`tel:`) and WhatsApp (`https://wa.me/`) links on contact cards
- Category chips/pills for filtering (Plumber, Electrician, Tutor, etc.)
