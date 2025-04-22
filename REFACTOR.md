# Refactoring Plan for Gull Lake Golf Tournament App

## Refactoring Goals
- Improve code maintainability, readability, and testability
- Reduce duplication and establish clear patterns
- Create proper separation of concerns
- Maintain existing functionality without breaking changes

## Phase 1: Service Layer and API Cleanup
- [x] Create service directory structure with domain-specific services
- [x] Implement PlayerService, MatchService, TournamentService
- [x] Centralize Prisma client instantiation
- [x] Refactor API routes to use service layer
- [x] Standardize API responses and error handling

## Phase 2: Component Decomposition
- [x] Break down scorecard.tsx into smaller components
- [x] Extract reusable components from large pages
- [x] Create proper component hierarchy for tournament management
- [x] Implement custom hooks for complex state management

## Phase 3: State Management and Data Flow
- [x] Centralize SWR configurations and cache management
- [ ] Implement proper request/response types for API calls
- [x] Remove debug code and console.logs
- [ ] Create proper data validation layer

## Phase 4: Authentication Consolidation
- [x] Unify authentication between lib/auth.ts and utils/auth.ts
- [x] Improve token handling and security
- [x] Implement proper permission checks

## Directory Structure Changes

```
src/
├── components/          # Reusable UI components
├── features/            # Feature-specific components & logic
│   ├── auth/            # Authentication-related components
│   ├── matches/         # Match management components
│   ├── scoring/         # Scoring-related components
│   └── tournaments/     # Tournament-related components
├── hooks/               # Custom React hooks
├── lib/                 # Core libraries and utilities
├── pages/               # Next.js pages
├── services/            # Business logic and data access
│   ├── api/             # API client functions
│   ├── course/          # Course-related services
│   ├── match/           # Match-related services
│   ├── player/          # Player-related services
│   ├── schedule/        # Schedule-related services
│   └── tournament/      # Tournament-related services
├── styles/              # Global styles
├── types/               # TypeScript type definitions
└── utils/               # General purpose utilities
```

## Testing Strategy
- Minimal changes to each file at a time
- Maintain feature parity
- Manual testing of each modified component
- Compare output before/after changes
- Keep original files as references until new implementations are complete

## Progress Report (DELETE THIS SECTION WHEN RESUMING)

### Completed Work (April 21-23, 2025)
1. **Analysis & Setup**
   - Performed deep-dive analysis of the codebase
   - Identified major issues: oversized components, code duplication, architectural problems
   - Created a backup branch (`backup/pre-refactor`) and refactoring branch (`refactor/clean-architecture`)
   - Established detailed refactoring plan in REFACTOR.md

2. **Service Layer Implementation**
   - Created centralized Prisma client in `src/lib/prisma.ts`
   - Implemented standardized API response utilities in `src/services/api/apiResponse.ts`
   - Built comprehensive `MatchService` with proper separation of concerns
   - Created authentication service in `src/services/api/authService.ts`
   - Developed client-side API utilities in `src/services/api/apiClient.ts`

3. **API Refactoring**
   - Refactored match API endpoints to use the service layer
   - Standardized error handling and response formats
   - Improved structure and organization of API code

4. **Component Decomposition**
   - Implemented feature-based directory structure
   - Created `useScorecardState` hook to extract and manage state logic
   - Broke down the massive scorecard component into smaller pieces:
     - ScorecardHeader
     - PasswordModal
     - ScoreTable
     - ScorecardPage
   - Updated the main scorecard page to use new components

5. **Tournament Page Refactoring (April 22, 2025)**
   - Created a feature-based directory structure for tournament components
   - Implemented `useTournamentDetails` hook to extract and manage complex state
   - Broke down the massive tournament details page (2842 lines) into smaller components:
     - TournamentHeader
     - TournamentCountdown
     - TabNavigation
     - OverviewTab
     - ScheduleTab
     - ScorecardsTab
     - LeaderboardTab
     - TeamsTab
     - SettingsTab
   - Extracted utility functions into separate files
   - Updated the main tournament page to use the new component architecture

6. **Authentication Consolidation (April 22, 2025)**
   - Enhanced AuthService to support both NextAuth JWT and custom JWT tokens
   - Added proper role-based authorization with type safety (UserRole enum)
   - Implemented middleware for protecting API routes with role requirements
   - Created reusable authentication utilities (requireAuth, getSessionUser)
   - Improved error handling for authentication flows

7. **Batch Assign Players Refactoring (April 22, 2025)**
   - Refactored batch-assign.tsx (987 lines) into smaller components
   - Created feature-specific components (MatchAssignmentCard, PlayerSelectionList, SinglesMatchupBuilder)
   - Implemented useBatchAssign hook for state and data fetching logic
   - Improved code organization with clear separation of concerns
   - Enhanced type safety with proper interfaces

8. **Service Layer Expansion and Debugging Improvements (April 22, 2025)**
   - Implemented TournamentService for tournament operations
   - Created centralized logger for consistent logging patterns
   - Added methods for tournament CRUD, scheduling, and leaderboards
   - Prepared groundwork for API route refactoring
   - Improved database access patterns with proper error handling

9. **Financial Management Component Refactoring (April 23, 2025)**
   - Refactored MoneyTab component to features directory
   - Created proper type definitions for financial management
   - Extracted reusable components for CTP and Skins
   - Improved data fetching patterns with SWR
   - Enhanced error handling and loading states

10. **Singles Match Pairing Refactoring (April 23, 2025)**
    - Migrated SinglesFoursomeEditor to features directory
    - Extended MatchService with createFoursome method
    - Improved player matching and foursome group creation
    - Replaced direct API calls with service layer methods
    - Updated BatchAssignPage to use the new component
    - Added proper type definitions for match pairings

11. **Additional Service Implementation (April 24, 2025)**
    - Implemented PlayerService for player management operations
    - Implemented ScheduleService for schedule management
    - Refactored player API endpoints to use PlayerService
    - Refactored schedule API endpoints to use ScheduleService 
    - Cleaned up redundant components that had been migrated to features
    - Standardized API responses and error handling

### Next Steps
- Continue refactoring other large pages (players.tsx, tournaments/new.tsx)
- Refactor remaining tournament API routes to use TournamentService
- Improve type safety and add API request/response types
- Create unit tests for service layer
- Implement frontend validation with proper error messaging