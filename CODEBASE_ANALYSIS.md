# Gull Lake Golf Tournament App: Codebase Analysis & Refactoring Strategy

## Current Architecture Overview

The codebase is currently in a transitional state between two different architectural approaches:

1. **Old Architecture**:
   - Organized primarily around Next.js pages and API routes
   - Monolithic components (some 1000+ lines)
   - Direct database access in API handlers
   - Global utility functions in `/utils`
   - API client in `/utils/api.ts`
   - Mixed patterns for data fetching and state management

2. **New Architecture (Partial Implementation)**:
   - Feature-based organization in `/features` directory
   - Domain-driven service layer in `/services`
   - Custom hooks for complex state management
   - Standardized API response formats
   - Centralized Prisma client
   - Component decomposition

## Critical Path Components & Services

### Core Application Flow
1. **Authentication** - NextAuth.js + custom JWT implementation
2. **Tournament Management** - CRUD operations for tournaments
3. **Match Scheduling** - Creating and organizing matches
4. **Player Assignment** - Assigning players to matches
5. **Scoring System** - Recording and calculating match scores

### Essential Files & Directories

#### Frontend (React Components)
- `/src/pages/*` - Next.js pages (old architecture)
- `/src/features/*` - Feature-specific components (new architecture)
- `/src/components/*` - Shared UI components (mix of old and new)

#### Backend (API & Services)
- `/src/pages/api/*` - API routes (old architecture with some refactoring)
- `/src/services/*` - Domain-specific business logic (new architecture)
- `/src/lib/*` - Core utilities and shared resources

#### Data & State Management
- `/src/hooks/*` - Custom React hooks (old and new)
- `/prisma/*` - Database schema and migrations
- `/src/utils/api.ts` - Old API client
- `/src/services/api/apiClient.ts` - New API client

## Issues & Pain Points

### 1. Architectural Inconsistencies
- Two different API clients (`utils/api.ts` vs `services/api/apiClient.ts`)
- Inconsistent URL handling (duplicate `/api` prefix issues)
- Mix of old and new component organization patterns
- Redundant authentication implementations

### 2. Code Quality Issues
- Extremely large components (1000+ lines)
- Lack of proper error handling in some areas
- Missing type definitions or any types
- Inconsistent naming conventions

### 3. Technical Debt
- Duplicate functionality across files
- Deprecated patterns from earlier Next.js versions
- Multiple ways to accomplish the same tasks

## Redundant & Outdated Components

### API Clients & Utilities
- `/src/utils/api.ts` - Outdated but still in use
- `/src/services/api/apiClient.ts` - New implementation with better error handling

### Tournament Views
- `/src/pages/tournaments/[id]/index.tsx` - Outdated monolithic implementation
- `/src/features/tournaments/components/TournamentDetails.tsx` - New decomposed implementation

### Scoring Implementation
- `/src/pages/tournaments/[id]/matches/[matchId]/scorecard.tsx` - Old implementation
- `/src/features/scoring/components/ScorecardPage.tsx` - New decomposed implementation

## Refactoring Strategy & Roadmap

### Phase 1: Stabilize Current Implementation
1. **Fix URL path issues**
   - Standardize all API calls to use one approach (either with or without `/api` prefix)
   - Update all hook imports to use the new apiClient

2. **Consolidate API Clients**
   - Migrate all components to use the new apiClient from services
   - Add proper error handling and logging

3. **Fix Authentication Flow**
   - Ensure consistent token handling across the application
   - Fix any remaining issues with NextAuth integration

### Phase 2: Complete Component Migration
1. **Migrate Remaining Pages to Features**
   - Move and refactor remaining pages into the feature-based structure
   - Break down large components into smaller, focused ones

2. **Complete Service Layer**
   - Implement missing services (PlayerService, ScheduleService)
   - Add comprehensive error handling and validation

3. **Improve Type Safety**
   - Add proper TypeScript interfaces for all API requests/responses
   - Remove any types and add proper generics

### Phase 3: Clean Up & Optimization
1. **Remove Redundant Code**
   - Delete old implementations once new ones are fully tested
   - Remove deprecated utilities and helpers

2. **Performance Optimization**
   - Optimize data fetching with proper caching
   - Improve component rendering performance

3. **Testing & Documentation**
   - Add comprehensive tests for critical paths
   - Document architecture and patterns

## Specific Recommendations

### URLs & API Client
1. Standardize on using the new `/services/api/apiClient.ts`
2. Configure baseURL consistently (either use `/api` prefix in the client or in the URLs)
3. Add proper typing for all API responses

### Directory Structure
1. Complete the features-based organization:
   - Move remaining tournament components to `/features/tournaments`
   - Move remaining player components to `/features/players`
   - Move match-related components to `/features/matches`

2. Organize services by domain:
   - Complete the implementation of `tournamentService.ts`
   - Implement a comprehensive `playerService.ts`
   - Refactor `matchService.ts` to cover all match-related operations

### Components to Safely Remove (After Migration)
1. `/src/utils/api.ts` (replace with `/src/services/api/apiClient.ts`)
2. `/src/pages/tournaments/[id]/matches/[matchId]/scorecard.tsx.bak` (backup file)
3. Old authentication utilities that are now handled by the auth service

## Execution Plan

### Immediate Steps (Fix Critical Issues)
1. Standardize on one approach for API URLs (with or without `/api` prefix)
2. Fix the duplicate API request issues in TournamentDetails
3. Implement missing API endpoints (like leaderboard)

### Short-Term Goals (Improve User Experience)
1. Complete the useTournamentDetails hook implementation
2. Fix navigation between tournament and match views
3. Ensure scoring functionality works correctly

### Medium-Term Goals (Architectural Improvements)
1. Complete the migration to feature-based architecture
2. Standardize on one API client implementation
3. Remove redundant code and files

### Long-Term Goals (Maintainability)
1. Add comprehensive test coverage
2. Improve documentation
3. Optimize performance

## Conclusion

The codebase is currently in a transitional state between two architectural approaches. By completing the migration to the new feature-based architecture with proper service abstractions, the application will be more maintainable, testable, and extensible. The recommended approach is to stabilize the current implementation first, then systematically migrate components to the new structure, and finally clean up redundant code.