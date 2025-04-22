# API URL Path Fix: Implementation Plan

## Problem Analysis

We've identified a critical issue with API URL handling:

1. **Two different API clients**:
   - `/src/utils/api.ts` - Used by older components, baseURL set to `/api` when env var is missing
   - `/src/services/api/apiClient.ts` - Used by newer components, baseURL set to `/api`

2. **Inconsistent URL formatting**:
   - Some components use URLs with `/api` prefix: `useApi('/api/tournaments/123')`
   - Some components use URLs without prefix: `useApi('/tournaments/123')`
   - This leads to duplicate paths like `/api/api/tournaments/123`

3. **Error handling inconsistencies**:
   - Old client doesn't handle 404 errors gracefully
   - New client now returns empty objects for 404s but could be improved

## Fix Strategy

### 1. Standardize API Client Configuration

```typescript
// In src/services/api/apiClient.ts
export const api = axios.create({
  // Use empty baseURL so we control the full path in each request
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 2. Standardize URL Format in All API Calls

All API requests should use the complete path with `/api` prefix:

```typescript
// In components and hooks:
useApi('/api/tournaments/123')
postApi('/api/matches/456/scores', data)
```

### 3. Update Import Statements in All Files

```typescript
// REPLACE
import { fetchData, postData } from '@/utils/api';
// WITH
import { useApi, postApi } from '@/services/api/apiClient';
```

## Implementation Steps

### Step 1: Fix API Client Configuration

1. Update `src/services/api/apiClient.ts`:
   - Set `baseURL: ''` to avoid prefix duplication
   - Enhance error handling for 404s and other status codes

2. Update `src/utils/api.ts` (for backward compatibility):
   - Set `baseURL: ''` to match the new pattern
   - Add logs to identify components still using old client

### Step 2: Fix URL Formats in Hooks

Update these key files to use consistent URL format:

1. `src/features/tournaments/hooks/useTournamentDetails.ts`:
   - Ensure all URLs include `/api` prefix

2. `src/features/scoring/hooks/useScorecardState.ts`:
   - Ensure all URLs include `/api` prefix

3. `src/features/batchAssign/hooks/useBatchAssign.ts`:
   - Ensure all URLs include `/api` prefix

### Step 3: Fix Components

Update direct API calls in components:

1. `src/features/tournaments/components/ScorecardsTab.tsx`
2. `src/features/tournaments/components/ScheduleTab.tsx`
3. `src/components/tournaments/MoneyTab.tsx`

### Step 4: Fix API Response Handling

1. Ensure all API endpoints return standardized response format:
   ```typescript
   {
     success: boolean,
     data?: any,
     error?: string,
     statusCode: number
   }
   ```

2. Update the API client's error handling to provide meaningful messages

### Step 5: Testing Plan

Test these critical paths after implementing changes:

1. Tournament listing page
2. Tournament details view
3. Scorecard functionality
4. Match management
5. Player assignment

## Long-term Solution

Once the immediate issues are fixed, we should:

1. Completely migrate from the old `utils/api.ts` to the new `services/api/apiClient.ts`
2. Add comprehensive TypeScript types for all API requests and responses
3. Implement a proper error handling strategy (UI feedback for errors)
4. Consider adding a request/response interceptor for logging and debugging

## Files to Update

### High Priority (Immediate Fix)
- `src/services/api/apiClient.ts`
- `src/utils/api.ts`
- `src/features/tournaments/hooks/useTournamentDetails.ts`
- `src/features/scoring/hooks/useScorecardState.ts`
- `src/features/tournaments/components/LeaderboardTab.tsx`

### Medium Priority (Next Phase)
- `src/features/batchAssign/hooks/useBatchAssign.ts`
- `src/features/tournaments/components/ScorecardsTab.tsx`
- `src/features/tournaments/components/ScheduleTab.tsx`
- `src/components/tournaments/MoneyTab.tsx`
- `src/hooks/useTournaments.ts`

### Low Priority (Final Phase)
- Remaining components using the old API client
- Pages using direct fetch calls instead of the API client