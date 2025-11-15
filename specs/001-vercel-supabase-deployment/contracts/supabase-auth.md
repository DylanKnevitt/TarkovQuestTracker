# Contract: Supabase Authentication API

**Feature**: 001-vercel-supabase-deployment  
**Date**: 2025-11-15  
**API**: Supabase Auth (via @supabase/supabase-js)

## Overview

This contract defines the authentication API operations provided by Supabase Auth. All operations use the Supabase JavaScript client and return promises.

---

## Authentication Operations

### Sign Up

**Description**: Create a new user account with email and password.

**Client Code**:
```javascript
const { data, error } = await supabase.auth.signUp({
  email: string,
  password: string,
  options: {
    data: {
      // Optional user metadata
      migration_completed: boolean
    }
  }
});
```

**Request Parameters**:
| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Minimum 8 characters |
| `options.data` | object | No | Custom user metadata |

**Response (Success)**:
```javascript
{
  data: {
    user: {
      id: "uuid",
      email: "user@example.com",
      created_at: "2025-11-15T10:00:00Z",
      user_metadata: {}
    },
    session: {
      access_token: "jwt-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      token_type: "bearer"
    }
  },
  error: null
}
```

**Response (Error)**:
```javascript
{
  data: { user: null, session: null },
  error: {
    message: "User already registered" | "Password should be at least 8 characters",
    status: 400 | 422
  }
}
```

**Error Codes**:
- `400`: Invalid request (malformed email, weak password)
- `422`: User already exists
- `500`: Server error

---

### Sign In

**Description**: Authenticate existing user with email and password.

**Client Code**:
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: string,
  password: string
});
```

**Request Parameters**:
| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Minimum 8 characters |

**Response (Success)**:
```javascript
{
  data: {
    user: {
      id: "uuid",
      email: "user@example.com",
      created_at: "2025-11-15T10:00:00Z",
      updated_at: "2025-11-15T12:00:00Z",
      user_metadata: { migration_completed: true }
    },
    session: {
      access_token: "jwt-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      token_type: "bearer"
    }
  },
  error: null
}
```

**Response (Error)**:
```javascript
{
  data: { user: null, session: null },
  error: {
    message: "Invalid login credentials",
    status: 400
  }
}
```

**Error Codes**:
- `400`: Invalid credentials (wrong email/password)
- `429`: Too many attempts (rate limited)
- `500`: Server error

**Security Notes**:
- Error messages intentionally vague (don't reveal if email exists)
- Rate limiting applied after multiple failed attempts

---

### Sign Out

**Description**: End current user session and clear tokens.

**Client Code**:
```javascript
const { error } = await supabase.auth.signOut();
```

**Request Parameters**: None

**Response (Success)**:
```javascript
{
  error: null
}
```

**Response (Error)**:
```javascript
{
  error: {
    message: "Error signing out",
    status: 500
  }
}
```

**Side Effects**:
- Clears session from localStorage
- Invalidates access token
- Triggers `SIGNED_OUT` auth state change event

---

### Get Session

**Description**: Retrieve current authentication session (if exists).

**Client Code**:
```javascript
const { data, error } = await supabase.auth.getSession();
```

**Request Parameters**: None

**Response (Success - Authenticated)**:
```javascript
{
  data: {
    session: {
      access_token: "jwt-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      expires_at: 1700057600,
      token_type: "bearer",
      user: {
        id: "uuid",
        email: "user@example.com",
        // ... full user object
      }
    }
  },
  error: null
}
```

**Response (Success - Not Authenticated)**:
```javascript
{
  data: {
    session: null
  },
  error: null
}
```

**Response (Error)**:
```javascript
{
  data: { session: null },
  error: {
    message: "Error getting session",
    status: 500
  }
}
```

**Use Cases**:
- Check authentication status on app load
- Verify session before protected operations
- Get current user details

---

### Get User

**Description**: Retrieve current authenticated user details.

**Client Code**:
```javascript
const { data, error } = await supabase.auth.getUser();
```

**Request Parameters**: None

**Response (Success - Authenticated)**:
```javascript
{
  data: {
    user: {
      id: "uuid",
      email: "user@example.com",
      created_at: "2025-11-15T10:00:00Z",
      updated_at: "2025-11-15T12:00:00Z",
      user_metadata: { migration_completed: true },
      app_metadata: {},
      aud: "authenticated",
      role: "authenticated"
    }
  },
  error: null
}
```

**Response (Success - Not Authenticated)**:
```javascript
{
  data: { user: null },
  error: null
}
```

**Difference from getSession()**:
- `getUser()`: Makes fresh API call, validates JWT
- `getSession()`: Returns cached session from localStorage
- Use `getUser()` for security-sensitive operations

---

### Update User

**Description**: Update current user's metadata or password.

**Client Code**:
```javascript
const { data, error } = await supabase.auth.updateUser({
  data: {
    // Update user_metadata
    migration_completed: boolean,
    // ... other custom fields
  },
  password: string // Optional: change password
});
```

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data` | object | No | User metadata to update |
| `password` | string | No | New password (min 8 chars) |

**Response (Success)**:
```javascript
{
  data: {
    user: {
      id: "uuid",
      email: "user@example.com",
      user_metadata: { migration_completed: true },
      // ... updated fields
    }
  },
  error: null
}
```

**Response (Error)**:
```javascript
{
  data: { user: null },
  error: {
    message: "Password should be at least 8 characters",
    status: 422
  }
}
```

**Use Cases**:
- Mark migration as completed
- Store user preferences
- Change password

---

### Reset Password (Request)

**Description**: Send password reset email to user.

**Client Code**:
```javascript
const { data, error } = await supabase.auth.resetPasswordForEmail(
  email,
  {
    redirectTo: 'https://your-app.vercel.app/reset-password'
  }
);
```

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `options.redirectTo` | string | No | URL to redirect after reset |

**Response (Success)**:
```javascript
{
  data: {},
  error: null
}
```

**Response (Error)**:
```javascript
{
  data: {},
  error: {
    message: "Error sending reset email",
    status: 500
  }
}
```

**Security Notes**:
- Always returns success (doesn't reveal if email exists)
- Rate limited to prevent abuse
- Email contains secure one-time token

---

### Auth State Change Listener

**Description**: Subscribe to authentication state changes.

**Client Code**:
```javascript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    // Handle auth state change
  }
);

// Unsubscribe when done
subscription.unsubscribe();
```

**Event Types**:
| Event | Description | Session |
|-------|-------------|---------|
| `SIGNED_IN` | User logged in | Present |
| `SIGNED_OUT` | User logged out | Null |
| `TOKEN_REFRESHED` | Access token refreshed | Present |
| `USER_UPDATED` | User metadata updated | Present |
| `PASSWORD_RECOVERY` | Password reset initiated | Present |

**Callback Parameters**:
```javascript
(event: string, session: Session | null) => void
```

**Use Cases**:
- Update UI when user logs in/out
- Load user data on sign in
- Clear data on sign out
- Handle token refresh

---

## Authentication Flow Diagrams

### Sign Up Flow

```
User Enters Email/Password
      │
      ▼
Validate Input (client-side)
      │
      ├─── Invalid → Show error
      │
      ▼
Call supabase.auth.signUp()
      │
      ├─── Error → Show error message
      │
      ▼
User Created + Auto-signed In
      │
      ├──> SIGNED_IN event fired
      │
      ▼
Load User Data (quest progress)
      │
      ▼
Check for LocalStorage Migration
      │
      ├─── Has progress → Show migration modal
      │
      └─── No progress → Skip migration
```

### Sign In Flow

```
User Enters Email/Password
      │
      ▼
Validate Input (client-side)
      │
      ├─── Invalid → Show error
      │
      ▼
Call supabase.auth.signInWithPassword()
      │
      ├─── Error → Show error message
      │
      ▼
User Authenticated
      │
      ├──> SIGNED_IN event fired
      │
      ▼
Load User Data (quest progress)
      │
      ▼
Sync LocalStorage with Supabase
```

### Session Restoration Flow

```
App Loads
      │
      ▼
Call supabase.auth.getSession()
      │
      ├─── Session exists → Auto-restore
      │         │
      │         ├──> Load quest progress
      │         └──> Update UI (logged in)
      │
      └─── No session → Show login screen
```

---

## Error Handling

### Common Errors

**Email Already Exists** (signUp):
```javascript
{
  error: {
    message: "User already registered",
    status: 422
  }
}
```
**Handling**: Show "Account already exists, try logging in" message

**Invalid Credentials** (signIn):
```javascript
{
  error: {
    message: "Invalid login credentials",
    status: 400
  }
}
```
**Handling**: Show "Invalid email or password" message (don't reveal which)

**Weak Password**:
```javascript
{
  error: {
    message: "Password should be at least 8 characters",
    status: 422
  }
}
```
**Handling**: Validate client-side before submission

**Network Error**:
```javascript
{
  error: {
    message: "Network request failed",
    status: 0
  }
}
```
**Handling**: Show "Connection error, try again" message

**Rate Limit Exceeded**:
```javascript
{
  error: {
    message: "Too many requests",
    status: 429
  }
}
```
**Handling**: Show "Too many attempts, please wait" message

---

## Security Considerations

### JWT Tokens

**Access Token**:
- Short-lived (1 hour default)
- Used for authenticated requests
- Stored in localStorage
- Includes user claims: `sub` (user_id), `email`, `role`

**Refresh Token**:
- Long-lived (30 days default)
- Used to get new access tokens
- Stored in localStorage
- Automatically used by Supabase client

### Token Refresh

**Automatic Refresh**:
```javascript
// Supabase client automatically refreshes tokens
// No manual implementation needed
createClient(url, key, {
  auth: {
    autoRefreshToken: true // default
  }
});
```

**Manual Refresh** (if needed):
```javascript
const { data, error } = await supabase.auth.refreshSession();
```

### Session Persistence

**LocalStorage** (default):
- Session survives page refreshes
- Session survives browser restarts
- User stays logged in

**SessionStorage** (alternative):
- Session cleared on tab close
- More secure but worse UX

### Row Level Security Integration

**JWT Claims in RLS**:
```sql
-- RLS policies use auth.uid() which reads from JWT
CREATE POLICY "Users view own data"
  ON quest_progress
  FOR SELECT
  USING (auth.uid() = user_id);
```

**How it works**:
1. User authenticates → receives JWT
2. JWT includes `sub` claim with user UUID
3. Database queries include JWT in request
4. RLS policies use `auth.uid()` to read JWT claims
5. Only matching rows returned

---

## Testing Checklist

### Unit Tests (Mock Supabase Responses)

- [ ] Sign up with valid email/password
- [ ] Sign up with existing email (error)
- [ ] Sign up with weak password (error)
- [ ] Sign in with valid credentials
- [ ] Sign in with invalid credentials (error)
- [ ] Sign out
- [ ] Get session when authenticated
- [ ] Get session when not authenticated
- [ ] Update user metadata
- [ ] Request password reset
- [ ] Auth state change listener fires correctly

### Integration Tests (Real Supabase Project)

- [ ] Create account → auto-signed in
- [ ] Sign out → session cleared
- [ ] Sign in → session restored
- [ ] Refresh page → session persists
- [ ] Token refresh works automatically
- [ ] RLS policies enforce user data isolation
- [ ] Password reset email received

### Manual Testing

- [ ] Sign up flow (UI → Database)
- [ ] Sign in flow (UI → Database)
- [ ] Sign out flow (UI → LocalStorage cleared)
- [ ] Session restoration on page load
- [ ] Migration prompt shows for existing users
- [ ] Password reset email received and works

---

## Implementation Notes

### Client Initialization

```javascript
// src/api/supabase-client.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
```

### Service Wrapper

```javascript
// src/services/auth-service.js
import { supabase } from '../api/supabase-client.js';

export class AuthService {
  async signUp(email, password) {
    return await supabase.auth.signUp({ email, password });
  }
  
  async signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password });
  }
  
  async signOut() {
    return await supabase.auth.signOut();
  }
  
  async getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }
  
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
}
```

---

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/auth-signup)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [JWT.io](https://jwt.io/) - Decode and inspect JWTs

---

**Generated**: 2025-11-15  
**Author**: GitHub Copilot (via speckit.plan workflow)
