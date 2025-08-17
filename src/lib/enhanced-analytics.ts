// Enhanced Analytics System for Migrate Mate
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface AnalyticsEvent {
  eventName: string;
  eventCategory: string;
  sessionId: string;
  userId?: string;
  variant?: string;
  testName?: string;
  eventProperties?: Record<string, unknown>;
  userProperties?: Record<string, unknown>;
  pageUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  pageLoadTime?: number;
  timeOnPage?: number;
}

export interface JourneyStep {
  stepName: string;
  stepNumber: number;
  timestamp: string;
  timeSpent: number;
  userInput?: Record<string, unknown>;
  errors?: string[];
}

export interface UserJourney {
  sessionId: string;
  userId?: string;
  variant: string;
  flowPath: string;
  totalSteps: number;
  completedSteps: number;
  completionRate: number;
  timeToComplete: number;
  journeyOutcome: 'completed' | 'abandoned' | 'downsell_accepted';
  abandonmentStep?: string;
  stepsData: JourneyStep[];
  metadata?: Record<string, unknown>;
}

class EnhancedAnalytics {
  private static instance: EnhancedAnalytics;
  private journeyStartTime: number = 0;
  private currentJourney: JourneyStep[] = [];
  private sessionId: string = '';
  private userId?: string;
  private variant?: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.startPageTracking();
  }

  public static getInstance(): EnhancedAnalytics {
    if (!EnhancedAnalytics.instance) {
      EnhancedAnalytics.instance = new EnhancedAnalytics();
    }
    return EnhancedAnalytics.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo() {
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const browser = this.getBrowserName(userAgent);
    
    return {
      deviceType: isMobile ? 'mobile' : 'desktop',
      browser,
      userAgent,
    };
  }

  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getUtmParameters(): Record<string, string> {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utmSource: urlParams.get('utm_source') || '',
      utmMedium: urlParams.get('utm_medium') || '',
      utmCampaign: urlParams.get('utm_campaign') || '',
      utmContent: urlParams.get('utm_content') || '',
    };
  }

  private startPageTracking() {
    this.journeyStartTime = Date.now();
    
    // Track page load
    window.addEventListener('load', () => {
      const loadTime = Date.now() - this.journeyStartTime;
      this.trackEvent({
        eventName: 'page_loaded',
        eventCategory: 'navigation',
        sessionId: this.sessionId,
        pageLoadTime: loadTime,
      });
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent({
          eventName: 'page_hidden',
          eventCategory: 'engagement',
          sessionId: this.sessionId,
          timeOnPage: Date.now() - this.journeyStartTime,
        });
      } else {
        this.trackEvent({
          eventName: 'page_visible',
          eventCategory: 'engagement',
          sessionId: this.sessionId,
        });
      }
    });
  }

  public setUser(userId: string, userProperties?: Record<string, unknown>) {
    this.userId = userId;
    this.trackEvent({
      eventName: 'user_identified',
      eventCategory: 'user',
      sessionId: this.sessionId,
      userId,
      userProperties,
    });
  }

  public setVariant(variant: string, testName: string = 'downsell_ab_test') {
    this.variant = variant;
    this.trackEvent({
      eventName: 'ab_test_assigned',
      eventCategory: 'ab_testing',
      sessionId: this.sessionId,
      variant,
      testName,
      eventProperties: { assignedAt: new Date().toISOString() },
    });
  }

  public async trackEvent(event: Partial<AnalyticsEvent>) {
    const deviceInfo = this.getDeviceInfo();
    const utmParams = this.getUtmParameters();
    
    const fullEvent: AnalyticsEvent = {
      eventName: event.eventName!,
      eventCategory: event.eventCategory!,
      sessionId: this.sessionId,
      userId: this.userId,
      variant: this.variant,
      pageUrl: window.location.href,
      referrer: document.referrer,
      ...deviceInfo,
      ...utmParams,
      ...event,
    };

    try {
      // Store in Supabase
      const { error } = await supabase
        .from('analytics_events')
        .insert(fullEvent);

      if (error) {
        console.error('Analytics error:', error);
      }

      // Also send to external analytics if configured
      this.sendToExternalAnalytics(fullEvent);
    } catch (err) {
      console.error('Failed to track event:', err);
    }
  }

  private sendToExternalAnalytics(event: AnalyticsEvent) {
    // Google Analytics 4
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as unknown as { gtag: (command: string, event: string, params: Record<string, unknown>) => void }).gtag;
      gtag('event', event.eventName, {
        event_category: event.eventCategory,
        session_id: event.sessionId,
        variant: event.variant,
        ...event.eventProperties,
      });
    }

    // Mixpanel
    if (typeof window !== 'undefined' && 'mixpanel' in window) {
      const mixpanel = (window as unknown as { mixpanel: { track: (event: string, props: Record<string, unknown>) => void } }).mixpanel;
      mixpanel.track(event.eventName, {
        category: event.eventCategory,
        session_id: event.sessionId,
        variant: event.variant,
        ...event.eventProperties,
      });
    }
  }

  public trackJourneyStep(stepName: string, stepNumber: number, userInput?: Record<string, unknown>, errors?: string[]) {
    const now = Date.now();
    const timeSpent = this.currentJourney.length > 0 
      ? now - new Date(this.currentJourney[this.currentJourney.length - 1].timestamp).getTime()
      : now - this.journeyStartTime;

    const step: JourneyStep = {
      stepName,
      stepNumber,
      timestamp: new Date().toISOString(),
      timeSpent,
      userInput,
      errors,
    };

    this.currentJourney.push(step);

    // Track as event
    this.trackEvent({
      eventName: 'journey_step_completed',
      eventCategory: 'user_journey',
      sessionId: this.sessionId,
      eventProperties: {
        stepName,
        stepNumber,
        timeSpent,
        hasErrors: errors && errors.length > 0,
        userInput,
      },
    });
  }

  public async completeJourney(
    outcome: 'completed' | 'abandoned' | 'downsell_accepted',
    flowPath: string,
    abandonmentStep?: string
  ) {
    const timeToComplete = Date.now() - this.journeyStartTime;
    const completionRate = this.currentJourney.length > 0 
      ? (this.currentJourney.length / this.currentJourney.length) * 100 
      : 0;

    const journey: UserJourney = {
      sessionId: this.sessionId,
      userId: this.userId,
      variant: this.variant || 'A',
      flowPath,
      totalSteps: this.currentJourney.length,
      completedSteps: this.currentJourney.length,
      completionRate,
      timeToComplete: Math.round(timeToComplete / 1000), // Convert to seconds
      journeyOutcome: outcome,
      abandonmentStep,
      stepsData: this.currentJourney,
      metadata: {
        completedAt: new Date().toISOString(),
        browser: this.getDeviceInfo().browser,
        deviceType: this.getDeviceInfo().deviceType,
      },
    };

    try {
      // Save journey to database
      const { error } = await supabase
        .from('user_journeys')
        .insert(journey);

      if (error) {
        console.error('Journey tracking error:', error);
      }

      // Track completion event
      this.trackEvent({
        eventName: 'journey_completed',
        eventCategory: 'user_journey',
        sessionId: this.sessionId,
        eventProperties: {
          outcome,
          flowPath,
          timeToComplete: journey.timeToComplete,
          totalSteps: journey.totalSteps,
          completionRate: journey.completionRate,
        },
      });

      // Reset journey
      this.currentJourney = [];
      this.journeyStartTime = Date.now();
    } catch (err) {
      console.error('Failed to complete journey tracking:', err);
    }
  }

  // Marketing-specific tracking methods
  public trackCancellationAttempt(reason?: string, additionalData?: Record<string, unknown>) {
    this.trackEvent({
      eventName: 'cancellation_attempt_started',
      eventCategory: 'conversion',
      sessionId: this.sessionId,
      eventProperties: {
        reason,
        ...additionalData,
      },
    });
  }

  public trackDownsellOffer(offerType: string, offerValue: number, originalPrice: number) {
    this.trackEvent({
      eventName: 'downsell_offer_presented',
      eventCategory: 'conversion',
      sessionId: this.sessionId,
      eventProperties: {
        offerType,
        offerValue,
        originalPrice,
        discountPercentage: Math.round(((originalPrice - offerValue) / originalPrice) * 100),
      },
    });
  }

  public trackDownsellResponse(accepted: boolean, offerValue?: number, reason?: string) {
    this.trackEvent({
      eventName: accepted ? 'downsell_offer_accepted' : 'downsell_offer_declined',
      eventCategory: 'conversion',
      sessionId: this.sessionId,
      eventProperties: {
        offerValue,
        reason,
        responseTime: Date.now() - this.journeyStartTime,
      },
    });
  }

  public trackCancellationReason(reason: string, details?: Record<string, unknown>) {
    this.trackEvent({
      eventName: 'cancellation_reason_selected',
      eventCategory: 'feedback',
      sessionId: this.sessionId,
      eventProperties: {
        reason,
        ...details,
      },
    });
  }

  public trackRevenueLoss(monthlyValue: number, estimatedLifetimeValue: number) {
    this.trackEvent({
      eventName: 'revenue_at_risk',
      eventCategory: 'business_metrics',
      sessionId: this.sessionId,
      eventProperties: {
        monthlyValue,
        estimatedLifetimeValue,
        riskDate: new Date().toISOString(),
      },
    });
  }
}

// Export singleton instance
export const analytics = EnhancedAnalytics.getInstance();

// Utility functions for common tracking scenarios
export const trackCancelFlowEvents = {
  popupOpened: () => analytics.trackEvent({
    eventName: 'cancel_popup_opened',
    eventCategory: 'engagement',
    sessionId: analytics['sessionId'],
  }),

  stepCompleted: (stepName: string, stepNumber: number, userInput?: Record<string, unknown>) => {
    analytics.trackJourneyStep(stepName, stepNumber, userInput);
  },

  offerPresented: (offerType: string, discount: number) => {
    analytics.trackDownsellOffer(offerType, discount, 2500); // Assuming $25 base price
  },

  offerResponse: (accepted: boolean, reason?: string) => {
    analytics.trackDownsellResponse(accepted, undefined, reason);
  },

  cancellationCompleted: (reason: string, flowPath: string) => {
    analytics.trackCancellationReason(reason);
    analytics.completeJourney('completed', flowPath);
  },

  flowAbandoned: (step: string, flowPath: string) => {
    analytics.completeJourney('abandoned', flowPath, step);
  },
};