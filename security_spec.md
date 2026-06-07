# Security Specifications and Threat Model

This document outlines the security invariants, threat vector payloads, and rules specifications for the Digital Window application database structure on Cloud Firestore.

## 1. Data Invariants

1. **User Ownership and Access Isolation**:
   - Every user possesses an isolated directory path under `/users/{userId}`.
   - User settings and preferences are stored exactly in `/users/{userId}` where `{userId}` must equal the authenticated user's `uid`.
   - A user's notes are stored under `/users/{userId}/notes/{noteId}`. Under no circumstances can user `A` read or write to user `B`'s profile or notes.

2. **Input and Identifier Hardening**:
   - `userId` must be a valid alphanumeric identifier conforming to standard Firestore UID format (`isValidId(userId)`).
   - `noteId` must prevent resource consumption attack injections and conform to standard format (`isValidId(noteId)`).

3. **Schema and Field Integrity (No Shadow Fields)**:
   - Creating a profile or note requires validating all essential fields.
   - For update operations, users cannot modify historical metadata records/immutable fields like `userId`. For notes, `id` and `userId` are strictly immutable.
   - Strict size bounds are enforced on all fields to prevent Denial of Wallet exploits (e.g. title lengths, content size limits).

4. **Temporal Authenticity**:
   - Profiles must record updates using proper timestamps synced with the Cloud Firestore server's time (`request.time`).

---

## 2. The "Dirty Dozen" Threat Payloads (Targeting `/users/{userId}`)

Here are 12 malicious payloads constructed to bypass schema checks or spoof identities, all of which will be blocked and return `PERMISSION_DENIED`.

### Attack Vector 1: Identity Spoofing (Setting Owner to someone else)
* **Payload 1**: User `A` tries to read User `B`'s profile settings.
  - Path: `/users/USER_B`
  - Action: `GET` by Authenticated User `A`
  - Expected: `PERMISSION_DENIED`
* **Payload 2**: User `A` attempts to write preferences into User `B`'s root document.
  - Path: `/users/USER_B`
  - Action: `CREATE/UPDATE` by Authenticated User `A`
  - Expected: `PERMISSION_DENIED`

### Attack Vector 2: Privilege Escalation & Admin Spoofing
* **Payload 3**: Setting an unapproved `isAdmin` field in the user profile to escalate system credentials.
  - Path: `/users/USER_A`
  - Write Payload: `{ "userId": "USER_A", "isAdmin": true, "updatedAt": "SERVER_TIMESTAMP" }`
  - Expected: `PERMISSION_DENIED` (Strict schema prevents adding fields outside the whitelist)

### Attack Vector 3: Resource Poisoning / Abuse of Storage Limit (Denial of Wallet)
* **Payload 4**: An authenticated user writes an extremely long string for `themeId` (e.g., 500KB of random letters) to exhaust Firestore resources.
  - Path: `/users/USER_A`
  - Write Payload: `{ "userId": "USER_A", "themeId": "A...[500,000 chars]...", "updatedAt": "SERVER_TIMESTAMP" }`
  - Expected: `PERMISSION_DENIED` (Blocked by string length validator `.size() <= 64`)

### Attack Vector 4: Relational / ID Hijacking inside subcollections
* **Payload 5**: Writing a note under User `A`'s subcollection with a `userId` field belonging to User `B`.
  - Path: `/users/USER_A/notes/NOTE_1`
  - Write Payload: `{ "id": "NOTE_1", "userId": "USER_B", "title": "Spoofed Note", "content": "<p>Content</p>", "updatedAt": 1717466400000 }`
  - Expected: `PERMISSION_DENIED` (Blocked by validation requirement that `userId` must equal path parameter `userId` which equals `request.auth.uid`)

### Attack Vector 5: Temporal Inconsistency
* **Payload 6**: Setting a manual, future server-timestamp in settings to alter update priorities.
  - Path: `/users/USER_A`
  - Write Payload: `{ "userId": "USER_A", "updatedAt": "2030-01-01T00:00:00Z" }`
  - Expected: `PERMISSION_DENIED` (Must bind to actual current `request.time`)

### Attack Vector 6: Null / Undefined / Shadow Value Injections
* **Payload 7**: Writing a Note containing a missing essential text content body or corrupted properties.
  - Path: `/users/USER_A/notes/NOTE_1`
  - Write Payload: `{ "id": "NOTE_1", "userId": "USER_A", "title": "Bypassing content format", "updatedAt": 1717466400000 }`
  - Expected: `PERMISSION_DENIED` (Strict field assertions require `content` as string)

### Attack Vector 7: Unauthenticated Operations (Anonymous Scrapes)
* **Payload 8**: An unauthenticated request attempts to crawl notes or fetch another's document.
  - Path: `/users/USER_A/notes/NOTE_1`
  - Action: `GET/LIST` without Auth header
  - Expected: `PERMISSION_DENIED`

### Attack Vector 8: Bypassing Immutable Elements on Update
* **Payload 9**: Attempting to alter the immutable note owner ID field on update.
  - Path: `/users/USER_A/notes/NOTE_1`
  - Original: `{ "id": "NOTE_1", "userId": "USER_A", "title": "Hello", "content": "<p>World</p>", "updatedAt": 1717466400000 }`
  - Update Attempt: `{ "id": "NOTE_1", "userId": "USER_C", "title": "Hello", "content": "<p>World</p>", "updatedAt": 1717466400000 }`
  - Expected: `PERMISSION_DENIED` (Blocked by `incoming().userId == existing().userId`)

### Attack Vector 9: Unbounded Data/Structure Poisoning
* **Payload 10**: Attempting to inject a massive note title (greater than 200 characters) to bloat database indexes.
  - Path: `/users/USER_A/notes/NOTE_1`
  - Write Payload: `{ "id": "NOTE_1", "userId": "USER_A", "title": "MASSIVE_TITLE_BLOB...[10,000 chars]...", "content": "<p>Content</p>", "updatedAt": 1717466400000 }`
  - Expected: `PERMISSION_DENIED` (`title.size() <= 200`)

### Attack Vector 10: Path Traversal or Document ID Spoofing/Escape Note
* **Payload 11**: Using malicious document IDs with relative traversal sequences to compromise resource root routes.
  - Path: `/users/USER_A/notes/..%2F..%2Fsysadmin`
  - Expected: `PERMISSION_DENIED` / System Reject (Document IDs strictly validated via alphanumeric regex regex `^[a-zA-Z0-9_\-]+$`)

### Attack Vector 11: Bulk Scraping/Unbounded Client-Side Queries
* **Payload 12**: Trying to execute list query of overall users without isolated relational filtering parameter setup on client-side.
  - Path: `/users`
  - Action: `LIST`
  - Expected: `PERMISSION_DENIED`

---

## 3. The Rules Architecture Layout (DRAFT)

We build a strict security architecture using the Zero-Trust Gate patterns. See the rules implemented in `DRAFT_firestore.rules`.
