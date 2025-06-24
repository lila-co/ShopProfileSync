# SmartCart - Intelligent Shopping Assistant

## Overview

SmartCart is a web application designed to help users optimize their shopping experience by tracking purchases, providing spending insights, suggesting deals, and offering personalized shopping recommendations. The application uses a modern React frontend with a Node.js Express backend, connected to a PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.
Request type: Fix crashes and loading issues only - no UI, functionality, or layout changes.

## System Architecture

SmartCart follows a client-server architecture with the following components:

1. **Frontend**: React application using Vite as the build tool, with shadcn/ui components for the user interface. The frontend communicates with the backend via RESTful API calls using TanStack Query.

2. **Backend**: Express.js server providing API endpoints for user management, receipt parsing, and recommendation generation.

3. **Database**: PostgreSQL with Drizzle ORM for data persistence and schema management.

4. **Services**:
   - Receipt Parser: Simulated OCR service to extract information from receipt images
   - Recommendation Engine: Analyzes purchase patterns to suggest products and deals

The application is designed to be mobile-first, with a focus on a clean and intuitive user interface.

## Key Components

### Frontend Components

1. **Pages**:
   - Dashboard: Main page showing user insights and recommendations
   - Shopping Lists: Manage shopping lists
   - Scan: Upload receipt images
   - Deals: View deals from connected retailers
   - Profile: User preferences and settings

2. **UI Components**: 
   - Uses shadcn/ui component library built on top of Radix UI primitives
   - Tailwind CSS for styling

3. **State Management**:
   - TanStack Query for server state management
   - React Hook Form for form handling

### Backend Components

1. **API Routes**:
   - User profile management
   - Retailer connections
   - Receipt scanning and processing
   - Shopping insights and recommendations

2. **Services**:
   - `receiptParser.ts`: Handles OCR and data extraction from receipts
   - `recommendationEngine.ts`: Generates personalized product recommendations

3. **Data Storage**:
   - `storage.ts`: Interface for database operations

### Database Schema

The database schema includes the following entities:

1. **Users**: Personal information and shopping preferences
2. **Retailers**: Stores information
3. **RetailerAccounts**: Users' connections to retailers
4. **Products**: Product catalog
5. **Purchases**: User purchase records
6. **PurchaseItems**: Individual items in purchases
7. **ShoppingLists**: User shopping lists
8. **ShoppingListItems**: Items in shopping lists
9. **StoreDeals**: Current deals at retailers
10. **Recommendations**: Personalized product recommendations

## Data Flow

1. **User Registration/Login Flow**:
   - User creates an account or logs in
   - User sets up shopping preferences

2. **Receipt Scanning Flow**:
   - User takes a photo of a receipt
   - System extracts text using OCR (simulated)
   - Purchase data is stored in the database
   - Purchase patterns are analyzed

3. **Recommendation Flow**:
   - System analyzes purchase history
   - Recommendations are generated based on purchase patterns and user preferences
   - Deals are matched with user shopping needs

4. **Shopping List Flow**:
   - User creates shopping lists
   - System suggests items based on purchase patterns
   - System identifies the best deals for items on the list

## External Dependencies

### Frontend Dependencies
- React
- Wouter (for routing)
- TanStack Query (for data fetching)
- React Hook Form + Zod (for form validation)
- shadcn/ui components (based on Radix UI)
- Tailwind CSS (for styling)

### Backend Dependencies
- Express.js
- Drizzle ORM + drizzle-zod
- Zod (for schema validation)

### Database
- PostgreSQL (via Neon serverless PostgreSQL)

## Deployment Strategy

The application is deployed on Replit with the following configuration:

1. **Development Environment**:
   - `npm run dev` runs the development server
   - Vite provides hot module reloading and developer experience enhancements

2. **Production Build**:
   - `npm run build` compiles both frontend and backend
   - Frontend: Vite bundles React code to static files
   - Backend: esbuild bundles Node.js code

3. **Production Runtime**:
   - `npm run start` serves the production build
   - Express serves both the API and static frontend files

4. **Database**:
   - PostgreSQL is provisioned via Replit
   - Environment variables configure the database connection

## Getting Started for Development

1. Ensure the PostgreSQL module is enabled in Replit
2. Set up the required environment variables:
   - DATABASE_URL: Connection string for PostgreSQL
3. Run migrations with `npm run db:push`
4. Start the development server with `npm run dev`

## Recent Changes

**June 24, 2025**
- Fixed critical JavaScript error causing session state corruption in shopping-route.tsx
- Prevented premature session creation on route load - sessions now only persist with meaningful progress
- Added comprehensive session cleanup logic to remove invalid/expired sessions automatically
- Updated session validation to require actual shopping progress (completed items, aisle movement, etc.)
- Resolved "Continue Where You Left Off" notice appearing inappropriately - now only shows when user has made meaningful shopping progress

## API Structure

The API follows RESTful conventions with the following main endpoints:

1. `/api/user/profile`: User profile management
2. `/api/retailers`: Retailer information
3. `/api/user/retailer-accounts`: User's connected retailer accounts
4. `/api/receipts`: Receipt processing endpoints
5. `/api/recommendations`: Personalized product recommendations
6. `/api/insights`: Shopping insights