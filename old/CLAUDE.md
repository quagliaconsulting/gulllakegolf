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

## Code Style Guidelines
- **Imports**: Group React/Next.js, then third-party, then local imports (use `@/` for project imports)
- **Components**: Functional components with React Hooks, PascalCase naming
- **Types**: Define interfaces in `src/types/models.ts`, explicit parameter and return types
- **State Management**: React Context and SWR for data fetching
- **Error Handling**: Use try/catch blocks with consistent error handling
- **Naming**: PascalCase for components/interfaces, camelCase for variables/functions
- **Styling**: Tailwind CSS for component styling