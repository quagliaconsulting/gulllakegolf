# JWT Token Fix for Gallery and Reports APIs

## Issue
Gallery and reports APIs were failing with the error "JWT malformed". This was happening because:

1. The cookie format provided by Next.js middleware (`cookies.token.value`) is different from what our API endpoints expected
2. We had multiple places in the code getting tokens in different ways without consistency
3. The middleware was detecting tokens but the verification was failing
4. The AuthService was trying to use NextAuth getToken which requires a secret parameter

## Fix

### Part 1: Simplified AuthService and Token Extraction

1. Updated `AuthService.getTokenFromRequest()` to check all possible token locations:
   ```typescript
   // Check for token in various cookie formats
   if (req.cookies?.token?.value) {
     return req.cookies.token.value;
   }
   
   if (req.cookies?.token) {
     return req.cookies.token;
   }
   
   if (req.cookies?.auth_token?.value) {
     return req.cookies.auth_token.value;
   }
   
   if (req.cookies?.auth_token) {
     return req.cookies.auth_token;
   }
   ```

### Part 2: Middleware Token Access Enhancement

Updated middleware to check for tokens in multiple cookie formats:
```typescript
const token = request.cookies.get('token')?.value || 
              request.cookies.get('auth_token')?.value ||
              request.headers.get('authorization')?.split(' ')[1];
```

### Part 3: Fixed NextAuth Conflicts

Removed NextAuth token processing from AuthService to avoid the error:
```typescript
MissingSecret: Must pass `secret` if not set to JWT getToken()
```

The updated code now only uses our custom JWT implementation:
```typescript
static async getSessionUser(req: NextApiRequest): Promise<SessionUser | null> {
  try {
    // Skip NextAuth token for now - it requires specific setup
    // Just use our own JWT token system
    
    const token = this.getTokenFromRequest(req);
    if (!token) {
      return null;
    }
    
    const payload = this.verifyToken(token);
    if (!payload) {
      return null;
    }
    
    return {
      id: payload.userId,
      name: payload.name || '',
      email: payload.email,
      role: payload.role as UserRole
    };
  } catch (error) {
    console.error('Failed to get session user:', error);
    return null;
  }
}
```

### Part 4: Standardized Authentication in API Routes

Replaced ad-hoc token extraction with the centralized AuthService:
```typescript
// Before
const token = authHeader?.startsWith('Bearer ') 
  ? authHeader.substring(7) 
  : req.cookies?.token;

if (!token) {
  return res.status(401).json({ error: 'Authentication required' });
}

// Verify token
if (!verifyToken(token, res)) {
  return; // Response already sent by verifyToken
}

// After
const user = await AuthService.requireAuth(req, res);
if (!user) {
  return; // Response already sent by requireAuth
}
```

### Updated API Endpoints:
1. `/pages/api/gallery/index.ts`
2. `/pages/api/gallery/upload.ts`
3. `/pages/api/reports/index.ts`
4. `/pages/api/reports/generate.ts`

## Benefits

1. **Consistency**: All API routes now use the same authentication logic
2. **Improved Error Handling**: Centralized error response format
3. **Adaptability**: The system now handles tokens from multiple sources consistently
4. **Maintainability**: Future authentication changes only need to be made in one place