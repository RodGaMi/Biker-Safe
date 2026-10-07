# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **PII Split Isolation (`/users/{userId}/private/{docId}`)**: Personal account details (`email`, `personalPhone`, `displayName`) are isolated in `/users/{userId}/private/info`. Read and write operations are strictly restricted to the verified owner (`request.auth.uid == userId`) or a verified Admin.
3. **Sticker Ownership & Identity Integrity (`/stickers/{tagId}`)**:
   - A sticker can only be created by a verified authenticated user where `incoming().ownerId == request.auth.uid` and `incoming().tagId == tagId`.
   - `ownerId`, `tagId`, and `createdAt` are immortal (immutable) across all updates.
   - `createdAt` and `updatedAt` must strictly equal `request.time`.
4. **Controlled Emergency Access & Anti-Scraping (`/stickers/{tagId}`)**:
   - `list` queries on `/stickers` are strictly restricted to `resource.data.ownerId == request.auth.uid || isAdmin()`, preventing bulk scraping of emergency profiles.
   - `get` requests for a specific `/stickers/{tagId}` require authentication (`isSignedIn()`), a valid `tagId`, and either ownership (`resource.data.ownerId == request.auth.uid`), admin status, or an active sticker (`resource.data.isActive == true`).
5. **Relational Sync on Scan Audit Logs (`/stickers/{tagId}/scans/{scanId}`)**:
   - A `ScanLog` can only be created if the parent `/stickers/{tagId}` exists (`exists(...)`), is active (`get(...).data.isActive == true`), `incoming().stickerOwnerId == get(...).data.ownerId`, and `incoming().scannerUid == request.auth.uid`.
   - Scan logs are immutable audit records (`allow update: if false;`).

---

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Sticker Creation**:
   `{ "tagId": "nfc-1001", "ownerId": "victim_uid_999", "fullName": "Spoofed Rider", ... }` sent by `attacker_uid`.
2. **Shadow Field Injection on Sticker Creation**:
   Valid `EmergencySticker` payload plus `"isAdmin": true` ghost property.
3. **Unverified Email Write Attempt**:
   Valid `EmergencySticker` payload sent by an authenticated token with `email_verified: false`.
4. **Immortal Field Mutation (`ownerId` hijack on update)**:
   Update to `/stickers/nfc-1001` changing `ownerId` from `"user_1"` to `"attacker_2"`.
5. **Client Timestamp Forgery**:
   Sticker creation with `createdAt: Timestamp.fromMillis(1600000000000)` instead of `request.time`.
6. **Value Poisoning on Blood Type Enum**:
   Update to `/stickers/nfc-1001` with `bloodType: "INVALID_BLOOD_TYPE"`.
7. **Denial of Wallet Oversized String**:
   Update to `/stickers/nfc-1001` with `medicalConditions` containing a 5,000-character string (exceeding `maxLength: 1000`).
8. **Path Variable ID Poisoning**:
   Create document at `/stickers/invalid$id!with*spaces` failing `^[a-zA-Z0-9_\-]+$`.
9. **Unauthorized PII Read (`PII Blanket Test`)**:
   Authenticated user `attacker_uid` attempting `get` on `/users/victim_uid/private/info`.
10. **Unauthorized Collection Scraping (`Query Trust Test`)**:
    Authenticated user `attacker_uid` executing an unconstrained `list` query on `/stickers` without `where('ownerId', '==', 'attacker_uid')`.
11. **Orphaned Scan Log Creation (`Master Gate Bypass`)**:
    Creating `/stickers/non_existent_tag/scans/scan_01` when `/stickers/non_existent_tag` does not exist.
12. **Audit Log Tampering**:
    Attempting an `update` on `/stickers/nfc-1001/scans/scan_01` to alter `scannerUid` or `createdAt`.
