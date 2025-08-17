// Data Engineering Pipeline for Analytics Processing
import { createClient } from '@supabase/supabase-js';

interface AnalyticsEvent {
  event_name: string;
  event_properties?: Record<string, unknown>;
  session_id: string;
  user_id?: string;
  variant?: string;
  created_at: string;
}

interface UserJourney {
  variant: string;
  journey_outcome: string;
  completed_steps: number;
  time_to_complete: number;
  created_at: string;
}

interface CohortUser {
  user_id: string;
  variant: string;
  created_at: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for data operations
);

interface DailyMetricsCalculation {
  date: string;
  totalUsers: number;
  totalSessions: number;
  cancellationAttempts: number;
  cancellationsCompleted: number;
  downsellOffersShown: number;
  downsellOffersAccepted: number;
  monthlyRevenueAtRisk: number;
  revenueSavedByDownsell: number;
  averageCustomerValue: number;
  variantAUsers: number;
  variantBUsers: number;
  variantAConversions: number;
  variantBConversions: number;
  step1Completions: number;
  step2Completions: number;
  step3Completions: number;
  step4Completions: number;
  step5Completions: number;
}

export class DataPipeline {
  
  /**
   * Main ETL process - run daily via cron job
   */
  static async runDailyETL(targetDate?: Date) {
    const date = targetDate || new Date();
    const dateStr = date.toISOString().split('T')[0];
    
    console.log(`Running daily ETL for ${dateStr}`);
    
    try {
      // 1. Calculate daily metrics
      const metrics = await this.calculateDailyMetrics(dateStr);
      
      // 2. Update daily_metrics table
      await this.upsertDailyMetrics(metrics);
      
      // 3. Process cohort data
      await this.processCohortData(date);
      
      // 4. Clean up old data
      await this.cleanupOldData();
      
      // 5. Generate insights
      await this.generateInsights();
      
      console.log(`ETL completed successfully for ${dateStr}`);
      
    } catch (error) {
      console.error('ETL process failed:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive daily metrics
   */
  private static async calculateDailyMetrics(date: string): Promise<DailyMetricsCalculation> {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    
    // Get all events for the day
    const { data: events } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);
    
    // Get all journeys for the day
    const { data: journeys } = await supabase
      .from('user_journeys')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);
    
    // Get all cancellations for the day
    const { data: cancellationsData } = await supabase
      .from('cancellations')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    // Calculate metrics
    const uniqueSessions = new Set(events?.map(e => e.session_id) || []);
    const uniqueUsers = new Set(events?.map(e => e.user_id).filter(Boolean) || []);
    
    const cancellationAttempts = events?.filter(e => e.event_name === 'cancellation_attempt_started').length || 0;
    const completedCancellations = journeys?.filter(j => j.journey_outcome === 'completed').length || 0;
    
    const downsellEvents = events?.filter(e => e.event_name === 'downsell_offer_presented') || [];
    const downsellAccepted = events?.filter(e => e.event_name === 'downsell_offer_accepted').length || 0;
    
    // Use cancellations data for additional metrics
    const actualCancellations = cancellationsData?.length || 0;
    
    // Revenue calculations
    const monthlyRevenueAtRisk = Math.max(completedCancellations, actualCancellations) * 2500; // $25 per cancellation
    const revenueSavedByDownsell = downsellAccepted * 1500; // Assuming $15 saved per acceptance
    const averageCustomerValue = 2500; // Base subscription value
    
    // A/B test metrics
    const variantAJourneys = journeys?.filter(j => j.variant === 'A') || [];
    const variantBJourneys = journeys?.filter(j => j.variant === 'B') || [];
    const variantAConversions = variantAJourneys.filter(j => j.journey_outcome === 'completed').length;
    const variantBConversions = variantBJourneys.filter(j => j.journey_outcome === 'completed').length;
    
    // Funnel metrics
    const stepCompletions = this.calculateFunnelSteps(events || [], journeys || []);
    
    return {
      date,
      totalUsers: uniqueUsers.size,
      totalSessions: uniqueSessions.size,
      cancellationAttempts,
      cancellationsCompleted: completedCancellations,
      downsellOffersShown: downsellEvents.length,
      downsellOffersAccepted: downsellAccepted,
      monthlyRevenueAtRisk,
      revenueSavedByDownsell,
      averageCustomerValue,
      variantAUsers: variantAJourneys.length,
      variantBUsers: variantBJourneys.length,
      variantAConversions,
      variantBConversions,
      ...stepCompletions
    };
  }

  /**
   * Calculate funnel step completions
   */
  private static calculateFunnelSteps(events: AnalyticsEvent[], journeys: UserJourney[]) {
    return {
      step1Completions: events.filter(e => e.event_name === 'cancel_popup_opened').length,
      step2Completions: events.filter(e => e.event_name === 'journey_step_completed' && e.event_properties?.stepNumber === 1).length,
      step3Completions: events.filter(e => e.event_name === 'journey_step_completed' && e.event_properties?.stepNumber === 2).length,
      step4Completions: events.filter(e => e.event_name === 'journey_step_completed' && e.event_properties?.stepNumber === 3).length,
      step5Completions: journeys.filter(j => j.journey_outcome === 'completed').length,
    };
  }

  /**
   * Upsert daily metrics to database
   */
  private static async upsertDailyMetrics(metrics: DailyMetricsCalculation) {
    const { error } = await supabase
      .from('daily_metrics')
      .upsert({
        date: metrics.date,
        total_users: metrics.totalUsers,
        total_sessions: metrics.totalSessions,
        cancellation_attempts: metrics.cancellationAttempts,
        cancellations_completed: metrics.cancellationsCompleted,
        downsell_offers_shown: metrics.downsellOffersShown,
        downsell_offers_accepted: metrics.downsellOffersAccepted,
        monthly_revenue_at_risk: metrics.monthlyRevenueAtRisk,
        revenue_saved_by_downsell: metrics.revenueSavedByDownsell,
        average_customer_value: metrics.averageCustomerValue,
        variant_a_users: metrics.variantAUsers,
        variant_b_users: metrics.variantBUsers,
        variant_a_conversions: metrics.variantAConversions,
        variant_b_conversions: metrics.variantBConversions,
        step_1_completions: metrics.step1Completions,
        step_2_completions: metrics.step2Completions,
        step_3_completions: metrics.step3Completions,
        step_4_completions: metrics.step4Completions,
        step_5_completions: metrics.step5Completions,
      }, {
        onConflict: 'date'
      });

    if (error) {
      throw new Error(`Failed to upsert daily metrics: ${error.message}`);
    }
  }

  /**
   * Process cohort retention data
   */
  private static async processCohortData(date: Date) {
    const cohortMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const cohortMonthStr = cohortMonth.toISOString().split('T')[0];
    
    // Get users from this cohort month
    const { data: cohortUsers } = await supabase
      .from('analytics_events')
      .select('user_id, variant, created_at')
      .gte('created_at', cohortMonthStr)
      .lt('created_at', new Date(cohortMonth.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .eq('event_name', 'user_identified');

    if (!cohortUsers || cohortUsers.length === 0) return;

    // Calculate retention for different variants
    const variants = ['A', 'B'];
    
    for (const variant of variants) {
      const variantUsers = cohortUsers.filter(u => u.variant === variant);
      if (variantUsers.length === 0) continue;

      // Calculate retention metrics (simplified - would need more complex logic for real retention)
      const retentionMetrics = await this.calculateRetentionMetrics(variantUsers);
      
      // Upsert cohort data
      await supabase
        .from('user_cohorts')
        .upsert({
          cohort_month: cohortMonthStr,
          variant,
          initial_users: variantUsers.length,
          month_1_retention: retentionMetrics.month1,
          month_2_retention: retentionMetrics.month2,
          month_3_retention: retentionMetrics.month3,
          initial_mrr: variantUsers.length * 25, // $25 per user
          month_1_mrr: retentionMetrics.month1 * 25,
          month_2_mrr: retentionMetrics.month2 * 25,
          month_3_mrr: retentionMetrics.month3 * 25,
        }, {
          onConflict: 'cohort_month,variant'
        });
    }
  }

  /**
   * Calculate retention metrics for a cohort
   */
  private static async calculateRetentionMetrics(users: CohortUser[]) {
    // Simplified retention calculation
    // In production, this would check actual subscription status over time
    const baseRetention = users.length;
    
    return {
      month1: Math.round(baseRetention * 0.85), // 85% retention month 1
      month2: Math.round(baseRetention * 0.75), // 75% retention month 2
      month3: Math.round(baseRetention * 0.70), // 70% retention month 3
    };
  }

  /**
   * Clean up old analytics data
   */
  private static async cleanupOldData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days of detailed events
    
    const { error } = await supabase
      .from('analytics_events')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
    
    if (error) {
      console.warn('Failed to cleanup old analytics events:', error);
    }
  }

  /**
   * Generate automated insights and alerts
   */
  private static async generateInsights() {
    // Get recent metrics for comparison
    const { data: recentMetrics } = await supabase
      .from('daily_metrics')
      .select('*')
      .order('date', { ascending: false })
      .limit(7);

    if (!recentMetrics || recentMetrics.length < 2) return;

    const today = recentMetrics[0];
    const yesterday = recentMetrics[1];

    // Generate insights
    const insights = [];

    // Conversion rate alert
    const todayConversionRate = today.total_sessions > 0 ? (today.cancellations_completed / today.total_sessions) * 100 : 0;
    const yesterdayConversionRate = yesterday.total_sessions > 0 ? (yesterday.cancellations_completed / yesterday.total_sessions) * 100 : 0;
    
    if (Math.abs(todayConversionRate - yesterdayConversionRate) > 10) {
      insights.push({
        type: 'conversion_rate_change',
        severity: 'high',
        message: `Conversion rate changed by ${(todayConversionRate - yesterdayConversionRate).toFixed(1)}% compared to yesterday`,
        value: todayConversionRate,
        previousValue: yesterdayConversionRate
      });
    }

    // Revenue impact alert
    if (today.revenue_saved_by_downsell > yesterday.revenue_saved_by_downsell * 1.5) {
      insights.push({
        type: 'revenue_improvement',
        severity: 'positive',
        message: `Downsell strategy saved significantly more revenue today: $${today.revenue_saved_by_downsell}`,
        value: today.revenue_saved_by_downsell,
        previousValue: yesterday.revenue_saved_by_downsell
      });
    }

    // A/B test significance check
    const aConversionRate = today.variant_a_users > 0 ? (today.variant_a_conversions / today.variant_a_users) * 100 : 0;
    const bConversionRate = today.variant_b_users > 0 ? (today.variant_b_conversions / today.variant_b_users) * 100 : 0;
    
    if (Math.abs(aConversionRate - bConversionRate) > 5 && today.variant_a_users > 30 && today.variant_b_users > 30) {
      insights.push({
        type: 'ab_test_significance',
        severity: 'medium',
        message: `Significant difference in A/B test results: A=${aConversionRate.toFixed(1)}%, B=${bConversionRate.toFixed(1)}%`,
        value: { variantA: aConversionRate, variantB: bConversionRate },
        previousValue: null
      });
    }

    // Store insights (you might want to send these as alerts/notifications)
    for (const insight of insights) {
      await supabase
        .from('analytics_events')
        .insert({
          event_name: 'automated_insight',
          event_category: 'system',
          session_id: `system_${Date.now()}`,
          event_properties: insight,
          created_at: new Date().toISOString()
        });
    }

    return insights;
  }

  /**
   * Real-time metrics calculation for dashboard
   */
  static async getRealTimeMetrics() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    const [events, journeys] = await Promise.all([
      supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startOfDay),
      
      supabase
        .from('user_journeys')
        .select('*')
        .gte('created_at', startOfDay)
    ]);

    const uniqueSessions = new Set(events.data?.map(e => e.session_id) || []);
    const completedJourneys = journeys.data?.filter(j => j.journey_outcome === 'completed').length || 0;
    const downsellAccepted = events.data?.filter(e => e.event_name === 'downsell_offer_accepted').length || 0;

    return {
      sessionsToday: uniqueSessions.size,
      cancellationsToday: completedJourneys,
      downsellAcceptedToday: downsellAccepted,
      revenueAtRiskToday: completedJourneys * 25,
      revenueSavedToday: downsellAccepted * 15,
    };
  }
}

// Export utility functions for API routes
export const runDailyETL = DataPipeline.runDailyETL;
export const getRealTimeMetrics = DataPipeline.getRealTimeMetrics;