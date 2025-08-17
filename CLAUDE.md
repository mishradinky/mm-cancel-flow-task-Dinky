# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint and fix issues
- `npm run type-check` - Run TypeScript type checking

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests for CI/CD (no watch, with coverage)

### Database Operations
- `npm run db:setup` - Start local Supabase and seed database
- `npm run db:reset` - Reset Supabase database
- `npm run db:migrate` - Push database migrations
- `npm run db:seed` - Seed database with test data
- `npm run supabase:setup` - Alternative setup command for local Supabase

### Analysis and Optimization
- `npm run analyze` - Build with bundle analysis enabled
- `npm run clean` - Clean build artifacts and cache

## Architecture Overview

This is a Next.js 15 application for a dynamic subscription cancellation flow with A/B testing capabilities. The architecture follows a component-based approach with centralized configuration management.

### Key Architecture Components

**Configuration System (`src/lib/config.ts`)**
- Centralized configuration management through environment variables
- Dynamic content system for cancellation reasons, offers, and UI text
- Feature flags for A/B testing, analytics, and feedback collection
- All pricing, colors, and content configurable without code changes

**A/B Testing Framework (`src/lib/ab-testing.ts`, `src/lib/use-ab-testing.ts`)**
- Deterministic variant assignment using cryptographically secure RNG
- Persistent variant storage in Supabase database
- Two variants: A (direct cancellation) and B (offer flow before cancellation)
- Graceful fallback to mock data when database unavailable

**Component Flow Architecture (`src/component/tsx/`)**
- Sequential numbered components (01-MainEntry.tsx through 15-Cancelled.tsx)
- State-driven navigation between cancellation flow steps
- Each component has corresponding CSS module in `src/component/css/`
- Main entry point controls entire flow state management

**Analytics & Data Engineering System**
- **Enhanced Analytics (`src/lib/enhanced-analytics.ts`)** - Singleton analytics service with comprehensive event tracking, user journey analysis, and external provider integration (Google Analytics, Mixpanel)
- **Data Pipeline (`src/lib/data-pipeline.ts`)** - ETL pipeline for daily metrics calculation, cohort analysis, and automated insights generation
- **Analytics Dashboard (`src/app/analytics/page.tsx`)** - Real-time visualization dashboard with KPIs, conversion funnels, A/B test results, and interactive charts
- **Legacy Analytics (`src/lib/analytics.ts`)** - Original analytics implementation for backward compatibility

**Responsive Design (`src/lib/responsive.ts`)**
- Mobile-first responsive design with breakpoint-based layouts
- Adaptive modals and form layouts across devices
- Touch-friendly interactions for mobile optimization

### Database Schema

The application uses Supabase with the following key tables:
- `users` - User account information and authentication
- `subscriptions` - User subscription details, pricing, and status  
- `cancellations` - Stores cancellation attempts, reasons, and A/B test assignments
- `analytics_events` - Individual user events for the enhanced analytics system
- `user_journeys` - Complete user journey data with step-by-step tracking
- `daily_metrics` - Aggregated daily analytics for dashboard visualization
- `user_cohorts` - Cohort retention data for churn analysis
- Row-level security (RLS) policies for data protection
- Automatic schema creation on first run via `seed.sql`

### Environment Configuration

Essential environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for admin operations
- `NEXT_PUBLIC_ENABLE_AB_TESTING` - Enable/disable A/B testing
- `NEXT_PUBLIC_AB_TEST_SPLIT` - A/B test split ratio (0.0-1.0)
- `NEXT_PUBLIC_ENABLE_ANALYTICS` - Enable/disable analytics tracking
- `NEXT_PUBLIC_ENABLE_FEEDBACK` - Enable/disable feedback collection
- `NEXT_PUBLIC_DEFAULT_MONTHLY_PRICE` - Default subscription price in cents
- `NEXT_PUBLIC_DOWSELL_DISCOUNT_AMOUNT` - Downsell discount amount in cents
- UI colors: `NEXT_PUBLIC_PRIMARY_COLOR`, `NEXT_PUBLIC_SECONDARY_COLOR`, etc.
- Analytics: `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`, `NEXT_PUBLIC_MIXPANEL_TOKEN`

### Development Workflow

1. **Environment Setup**: Copy `env.example` to `.env.local` and configure
2. **Database**: Run `npm run db:setup` for local development
3. **Development**: Use `npm run dev` for hot reloading with Turbopack
4. **Testing**: Run `npm run test:watch` during development
5. **Code Quality**: Always run `npm run lint` and `npm run type-check` before commits

### Component Numbering System

Components follow a sequential flow:
- 01-MainEntry.tsx - Main popup and flow orchestration
- 02-JobFoundForm.tsx - Job finding questionnaire
- 03-FeedbackForm.tsx - Feedback collection
- 04-YesWithMM.tsx - Success with Migrate Mate
- 05-YesMM.tsx - Yes path with Migrate Mate assistance
- 06-NoWithoutMM.tsx - Success without Migrate Mate
- 07-VisaNoMM.tsx - Visa assistance without Migrate Mate
- 08-CancellationSuccess.tsx - Cancellation success page
- 09-SuccessNoMM.tsx - Success page without Migrate Mate
- 10-Offer.tsx - Downsell offer presentation
- 11-FeedbackFormOffer.tsx - Feedback form after offer
- 12-SubscriptionPopup.tsx - Subscription management popup
- 13-CancellationFlow.tsx - Reason selection (deprecated)
- 14-reasons.tsx - Detailed reason form and cancellation flow
- 15-Cancelled.tsx - Final cancellation confirmation

This numbering allows for easy insertion of new steps while maintaining logical flow order.

### Testing Configuration

The project uses Jest with the following setup:
- Test environment: jsdom for DOM testing
- Coverage thresholds: 70% for branches, functions, lines, and statements
- Path aliases: `@/` maps to `src/`
- Setup file: `jest.setup.js` for test utilities
- Tests located in `__tests__` directories alongside source files

### Key Libraries and Dependencies

- **Frontend**: Next.js 15, React 19, TypeScript
- **Database**: Supabase (PostgreSQL with real-time capabilities)
- **Styling**: Tailwind CSS 4, CSS Modules
- **Charts & Visualization**: Recharts for analytics dashboard
- **Testing**: Jest, React Testing Library, @testing-library/jest-dom
- **Development**: Turbopack for fast dev builds

## Data Engineering & Analytics Architecture

### Enhanced Analytics System (`src/lib/enhanced-analytics.ts`)
- **Singleton Pattern**: Single instance managing all analytics across the application
- **Event Tracking**: Comprehensive tracking of user interactions, page views, and custom events
- **Journey Analytics**: Step-by-step user journey tracking with completion rates and abandonment analysis
- **External Integrations**: Google Analytics 4 and Mixpanel with proper type safety
- **Error Handling**: Graceful fallbacks when external services are unavailable
- **Device Detection**: Automatic device and browser information collection

### Data Pipeline (`src/lib/data-pipeline.ts`)
- **ETL Process**: Daily Extract, Transform, Load operations for analytics aggregation
- **Metrics Calculation**: Real-time and batch calculation of conversion rates, revenue metrics, and funnel analysis
- **Cohort Analysis**: Automated cohort retention tracking and analysis
- **Automated Insights**: AI-driven insights generation with statistical significance testing
- **Data Cleanup**: Automatic cleanup of old analytics events to maintain performance
- **Error Resilience**: Robust error handling with detailed logging for monitoring

### Analytics Dashboard (`src/app/analytics/page.tsx`)
- **Real-time KPIs**: Live metrics cards for sessions, conversions, and revenue
- **Interactive Charts**: Line charts, pie charts, and funnel visualizations using Recharts
- **Time Range Filtering**: Dynamic data filtering for 7, 30, and 90-day periods
- **A/B Test Visualization**: Statistical comparison of variant performance
- **Responsive Design**: Mobile-optimized dashboard with adaptive layouts
- **Export Capabilities**: Ready for CSV/PDF export functionality

### Database Integration Strategy
- **Graceful Degradation**: Application continues functioning when database is unavailable
- **Mock Data Fallbacks**: Intelligent fallbacks to demonstrate functionality
- **Connection Pooling**: Optimized database connections for high-performance analytics
- **Batch Operations**: Efficient bulk operations for analytics data processing

### Analytics Routes & APIs
- `/analytics` - Main analytics dashboard
- `DataPipeline.runDailyETL()` - Manual ETL execution
- `DataPipeline.getRealTimeMetrics()` - Current day metrics API
- Analytics events are automatically tracked on all user interactions

### Performance Considerations
- **Async Processing**: Non-blocking analytics collection
- **Client-side Caching**: Intelligent caching of analytics data
- **Lazy Loading**: Analytics dashboard components loaded on demand
- **Memory Management**: Efficient cleanup of analytics event listeners

## Error Handling & Development Notes

### Database Connection Issues
- A/B testing gracefully falls back to cryptographically secure variant assignment when database is unavailable
- Analytics system continues functioning with in-memory event tracking
- All database operations include comprehensive error handling with appropriate fallbacks

### Type Safety
- All analytics interfaces use `Record<string, unknown>` instead of `any` for better type safety
- External analytics providers (gtag, mixpanel) are properly typed with window object assertions
- Jest DOM types are configured for testing utilities

### Development Server
- Uses Turbopack for fast hot reloading
- Automatically handles port conflicts (will use 3001, 3002, 3003, etc.)
- Analytics events are logged to console in development mode for debugging