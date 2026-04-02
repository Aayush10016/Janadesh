# Advanced Blockchain Voting Platform - Backend

This is the backend API server for the Advanced Blockchain Voting Platform, built with Node.js, Express, TypeScript, PostgreSQL, and Redis.

## Features

- **Express.js** with TypeScript for robust API development
- **PostgreSQL** with connection pooling for data persistence
- **Redis** for caching and session management
- **JWT** authentication with refresh tokens
- **Rate limiting** and security middleware
- **Comprehensive logging** with Winston
- **Health checks** and monitoring endpoints
- **Graceful shutdown** handling
- **Environment-based configuration**

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- Redis (v6 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
   - Database connection details
   - Redis connection details
   - JWT secrets
   - Blockchain configuration

## Development

Start the development server with hot reloading:
```bash
npm run dev
```

## Building

Build the TypeScript code:
```bash
npm run build
```

## Production

Start the production server:
```bash
npm start
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Linting

Run ESLint:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

## API Endpoints

### Health Check
- `GET /health` - System health status

### API Info
- `GET /api/v1` - API version and information

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables (Production)
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens
- `DB_PASSWORD` - Database password
- `PRIVATE_KEY` - Blockchain private key

## Architecture

The backend follows a layered architecture:

- **Config Layer**: Environment configuration and service connections
- **Middleware Layer**: Authentication, validation, error handling
- **Route Layer**: API endpoint definitions
- **Service Layer**: Business logic and external service integration
- **Data Layer**: Database and cache operations

## Logging

The application uses Winston for structured logging:
- Console output in development
- File output in production
- Separate error log file
- HTTP request logging with Morgan

## Security

Security measures implemented:
- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation
- JWT authentication
- Password hashing with bcrypt

## Database

PostgreSQL is used for persistent data storage with:
- Connection pooling
- Transaction support
- Health monitoring
- Migration support (to be implemented)

## Caching

Redis is used for:
- Session management
- API response caching
- Rate limiting counters
- Real-time data storage

## Monitoring

Health check endpoint provides:
- Database connection status
- Redis connection status
- System uptime
- Service health metrics

## Error Handling

Comprehensive error handling with:
- Custom error classes
- Structured error responses
- Request correlation IDs
- Detailed logging

## Graceful Shutdown

The server handles shutdown gracefully:
- Closes HTTP server
- Closes database connections
- Closes Redis connections
- Completes pending requests