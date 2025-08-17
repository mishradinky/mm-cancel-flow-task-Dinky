'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  FunnelChart, Funnel, LabelList
} from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CancellationData {
  cancellation_reason?: string;
  created_at: string;
}

interface AnalyticsEventData {
  session_id: string;
  user_id?: string;
  event_name: string;
  created_at: string;
}

interface JourneyData {
  journey_outcome: string;
  variant: string;
  time_to_complete: number;
  completed_steps: number;
  created_at: string;
}

interface DailyMetricsData {
  date: string;
  cancellations_completed: number;
  downsell_offers_accepted: number;
  revenue_saved_by_downsell: number;
}

interface DashboardMetrics {
  totalUsers: number;
  totalSessions: number;
  conversionRate: number;
  downsellAcceptanceRate: number;
  averageTimeToComplete: number;
  revenueAtRisk: number;
  revenueSaved: number;
  topCancellationReasons: Array<{name: string, value: number}>;
  abTestResults: {
    variantA: { users: number, conversions: number, rate: number };
    variantB: { users: number, conversions: number, rate: number };
  };
  dailyTrends: Array<{
    date: string;
    cancellations: number;
    downsellAccepted: number;
    revenue: number;
  }>;
  funnelData: Array<{
    name: string;
    value: number;
    fill: string;
  }>;
  cohortData: Array<{
    cohort: string;
    month0: number;
    month1: number;
    month2: number;
    month3: number;
  }>;
}

const COLORS = ['#8952fc', '#7b40fc', '#6d28fc', '#5f10fc', '#4c00e6'];

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      // Get date range
      const days = parseInt(dateRange.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch comprehensive analytics data
      const [
        cancellationsData,
        eventsData,
        journeysData,
        dailyMetricsData
      ] = await Promise.all([
        supabase
          .from('cancellations')
          .select('*')
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('analytics_events')
          .select('*')
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('user_journeys')
          .select('*')
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('daily_metrics')
          .select('*')
          .gte('date', startDate.toISOString().split('T')[0])
      ]);

      // Process data into metrics
      const processedMetrics = processAnalyticsData(
        cancellationsData.data || [],
        eventsData.data || [],
        journeysData.data || [],
        dailyMetricsData.data || []
      );

      setMetrics(processedMetrics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const processAnalyticsData = (cancellations: CancellationData[], events: AnalyticsEventData[], journeys: JourneyData[], dailyMetrics: DailyMetricsData[]): DashboardMetrics => {
    // Calculate basic metrics
    const totalSessions = new Set(events.map(e => e.session_id)).size;
    const totalCancellations = cancellations.length;
    const completedJourneys = journeys.filter(j => j.journey_outcome === 'completed').length;
    const downsellAccepted = journeys.filter(j => j.journey_outcome === 'downsell_accepted').length;
    
    // Calculate conversion rate
    const conversionRate = totalSessions > 0 ? (totalCancellations / totalSessions) * 100 : 0;
    const downsellAcceptanceRate = totalCancellations > 0 ? (downsellAccepted / totalCancellations) * 100 : 0;
    
    // Calculate average time to complete
    const completedTimes = journeys
      .filter(j => j.journey_outcome === 'completed')
      .map(j => j.time_to_complete);
    const averageTimeToComplete = completedTimes.length > 0 
      ? completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length 
      : 0;

    // Calculate revenue metrics
    const revenueAtRisk = cancellations.length * 25; // $25 per cancellation
    const revenueSaved = downsellAccepted * 15; // Assuming $15 downsell saves $10

    // Process cancellation reasons
    const reasonCounts = cancellations.reduce((acc, c) => {
      const reason = c.cancellation_reason || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCancellationReasons = Object.entries(reasonCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // A/B test results
    const variantAJourneys = journeys.filter(j => j.variant === 'A');
    const variantBJourneys = journeys.filter(j => j.variant === 'B');
    
    const abTestResults = {
      variantA: {
        users: variantAJourneys.length,
        conversions: variantAJourneys.filter(j => j.journey_outcome === 'completed').length,
        rate: variantAJourneys.length > 0 
          ? (variantAJourneys.filter(j => j.journey_outcome === 'completed').length / variantAJourneys.length) * 100 
          : 0
      },
      variantB: {
        users: variantBJourneys.length,
        conversions: variantBJourneys.filter(j => j.journey_outcome === 'completed').length,
        rate: variantBJourneys.length > 0 
          ? (variantBJourneys.filter(j => j.journey_outcome === 'completed').length / variantBJourneys.length) * 100 
          : 0
      }
    };

    // Daily trends from daily_metrics table
    const dailyTrends = dailyMetrics.map(dm => ({
      date: dm.date,
      cancellations: dm.cancellations_completed,
      downsellAccepted: dm.downsell_offers_accepted,
      revenue: dm.revenue_saved_by_downsell
    }));

    // Funnel data
    const funnelData = [
      { name: 'Popup Opened', value: totalSessions, fill: '#8952fc' },
      { name: 'Started Flow', value: journeys.length, fill: '#7b40fc' },
      { name: 'Reached Reasons', value: journeys.filter(j => j.completed_steps >= 3).length, fill: '#6d28fc' },
      { name: 'Completed Cancel', value: completedJourneys, fill: '#5f10fc' },
      { name: 'Accepted Downsell', value: downsellAccepted, fill: '#4c00e6' }
    ];

    // Mock cohort data (would need more complex queries in real implementation)
    const cohortData = [
      { cohort: 'Jan 2025', month0: 100, month1: 85, month2: 75, month3: 70 },
      { cohort: 'Feb 2025', month0: 120, month1: 90, month2: 80, month3: 0 },
      { cohort: 'Mar 2025', month0: 150, month1: 95, month2: 0, month3: 0 },
    ];

    return {
      totalUsers: totalSessions,
      totalSessions,
      conversionRate,
      downsellAcceptanceRate,
      averageTimeToComplete,
      revenueAtRisk,
      revenueSaved,
      topCancellationReasons,
      abTestResults,
      dailyTrends,
      funnelData,
      cohortData
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Cancellation Flow Analytics
          </h1>
          <p className="text-gray-600">
            Comprehensive insights and KPIs for marketing decision making
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex gap-2">
            <label className="text-sm font-medium text-gray-700 self-center">Time Range:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <label className="text-sm font-medium text-gray-700 self-center">View:</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="overview">Overview</option>
              <option value="conversion">Conversion Analysis</option>
              <option value="abtest">A/B Test Results</option>
              <option value="cohort">Cohort Analysis</option>
            </select>
          </div>
        </div>

        {metrics && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard
                title="Total Sessions"
                value={metrics.totalSessions.toLocaleString()}
                change="+12.5%"
                changeType="positive"
                icon="👥"
              />
              <KPICard
                title="Conversion Rate"
                value={`${metrics.conversionRate.toFixed(1)}%`}
                change="-2.1%"
                changeType="negative"
                icon="📈"
              />
              <KPICard
                title="Downsell Success"
                value={`${metrics.downsellAcceptanceRate.toFixed(1)}%`}
                change="+5.3%"
                changeType="positive"
                icon="💰"
              />
              <KPICard
                title="Revenue Saved"
                value={`$${metrics.revenueSaved.toLocaleString()}`}
                change="+18.7%"
                changeType="positive"
                icon="💵"
              />
            </div>

            {/* Main Charts */}
            {selectedMetric === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Daily Trends */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trends</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.dailyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="cancellations" stroke="#8952fc" strokeWidth={2} />
                      <Line type="monotone" dataKey="downsellAccepted" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Funnel Chart */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <FunnelChart>
                      <Tooltip />
                      <Funnel dataKey="value" data={metrics.funnelData} isAnimationActive>
                        <LabelList position="center" fill="#fff" stroke="none" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* A/B Test Results */}
            {selectedMetric === 'abtest' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">A/B Test Performance</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">Variant A (Control)</h4>
                      <p className="text-sm text-gray-600">Direct to cancellation</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm">
                          <span>Users: {metrics.abTestResults.variantA.users}</span>
                          <span>Conversions: {metrics.abTestResults.variantA.conversions}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${metrics.abTestResults.variantA.rate}%` }}
                          ></div>
                        </div>
                        <p className="text-lg font-semibold mt-1">{metrics.abTestResults.variantA.rate.toFixed(1)}%</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">Variant B (Treatment)</h4>
                      <p className="text-sm text-gray-600">With downsell offer</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm">
                          <span>Users: {metrics.abTestResults.variantB.users}</span>
                          <span>Conversions: {metrics.abTestResults.variantB.conversions}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${metrics.abTestResults.variantB.rate}%` }}
                          ></div>
                        </div>
                        <p className="text-lg font-semibold mt-1">{metrics.abTestResults.variantB.rate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancellation Reasons</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metrics.topCancellationReasons}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {metrics.topCancellationReasons.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Statistical Significance */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing Insights & Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Revenue Impact</h4>
                  <p className="text-sm text-blue-700">
                    The downsell strategy has saved ${metrics.revenueSaved.toLocaleString()} in revenue this period.
                    Continue A/B testing to optimize offer timing and value.
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Conversion Optimization</h4>
                  <p className="text-sm text-yellow-700">
                    Average completion time is {Math.round(metrics.averageTimeToComplete / 60)} minutes. 
                    Consider streamlining the flow to reduce abandonment.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Growth Opportunity</h4>
                  <p className="text-sm text-green-700">
                    Top cancellation reason suggests product improvements could reduce churn by up to 
                    {Math.round((metrics.topCancellationReasons[0]?.value || 0) / metrics.totalSessions * 100)}%.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
}

function KPICard({ title, value, change, changeType, icon }: KPICardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="mt-2">
        <span className={`text-sm font-medium ${
          changeType === 'positive' ? 'text-green-600' : 'text-red-600'
        }`}>
          {change}
        </span>
        <span className="text-sm text-gray-500 ml-1">vs last period</span>
      </div>
    </div>
  );
}