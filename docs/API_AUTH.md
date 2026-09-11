# Authentication API

Base URL (development): `http://localhost:4000`

All JSON responses use the Phase 1 envelope:

```json
{ "success": true, "message": "…", "data": {} }
```

or

```json
{ "success": false, "message": "Readable message", "code": "ERROR_CODE" }
```

Authentication uses **HttpOnly cookies**:

| Cookie | Purpose | Lifetime |
|--------|---------|----------|
| `svysy_access` | Short-lived JWT access token | `JWT_ACCESS_EXPIRES_IN` (default 15m) when Remember me is checked; otherwise a session cookie |
| `svysy_refresh` | Opaque refresh token (SHA-256 stored server-side) | `JWT_REFRESH_EXPIRES_IN` (default 7d) when Remember me is checked; otherwise a session cookie. Path is `/api/auth`. |

JWT payload contains only `{ "userId", "role" }`. Passwords and hashes are never returned.

Roles: `ADMIN`, `COLLEGE`. Public signup always creates `COLLEGE` with `status: PENDING`.

---

## POST `/api/auth/login`

**Purpose:** Authenticate an active user and set cookies.

**Authentication:** Public (rate limited).

**Request:**

```json
{
  "email": "college@example.in",
  "password": "ValidPass1",
  "rememberMe": false
}
```

**Success (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "…",
      "name": "…",
      "email": "college@example.in",
      "role": "COLLEGE",
      "status": "ACTIVE"
    }
  }
}
```

**Possible errors:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing/invalid email or password |
| 401 | `INVALID_CREDENTIALS` | Unknown email or wrong password (same message: `Invalid email or password.`) |
| 403 | `ACCOUNT_PENDING` | Password correct, account pending approval |
| 403 | `ACCOUNT_INACTIVE` | Password correct, account inactive |
| 429 | `RATE_LIMITED` | Too many attempts |

---

## POST `/api/auth/logout`

**Purpose:** Delete the refresh token record and clear cookies.

**Authentication:** Optional. Cookies are cleared even if the access token is missing.

**Request:** empty body.

**Success (200):**

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

## GET `/api/auth/me`

**Purpose:** Return the currently authenticated user.

**Authentication:** Required (access cookie or `Authorization: Bearer`).

**Success (200):** `{ success, message, data: { user } }`

**Possible errors:** `401 UNAUTHORIZED` if the token is missing, invalid, expired, or the user is not `ACTIVE`.

---

## POST `/api/auth/signup`

**Purpose:** Register a college/institute. Creates a `PENDING` college user and institute. Never creates `ADMIN`.

**Authentication:** Public (rate limited).

**Request (required fields):**

```json
{
  "university": "Savitribai Phule Pune University",
  "instituteName": "Example College",
  "exclusiveType": "",
  "locationType": "",
  "minorityType": "",
  "linguisticType": "",
  "address": "College address",
  "district": "Pune",
  "taluka": "Haveli",
  "jdRegion": "Pune",
  "email": "college@example.in",
  "mobile": "9876543210",
  "contactNumber1": "",
  "contactNumber2": "",
  "principalName": "Principal Name",
  "collegeType": "Aided",
  "password": "ValidPass1",
  "confirmPassword": "ValidPass1"
}
```

Sending `"role": "ADMIN"` is rejected.

**Success (201):** message `Registration submitted successfully. Your account is pending approval.` User object in `data.user` (no password hash).

**Possible errors:** `400 VALIDATION_ERROR`, `409 EMAIL_EXISTS`, `429 RATE_LIMITED`.

---

## POST `/api/auth/forgot-password`

**Purpose:** Start password reset. Always returns the same generic message so emails cannot be enumerated.

**Authentication:** Public (rate limited).

**Request:** `{ "email": "college@example.in" }`

**Success (200):** `If an account exists for this email, a reset link has been sent.`

Reset tokens are **not** included in the response. In development the mailer logs the reset URL to the **server console**.

---

## POST `/api/auth/reset-password`

**Purpose:** Set a new password using a one-time token from the reset link.

**Authentication:** Public (rate limited).

**Request:**

```json
{
  "token": "hex-token-from-email-link",
  "password": "NewValid1",
  "confirmPassword": "NewValid1"
}
```

**Success (200):** `Password updated successfully. You can now log in.` The token is invalidated. Existing refresh sessions for that user are revoked.

**Possible errors:** `400` invalid/expired token or weak password, `429 RATE_LIMITED`.

---

## POST `/api/auth/refresh`

**Purpose:** Rotate the refresh token and issue a new access cookie.

**Authentication:** Refresh cookie (`svysy_refresh`).

**Possible errors:** `401 UNAUTHORIZED`.

---

## GET `/api/auth/universities`

**Purpose:** List active university names for the signup datalist.

**Authentication:** Public.

---

## Role-protected probes (placeholders)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/admin/ping` | `ADMIN` |
| GET | `/api/college/ping` | `COLLEGE` |

Unauthenticated: `401`. Wrong role: `403`.
