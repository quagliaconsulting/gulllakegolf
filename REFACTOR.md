Okay, let's take a step back and perform a deep dive into the entire project structure to understand how it's put together and identify potential areas for refactoring.
1. Root Directory Structure
Standard Next.js: .next/, public/, next.config.js, tsconfig.json, package.json, .env.
Source Code: src/ (good practice).
Database: prisma/ directory suggests Prisma ORM is used. db_backup/ implies manual backup procedures.
Styling: tailwind.config.js, postcss.config.js confirm Tailwind CSS.
Types: Separate types/ directory at the root (might be redundant with src/types/ if that exists).
Configuration/Scripts: setup.sh, env/ (potentially for environment management beyond .env?), .eslintrc.json.
Documentation: README.md, ARCHITECTURE.md, SUGGESTIONS.md, CLAUDE.md.
Other: .git/, node_modules/, .gitignore, example Excel file.
Potential Cleanup: old/ directory might contain deprecated code. tsconfig.tsbuildinfo is a cache file.
2. src Directory Structure
Standard Next.js: pages/ (contains UI pages and API routes, although src/api also exists - potential confusion), styles/ (global styles), middleware.ts.
Code Organization:
components/: Reusable UI components.
lib/: Library code, often utilities, helpers, or third-party integrations.
hooks/: Custom React hooks.
utils/: General utility functions.
types/: TypeScript type definitions specific to the src directory (preferred over root types/).
api/: This is potentially confusing alongside pages/api/. It might contain client-side API fetching logic or helpers, or perhaps backend service logic separate from Next.js API routes. Needs investigation.
models/: Likely contains data model definitions or interfaces, possibly related to Prisma schemas or API responses.
assets/: Static assets like images, icons (if not in public/).
3. Deeper Dive into Subdirectories
Let's examine the contents of some key directories.
Okay, src/api is empty. This simplifies things - API routes are likely exclusively within src/pages/api/.
This looks like a standard RESTful API structure mirroring the data entities (tournaments, matches, players, teams, etc.). This is a reasonable approach.
The component structure seems feature-oriented (tournaments/) plus a general layout/ directory. This is a good start, but let's see how granular it is.
These component file sizes (SinglesFoursomeEditor.tsx at 616 lines, MoneyTab.tsx at 812 lines) are quite large. This suggests they likely handle significant logic and UI, and could be candidates for breaking down into smaller, more focused sub-components.
src/lib: Seems focused on authentication (auth.ts, authContext.tsx). Putting context providers in lib is okay, but sometimes they live in context or providers.
src/utils: Contains domain-specific logic (prizeCalculator.ts, handicap.ts) mixed with more general utilities (formatters.ts, api.ts for client-side API calls?, another auth.ts - potential duplication/confusion with lib/auth.ts). This suggests utils might be too much of a catch-all.
4. Initial Analysis & Potential Refactoring Areas
Based on this exploration:
Massive Components/Pages:
src/pages/tournaments/[id]/index.tsx (2758 lines) is extremely large. It handles multiple tabs (Overview, Schedule, Scorecards, Leaderboard, Teams, Money, Settings). This is the prime candidate for refactoring.
src/components/tournaments/MoneyTab.tsx (812 lines) and src/components/tournaments/SinglesFoursomeEditor.tsx (616 lines) are also very large and should be broken down.
src/pages/tournaments/[id]/scoring.tsx (now ~660 lines after edits) is manageable but could potentially be broken down further (e.g., score table component).
Other large pages (new.tsx 889 lines, index.tsx 779 lines in src/pages/tournaments/, batch-assign.tsx 1020 lines) also warrant investigation.
State Management:
Primarily uses useState for local component state.
Uses SWR (useSWR) for server state management (fetching, caching, revalidation), which is good.
Uses React Context (src/lib/authContext.tsx) for authentication state.
The large components likely have complex useState interactions that could be simplified by extracting state logic into custom hooks or smaller components.
Data Fetching:
Consistent use of SWR with a shared fetcher function is good.
API calls are also made directly with axios (e.g., in handleSave functions, payment updates). Consolidating data fetching logic (perhaps using SWR for mutations too, or dedicated API helper functions) could improve consistency.
Code Duplication/Organization:
Two auth.ts files (lib/ and utils/) need clarification/consolidation.
Helper functions (formatDate, classNames, calculateDurationDays, ordinal) are defined directly within src/pages/tournaments/[id]/index.tsx. These should be moved to src/utils/ or a dedicated helpers file.
The getStrokesOnHole logic was present in both index.tsx and scoring.tsx originally (now refactored in scoring.tsx). Ensure it's centralized, perhaps in src/utils/handicap.ts.
src/utils mixes domain logic (handicap, prizes) with general utilities. Could be split further, e.g., domain logic moved closer to features or into src/lib.
Type Safety:
TypeScript is used, and dedicated src/types/ and src/models/ directories exist (need to check content/overlap).
Interfaces were added/updated in scoring.tsx, which is good. Consistent use of defined types across the app, especially for API responses and component props, is crucial.
Directory Structure:
Generally follows Next.js conventions.
The main point of contention is the large page/component files. A more feature-centric structure within components/ and breaking down large pages could help. For example, instead of one massive [id]/index.tsx, have sub-components for each tab within a src/features/tournament-details/ directory.
Prisma/Database: prisma/ directory exists. Need to check how API routes (src/pages/api/) interact with Prisma. Ideally, there's a layer (src/lib/prisma.ts or similar) abstracting the client instance.
Refactoring Plan Outline:
Consolidate Utilities & Types:
Move helper functions (formatDate, etc.) from index.tsx to src/utils/formatters.ts or a new src/utils/helpers.ts.
Consolidate lib/auth.ts and utils/auth.ts. Decide if auth logic belongs in lib or a dedicated auth feature folder.
Review src/types and src/models for overlap and ensure clear, consistent type definitions are used everywhere. Potentially merge into one, e.g., src/types.
Centralize handicap calculation logic (getStrokesOnHole, etc.) in src/utils/handicap.ts.
Break Down Large Pages/Components:
src/pages/tournaments/[id]/index.tsx: This is the highest priority.
Create a new directory: src/features/tournament-details/components/.
Extract the content of each tab (Overview, Schedule, Scorecards, Leaderboard, Teams, Money, Settings) into its own component within this new directory (e.g., OverviewTab.tsx, LeaderboardTab.tsx).
The main index.tsx page becomes much smaller, primarily handling routing, SWR data fetching for the main tournament object, tab state management, and rendering the active tab component, passing necessary data down as props.
Further break down components within each tab (e.g., LeaderboardTab.tsx could contain TeamStandingsTable.tsx and PlayerLeaderboardTable.tsx).
src/components/tournaments/MoneyTab.tsx: If this isn't already addressed by the above point (i.e., if it was used by the old index.tsx), break it down into smaller parts (e.g., PaymentOverviewCards.tsx, PayoutStructureTable.tsx, PlayerPaymentManagementTable.tsx, PaymentModal.tsx). Move these into src/features/tournament-details/components/ or a dedicated src/features/payments/ directory.
src/pages/tournaments/[id]/scoring.tsx:
Extract the score table into a dedicated component (ScoreEntryTable.tsx) within src/features/scoring/components/ or similar.
Extract the match details display into a component.
Extract the match selector logic into a component.
Apply similar breakdown strategies to other large files like new.tsx, batch-assign.tsx.
Refine Data Fetching & State:
Ensure SWR is used consistently for fetching server state where caching/revalidation is beneficial.
Consider using SWR for mutations as well, or create dedicated, typed API helper functions (e.g., in src/lib/apiClient.ts or feature-specific API files) instead of raw axios calls within components/pages.
For complex client-side state within features (like the scoring page's scores state), consider custom hooks (useScoringState) to encapsulate the logic.
Improve Directory Structure (Optional but Recommended):
Consider adopting a more feature-based structure within src/. Example:
Apply to scoring.tsx
Review API Routes (src/pages/api/):
Ensure consistent request handling, validation, and error responses.
Verify clean separation from Prisma logic (using a shared client instance).
This plan prioritizes breaking down the largest, most complex parts of the application first ([id]/index.tsx), followed by organizing shared logic and improving data flow. The feature-based directory structure is a larger change but significantly improves long-term maintainability.
