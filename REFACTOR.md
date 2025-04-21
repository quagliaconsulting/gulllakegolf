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
- [ ] Remove debug code and console.logs
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
│   ├── match/           # Match-related services
│   ├── player/          # Player-related services
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

### Completed Work (April 21, 2025)
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

### Next Steps
- Apply similar refactoring patterns to remaining large pages (batch-assign.tsx)
- Clean up debug code and console.logs
- Improve type safety and add API request/response types