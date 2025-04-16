# Architecture - Gull Lake Golf Tournament App

This document outlines the architectural design of the Gull Lake Golf Tournament application, explaining the technology stack, data flow, component structure, and design decisions.

## Technology Stack

### Frontend
- **Next.js**: React framework for server-side rendering and API routes
- **React**: UI component library
- **TailwindCSS**: Utility-first CSS framework for styling
- **SWR**: React hooks library for data fetching and caching
- **Axios**: HTTP client for API requests
- **Heroicons**: SVG icon library

### Backend
- **Next.js API Routes**: Serverless functions for backend logic
- **Prisma ORM**: Database ORM for type-safe database access
- **PostgreSQL**: Relational database for data storage
- **NextAuth.js**: Authentication library
- **JWT**: JSON Web Tokens for API security

### Development Tools
- **TypeScript**: Static typing for JavaScript
- **ESLint**: Code linting
- **Prettier**: Code formatting

## System Architecture

The application follows a modern serverless architecture with the following components:

```
┌─────────────┐      ┌───────────┐      ┌────────────┐
│ React UI    │<────>│ Next.js   │<────>│ PostgreSQL │
│ Components  │      │ API Routes│      │ Database   │
└─────────────┘      └───────────┘      └────────────┘
       ^                   ^                  ^
       │                   │                  │
       v                   v                  v
┌─────────────┐      ┌───────────┐      ┌────────────┐
│ SWR Cache   │      │ Prisma ORM│      │ Migrations │
└─────────────┘      └───────────┘      └────────────┘
```

### Data Flow
1. User interacts with React components
2. Components trigger SWR data fetching hooks or API calls via Axios
3. API routes handle the requests, applying business logic
4. Prisma ORM communicates with PostgreSQL database
5. Data is returned to API routes
6. API routes respond to the frontend
7. SWR updates local cache and React re-renders components

## Database Schema

The database schema is defined in Prisma and represents the core domain model:

### Core Entities
- **Tournament**: The main entity representing a golf tournament
- **Team**: Groups of players competing in the tournament
- **Player**: Individual golfers with handicap information
- **Course**: Golf courses where matches are played
- **Hole**: Individual holes on a course with par and handicap index
- **Match**: Competitive rounds between teams
- **PlayerPairing**: Links players to matches
- **HoleResult**: Scores for each hole in a match
- **Schedule**: Organizes matches into daily schedules
- **FormatMultiplier**: Defines handicap calculation rules per format

### Key Relationships
- A tournament has many teams, courses, and schedules
- A team has many players and participates in matches
- A match belongs to a schedule and has many player pairings
- A course has many holes
- Players can participate in many matches via player pairings

### Specialized Features
- **Metadata JSON Field**: Used for flexible data storage (e.g., home team designation)
- **FoursomeGroupId**: Links related matches in Singles format
- **PlayerToPlayerMatch**: Identifies 1v1 player matches

## Component Architecture

The application follows a component-based architecture with:

### Page Components
- Located in `/src/pages/`
- Represent full pages in the application
- Handle routing and overall page structure
- Use shared layout components

### Reusable Components
- Located in `/src/components/`
- Smaller, focused components used across multiple pages
- Follow atomic design principles (atoms, molecules, organisms)

### Custom Hooks
- Located in `/src/hooks/`
- Abstract complex logic and state management
- Provide reusable functionality across components

### Utility Functions
- Located in `/src/utils/`
- Handle common operations like formatting, calculations, etc.
- Implement business logic separate from UI components

## Authentication Flow

1. User submits credentials on login page
2. NextAuth handles authentication
3. JWT token is generated and stored in cookies
4. API middleware validates JWT tokens for protected routes
5. Frontend includes token in requests to protected endpoints

## Key Design Patterns

### Repository Pattern
- API routes act as repositories for data access
- Each entity has dedicated API endpoints
- Centralizes database interactions

### Context Provider Pattern
- AuthContext provides authentication state to components
- Reduces prop drilling for auth-related functionality

### Data Fetching Pattern
- SWR for declarative data fetching and caching
- Optimistic UI updates for better user experience

### Component Composition
- Layout components wrap page content
- Higher-order components for repeated patterns
- Composable, reusable UI building blocks

## Application Modules

### Tournament Management
- Tournament creation, editing, and deletion
- Team and player assignment
- Schedule creation

### Match Management
- Player assignments to matches
- Singles format player-to-player pairings
- Foursome grouping

### Scoring System
- Score entry and validation
- Handicap calculation based on format
- Results tracking and reporting

### Authentication & Authorization
- User login and registration
- Role-based access control
- JWT token validation

## Performance Considerations

- **Data Fetching**: SWR provides caching and revalidation
- **Server-side Rendering**: Next.js SSR for faster initial loads
- **API Optimization**: Efficient database queries using Prisma
- **Component Optimization**: React.memo for expensive renders
- **Pagination**: Used for lists of entities (tournaments, players, etc.)

## Security Considerations

- **Authentication**: JWT tokens with appropriate expiration
- **API Protection**: Middleware validation of tokens
- **Input Validation**: Server-side validation of all inputs
- **CSRF Protection**: Built into Next.js API routes
- **Secure Cookies**: HTTP-only cookies for token storage
- **Environment Variables**: Secure storage of secrets

## Scalability Considerations

- **Serverless Architecture**: Scales automatically with Next.js API routes
- **Database Indexing**: Indexed fields for common queries
- **Connection Pooling**: Managed by Prisma client
- **Caching Strategy**: SWR caching reduces database load
- **Image Storage**: Separate storage for uploaded files