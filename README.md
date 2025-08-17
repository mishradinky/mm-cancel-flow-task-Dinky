# Cancel Flow Task - Dynamic Subscription Cancellation Flow

A Next.js 15 application that provides a dynamic subscription cancellation flow with A/B testing capabilities. This project demonstrates a sophisticated approach to subscription retention through configurable cancellation flows, offers, and user experience optimization.

## 🚀 Features

### ✨ Dynamic Configuration System
- **Environment-based configuration** - All settings configurable via environment variables
- **Dynamic content management** - Cancellation reasons, offers, and UI text configurable
- **Feature flags** - Enable/disable features without code changes
- **CMS integration ready** - Built-in support for external content management

### 📱 Responsive Design
- **Mobile-first approach** - Perfect experience on all devices
- **Adaptive layouts** - Automatically adjusts to screen size
- **Touch-friendly** - Optimized for mobile interactions
- **Progressive enhancement** - Works on all browsers

### 🧪 A/B Testing
- **Deterministic testing** - Consistent variant assignment per user
- **Cryptographically secure** - Uses `window.crypto.getRandomValues()`
- **Real-time analytics** - Track conversion rates and user behavior
- **Configurable splits** - Adjust test distribution via environment variables

### 📊 Analytics & Tracking
- **Comprehensive tracking** - Every user interaction is tracked
- **Multiple providers** - Google Analytics, Mixpanel, and custom endpoints
- **Performance monitoring** - Track load times and user experience
- **Error tracking** - Automatic error reporting and monitoring

### 🔒 Security & Performance
- **Row-level security** - Supabase RLS policies for data protection
- **Input validation** - Comprehensive client and server-side validation
- **Error resilience** - Graceful fallbacks when services are unavailable
- **Performance optimized** - Fast loading and smooth interactions

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, CSS Modules
- **Database**: Supabase Cloud (PostgreSQL)
- **Analytics**: Google Analytics, Mixpanel, Custom
- **Deployment**: Vercel, Netlify, or any Node.js hosting

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (free tier available)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd cancel-flow-task-main
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp env.example .env.local
```

Edit `.env.local` with your configuration:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_NAME=Migrate Mate
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENV=development

# Feature Flags
NEXT_PUBLIC_ENABLE_AB_TESTING=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_FEEDBACK=true

# Pricing Configuration
NEXT_PUBLIC_DEFAULT_MONTHLY_PRICE=2500
NEXT_PUBLIC_DOWSELL_DISCOUNT_AMOUNT=1000
NEXT_PUBLIC_AB_TEST_SPLIT=0.5

# UI Configuration
NEXT_PUBLIC_PRIMARY_COLOR=#8952fc
NEXT_PUBLIC_SECONDARY_COLOR=#7b40fc
NEXT_PUBLIC_SUCCESS_COLOR=#10b981
NEXT_PUBLIC_ERROR_COLOR=#ef4444

# Analytics (Optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_ga_id
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
```

### 3. Supabase Setup

#### Option A: Use Your Existing Supabase Project
1. Go to your Supabase dashboard
2. Copy your project URL and anon key
3. Update `.env.local` with your credentials

#### Option B: Create New Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the project URL and anon key
4. Update `.env.local`

### 4. Database Schema
The database schema will be automatically created when you first run the app. If you need to manually set up the schema, you can run:

```bash
# For local development (optional)
npm run supabase:setup

# For production (using your Supabase cloud project)
# The schema will be created automatically when you first run the app
```

### 5. Start Development
```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

## 🎯 Configuration Guide

### Dynamic Content Configuration

The application supports dynamic content through the configuration system:

#### Cancellation Reasons
```typescript
// In src/lib/config.ts
cancellationReasons: [
  {
    id: 'too-expensive',
    label: 'Too expensive',
    requiresFeedback: false,
    requiresAmount: true,
    amountPlaceholder: '0.00'
  },
  // Add more reasons...
]
```

#### Offers
```typescript
offers: [
  {
    id: '50-percent-off',
    label: 'Get 50% off',
    discountPercentage: 50,
    discountAmount: 1250,
    description: 'Limited time offer',
    isActive: true,
    variant: 'both'
  }
]
```

### A/B Testing Configuration

#### Variant Logic
- **Variant A**: Direct path to cancellation flow (no downsell)
- **Variant B**: Shows offer before cancellation flow

#### Split Configuration
```bash
# 50/50 split (default)
NEXT_PUBLIC_AB_TEST_SPLIT=0.5

# 70/30 split (70% to variant A)
NEXT_PUBLIC_AB_TEST_SPLIT=0.7
```

### Analytics Configuration

#### Google Analytics
```bash
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

#### Mixpanel
```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
```

## 📱 Mobile Compatibility & Responsive Design

### ✅ Full Mobile Support

This application is designed with **mobile-first responsive design** and provides excellent mobile compatibility:

#### 📐 Responsive Breakpoints
- **Mobile** (< 768px): Full-screen modals, stacked layouts, touch-optimized controls
- **Tablet** (768px - 1024px): Medium modals, adaptive layouts
- **Desktop** (> 1024px): Large modals, optimal spacing

#### 🎯 Mobile-Specific Features
- **Touch-Friendly Interface**: Large touch targets, swipe gestures
- **Adaptive Modal System**: Full-screen on mobile, centered on desktop
- **Mobile-First CSS**: Progressive enhancement from mobile to desktop
- **Responsive Typography**: Scalable text sizes across devices
- **Optimized Performance**: Fast loading on mobile networks

#### 🔧 Mobile Implementation Details

**Responsive Utilities (`src/lib/responsive.ts:21`)**
```typescript
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < parseInt(breakpoints.md);
}

export function useResponsive() {
  // Real-time responsive state management
  const [isMobile, setIsMobile] = useState(false);
  // ... responsive hook implementation
}
```

**CSS Breakpoints**
```typescript
export const breakpoints = {
  xs: '320px',    // Small phones
  sm: '640px',    // Large phones
  md: '768px',    // Tablets
  lg: '1024px',   // Small laptops
  xl: '1280px',   // Large laptops
  '2xl': '1536px' // Desktops
};
```

**Mobile-Specific CSS (Example from `src/component/css/01-MainEntry.module.css:100`)**
```css
/* Extra small mobile devices */
@media (max-width: 480px) {
  .overlay {
    padding: 1rem;
  }
  
  .popup {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
}
```

#### 📱 Mobile Testing

The CI/CD pipeline includes automated mobile compatibility checks:
- Responsive CSS validation
- Touch interaction verification
- Mobile utility function testing
- Screen size adaptation testing

## 🚀 Deployment & CI/CD Pipeline

### GitHub Actions - Enterprise-Grade CI/CD

This project includes a comprehensive CI/CD pipeline following industry best practices:

#### 🔄 Automated Workflows

**Main CI/CD Pipeline (`.github/workflows/ci.yml`)**
- **Code Quality**: TypeScript type checking, ESLint analysis
- **Security Audit**: Vulnerability scanning, secret detection
- **Testing**: Unit tests with coverage reporting
- **Build Verification**: Production build validation
- **Performance Analysis**: Bundle size monitoring
- **Automated Deployment**: Zero-downtime deployment to production

**Pull Request Review (`.github/workflows/pr-review.yml`)**
- **Automated Code Review**: Comprehensive analysis with actionable feedback
- **Mobile Compatibility Check**: Responsive design validation
- **Security & Privacy Validation**: Sensitive data exposure prevention
- **Review Checklist**: Industry-standard review criteria

#### 🔧 Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Deployment (Vercel)
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

#### 📊 Pipeline Features

- **Parallel Execution**: Jobs run concurrently for faster feedback
- **Fail-Fast Strategy**: Early termination on critical failures
- **Artifact Management**: Build artifacts cached and shared between jobs
- **Environment Protection**: Production deployments require approval
- **Rollback Capability**: Automatic rollback on deployment failures

### Vercel - Auto-Deployment
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/cancel-flow-task-main)

**Features:**
- Automatic deployment on every push to main
- Preview deployments for pull requests
- Zero-downtime deployments with instant rollback
- Built-in CDN and edge optimization

### Manual Deployment
```bash
npm run build
npm start
```

## 📊 Analytics & Monitoring

### Tracked Events
- `popup_opened` - When cancellation popup is opened
- `cancellation_flow_step` - Each step in the cancellation flow
- `ab_test_event` - A/B test interactions
- `offer_interaction` - Offer views, accepts, declines
- `cancellation_completed` - Final cancellation with reason
- `feedback_submitted` - User feedback submissions

### Performance Metrics
- Page load times
- Component render times
- User interaction latency
- Error rates

## 🔧 Development

### Project Structure
```
src/
├── app/                 # Next.js app directory
├── component/           # React components
│   ├── css/            # CSS modules
│   └── tsx/            # TypeScript components
├── lib/                # Utility libraries
│   ├── config.ts       # Configuration system
│   ├── analytics.ts    # Analytics system
│   ├── responsive.ts   # Responsive utilities
│   ├── ab-testing.ts   # A/B testing logic
│   └── database-operations.ts # Database operations
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run supabase:setup # Setup local Supabase (optional)
```

### Adding New Features

1. **New Configuration Options**
   - Add to `src/lib/config.ts`
   - Update environment variables
   - Document in README

2. **New Components**
   - Create in `src/component/tsx/`
   - Add corresponding CSS module
   - Update main flow in `01-MainEntry.tsx`

3. **New Analytics Events**
   - Add to `src/lib/analytics.ts`
   - Track in components
   - Document in analytics section

## 🐛 Troubleshooting

### Common Issues

#### Supabase Connection Issues
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify Supabase project is active
# Check Row Level Security policies
```

#### A/B Testing Not Working
```bash
# Check feature flag
echo $NEXT_PUBLIC_ENABLE_AB_TESTING

# Verify database connection
# Check browser console for errors
```

#### Analytics Not Tracking
```bash
# Check feature flag
echo $NEXT_PUBLIC_ENABLE_ANALYTICS

# Verify analytics IDs are correct
# Check browser console for errors
```

### Debug Mode
Enable debug logging by setting:
```bash
NEXT_PUBLIC_APP_ENV=development
```

## 📈 Performance Optimization

### Bundle Size
- Tree-shaking enabled
- Dynamic imports for large components
- Optimized images and assets

### Loading Performance
- Lazy loading for non-critical components
- Preloading for critical resources
- Optimized CSS delivery

### Runtime Performance
- Memoized components where appropriate
- Efficient state management
- Optimized re-renders

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the configuration guide

---

**Built with ❤️ using Next.js, React, and Supabase**
