# CLAUDE.md - Gull Lake Golf Tournament App

## Build Commands
- Dev server: `npm run dev` (port 3050)
- Production build: `npm run build`
- Start production: `npm run start`
- Lint: `npm run lint`
- Type checking: `npm run typecheck`
- Tests: `npm run test`
- Single test: `npm test -- -t "test name pattern"`

## Database Commands
- Generate client: `npm run prisma:generate`
- Run migrations: `npm run prisma:migrate`
- Seed data: `npm run prisma:seed`
- Reset database: `npm run prisma:reset`
- Connect to database CLI: `npx prisma studio`
- Backup database: `node prisma/db_backup.js`
- Restore database: `python prisma/db_backup_restore.py`

## Code Style Guidelines
- **Imports**: Group React/Next.js, then third-party, then local imports (use `@/` for project imports)
- **Components**: Functional components with React Hooks, PascalCase naming
- **Types**: Define interfaces in `src/types/models.ts`, explicit parameter and return types
- **State Management**: React Context and SWR for data fetching
- **Error Handling**: Use try/catch blocks with consistent error handling
- **Naming**: PascalCase for components/interfaces, camelCase for variables/functions
- **Styling**: Tailwind CSS for component styling

## Project Structure
- `src/pages/` - Next.js pages and API routes
- `src/components/` - Reusable React components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility libraries and helpers
- `src/types/` - TypeScript interfaces and types
- `src/utils/` - Utility functions
- `src/styles/` - Global CSS and Tailwind config
- `prisma/` - Database schema and migrations

## Authentication
- Next-Auth for authentication
- JWT for API route protection
- Add Authorization header for API requests: `headers: { Authorization: Bearer ${token} }`
- Local JWT secret set in .env file (change in production)

## Golf Tournament Features
- Tournament creation and management
- Team and player management
- Course and hole management
- Match scheduling and scoring
- Format types: Singles, Best Ball, Alternate Shot, Chapman, Scramble, 4-Man Team
- Handicap calculation based on format
- Results tracking and reporting
- Statistics and prize calculation
- CTP (Closest to Pin) and Skins games
- Support for home/away team designation

## Development Notes
- Home team designation is stored in team metadata as `metadata.isHomeTeam` (boolean)
- Singles format matches use player-to-player matches with 2 players per team
- Foursome groups in Singles format are linked via `foursomeGroupId`
- Match scoring follows proper golf scoring rules with handicap stroke allocation
- Players are assigned to matches via the PlayerPairing model

## Environment Setup
- PostgreSQL database required
- Set DATABASE_URL in .env file
- Node.js v14+ recommended
- Install dependencies: `npm install`
- Initialize database: `npm run prisma:migrate` then `npm run prisma:seed`