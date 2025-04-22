# Tournament Details Page: Analysis & Fix Plan

## Current Implementation Analysis

The tournament details page has been refactored from a monolithic implementation to a component-based architecture. However, there are issues with the API calls and data handling that are causing errors.

### Current Architecture

1. **Page Component**:
   - `/src/pages/tournaments/[id]/index.tsx` - Simple wrapper that renders `TournamentDetails`

2. **Main Feature Component**:
   - `/src/features/tournaments/components/TournamentDetails.tsx` - Container component that uses hooks and renders tabs

3. **Custom Hook**:
   - `/src/features/tournaments/hooks/useTournamentDetails.ts` - Handles data fetching and state management

4. **Tab Components**:
   - `/src/features/tournaments/components/OverviewTab.tsx`
   - `/src/features/tournaments/components/ScheduleTab.tsx`
   - `/src/features/tournaments/components/ScorecardsTab.tsx`
   - `/src/features/tournaments/components/LeaderboardTab.tsx`
   - `/src/features/tournaments/components/TeamsTab.tsx`
   - `/src/features/tournaments/components/SettingsTab.tsx`
   - `/src/components/tournaments/MoneyTab.tsx` (still in old location)

### Issues Identified

1. **API URL Inconsistencies**:
   - `useTournamentDetails.ts` uses `/tournaments/[id]` format which causes `/api/api/tournaments/[id]` requests
   - `LeaderboardTab.tsx` uses `/tournaments/[id]/leaderboard` format
   - Missing API endpoint for leaderboard

2. **API Client Issues**:
   - Using `useApi` from `services/api/apiClient.ts` with incorrect URL format
   - Some components might still be using old API client

3. **Missing API Endpoints**:
   - The leaderboard API endpoint is missing (404 errors)
   - Schedule endpoint may have incorrect response format

4. **Error Handling**:
   - Not gracefully handling 404 errors
   - No fallback UI for missing data

## Fix Strategy

### 1. API URL Standardization

Update all API calls in `useTournamentDetails.ts` and related components to use consistent URL format:

```typescript
// FROM
useApi(tournamentId ? `/tournaments/${tournamentId}` : null)

// TO
useApi(tournamentId ? `/api/tournaments/${tournamentId}` : null)
```

### 2. Implement Missing API Endpoints

Create necessary API endpoints that are currently missing:

1. **Leaderboard Endpoint**:
   - Create `/src/pages/api/tournaments/[id]/leaderboard.ts`
   - Implement using TournamentService.getTournamentLeaderboard()

2. **Fix Schedule Endpoint**:
   - Ensure `/src/pages/api/tournaments/[id]/schedule.ts` returns consistent format
   - Use TournamentService.getTournamentSchedule()

### 3. Improve Error Handling

1. Update the API client to handle errors consistently:
   - Log detailed error information
   - Return empty objects for 404s instead of failing
   - Provide helpful error messages

2. Add fallback UI for components when data is missing:
   - "No data available" states for each tab
   - Proper loading indicators

### 4. Improve Component Communication

1. Ensure proper data flow between components:
   - Pass complete tournament data to all tabs
   - Use consistent property names

2. Fix refresh mechanisms:
   - Ensure all tabs can refresh their data independently
   - Coordinate refreshes when data is updated

## Implementation Steps

### Step 1: Fix API Client Configuration

1. Update `src/services/api/apiClient.ts`:
   - Set `baseURL: ''` to avoid prefix duplication
   - Improve error handling
   - Add detailed logging

### Step 2: Fix API URLs in useTournamentDetails

1. Update `src/features/tournaments/hooks/useTournamentDetails.ts`:
   ```typescript
   // Change this
   useApi(tournamentId ? `/tournaments/${tournamentId}` : null)
   
   // To this
   useApi(tournamentId ? `/api/tournaments/${tournamentId}` : null)
   ```

2. Update all other API calls in the hook.

### Step 3: Implement Missing API Endpoints

1. Create Leaderboard Endpoint:
   ```typescript
   // src/pages/api/tournaments/[id]/leaderboard.ts
   import type { NextApiRequest, NextApiResponse } from 'next';
   import { TournamentService } from '@/services/tournament/tournamentService';
   import { sendSuccess, sendError } from '@/services/api/apiResponse';

   const tournamentService = new TournamentService();

   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     const { id } = req.query;
     
     if (!id || typeof id !== 'string') {
       return sendError(res, 'Invalid tournament ID', 400);
     }
     
     try {
       const leaderboardData = await tournamentService.getTournamentLeaderboard(id);
       return sendSuccess(res, leaderboardData);
     } catch (error) {
       console.error('Error fetching leaderboard:', error);
       return sendError(res, 'Failed to fetch leaderboard data');
     }
   }
   ```

### Step 4: Fix LeaderboardTab Component

1. Update `src/features/tournaments/components/LeaderboardTab.tsx`:
   ```typescript
   // Change this
   useApi(tournamentId ? `/tournaments/${tournamentId}/leaderboard` : null)
   
   // To this
   useApi(tournamentId ? `/api/tournaments/${tournamentId}/leaderboard` : null)
   ```

2. Add fallback UI for when leaderboard data is missing:
   ```tsx
   if (!leaderboardData && !leaderboardError) {
     return (
       <div className="text-center py-8">
         <p className="text-gray-500">No leaderboard data available</p>
       </div>
     );
   }
   ```

### Step 5: Test Critical Paths

1. Tournament details main view
2. Each tab's functionality:
   - Overview
   - Schedule
   - Scorecards
   - Leaderboard
   - Teams
   - Settings
   - Money

## File Modification List

### Direct Changes (High Priority)

1. `src/services/api/apiClient.ts` - Update baseURL and error handling
2. `src/features/tournaments/hooks/useTournamentDetails.ts` - Fix API URLs
3. `src/features/tournaments/components/LeaderboardTab.tsx` - Fix API URL
4. Create `src/pages/api/tournaments/[id]/leaderboard.ts`

### Potential Changes (Medium Priority)

1. `src/features/tournaments/components/TournamentDetails.tsx` - Improve error handling
2. `src/features/tournaments/components/ScheduleTab.tsx` - Check API URLs
3. `src/features/tournaments/components/ScorecardsTab.tsx` - Check API URLs

## Testing Plan

1. Navigate to tournaments listing page
2. Click on a tournament to view details
3. Verify the main tournament information loads correctly
4. Check each tab:
   - Overview tab shows correct tournament data
   - Schedule tab shows matches properly
   - Scorecards tab allows accessing match scorecards
   - Leaderboard tab shows team and player standings
   - Teams tab displays correct team information
   - Settings tab functions correctly
   - Money tab shows financial information

## Long-term Improvements

1. Complete migration of all tournament-related components to the feature-based structure
2. Add comprehensive TypeScript interfaces for tournament data
3. Implement proper loading states and error handling for all components
4. Add unit tests for critical functionality
5. Consider adding optimistic updates for better UX