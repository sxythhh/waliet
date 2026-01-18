import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Types - flexible to handle schema variations
export interface Campaign {
  id: string;
  title: string;
  description: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  banner_url: string | null;
  status: string;
  rpm_rate: number | null;
  allowed_platforms: string[];
  requirements: string | null;
  guidelines: string | null;
  hashtags: string[] | null;
  budget_total: number | null;
  budget_used: number | null;
  discord_invite_url: string | null;
  created_at: string;
}

export interface CreatorStats {
  total_views: number;
  total_earnings: number;
  videos_submitted: number;
  percentile: number | null;
}

export interface Member {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  total_views: number;
}

export interface VideoSubmission {
  id: string;
  video_url: string;
  video_id: string | null;
  platform: string;
  status: string;
  views: number | null;
  payout_amount: number | null;
  created_at: string;
  thumbnail_url: string | null;
}

export interface TrainingModule {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  required: boolean;
  order_index: number;
}

export interface CampaignAsset {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export interface EarningTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  status: string;
}

// Hook to fetch all campaign detail data
export function useCampaignDetail(campaignId: string | null) {
  const { user } = useAuth();

  // Fetch campaign details
  const campaignQuery = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async (): Promise<Campaign | null> => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      if (error) throw error;

      // Map to Campaign type with defaults for optional fields
      // Use 'any' to handle schema variations across environments
      const d = data as any;
      return {
        id: d.id,
        title: d.title || '',
        description: d.description,
        brand_name: d.brand_name || '',
        brand_logo_url: d.brand_logo_url,
        banner_url: d.banner_url,
        status: d.status || 'active',
        rpm_rate: d.rpm_rate,
        allowed_platforms: d.allowed_platforms || d.platforms_allowed || ['tiktok'],
        requirements: d.requirements,
        guidelines: d.guidelines,
        hashtags: d.hashtags,
        budget_total: d.budget_total ?? d.budget ?? null,
        budget_used: d.budget_used ?? null,
        discord_invite_url: d.discord_invite_url ?? d.discord_url ?? null,
        created_at: d.created_at || new Date().toISOString(),
      };
    },
    enabled: !!campaignId,
  });

  // Fetch creator stats for this campaign
  const statsQuery = useQuery({
    queryKey: ['creator-campaign-stats', campaignId, user?.id],
    queryFn: async (): Promise<CreatorStats> => {
      if (!user?.id || !campaignId) {
        return { total_views: 0, total_earnings: 0, videos_submitted: 0, percentile: null };
      }

      const { data: submissions, error } = await supabase
        .from('video_submissions')
        .select('views, payout_amount, status')
        .eq('source_id', campaignId)
        .eq('source_type', 'campaign')
        .eq('creator_id', user.id);

      if (error) throw error;

      const stats = (submissions || []).reduce(
        (acc, s) => ({
          total_views: acc.total_views + ((s as any).views || 0),
          total_earnings: acc.total_earnings + ((s as any).payout_amount || 0),
          videos_submitted: acc.videos_submitted + 1,
        }),
        { total_views: 0, total_earnings: 0, videos_submitted: 0 }
      );

      return { ...stats, percentile: null };
    },
    enabled: !!user?.id && !!campaignId,
  });

  // Fetch members (leaderboard)
  const membersQuery = useQuery({
    queryKey: ['campaign-members', campaignId],
    queryFn: async (): Promise<Member[]> => {
      if (!campaignId) return [];

      // Get approved submissions
      const { data: submissions, error: subError } = await supabase
        .from('campaign_submissions')
        .select('creator_id')
        .eq('campaign_id', campaignId)
        .eq('status', 'approved')
        .limit(50);

      if (subError) throw subError;

      const creatorIds = [...new Set((submissions || []).map((s: any) => s.creator_id))];
      if (creatorIds.length === 0) return [];

      // Get profiles
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', creatorIds);

      if (profError) throw profError;

      // Get view counts for each creator
      const membersWithStats = await Promise.all(
        (profiles || []).map(async (profile: any) => {
          const { data: videoStats } = await supabase
            .from('video_submissions')
            .select('views')
            .eq('source_id', campaignId)
            .eq('source_type', 'campaign')
            .eq('creator_id', profile.id);

          const totalViews = (videoStats || []).reduce((sum: number, v: any) => sum + (v.views || 0), 0);
          return { ...profile, total_views: totalViews };
        })
      );

      // Sort by views
      return membersWithStats.sort((a, b) => b.total_views - a.total_views);
    },
    enabled: !!campaignId,
  });

  // Fetch user's video submissions
  const submissionsQuery = useQuery({
    queryKey: ['campaign-submissions', campaignId, user?.id],
    queryFn: async (): Promise<VideoSubmission[]> => {
      if (!user?.id || !campaignId) return [];

      const { data, error } = await supabase
        .from('video_submissions')
        .select('*')
        .eq('source_id', campaignId)
        .eq('source_type', 'campaign')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((s: any) => ({
        id: s.id,
        video_url: s.video_url || '',
        video_id: s.video_id || null,
        platform: s.platform || 'tiktok',
        status: s.status || 'pending',
        views: s.views,
        payout_amount: s.payout_amount,
        created_at: s.created_at || new Date().toISOString(),
        thumbnail_url: s.thumbnail_url || null,
      }));
    },
    enabled: !!user?.id && !!campaignId,
  });

  // Fetch training modules (may not exist in all schemas)
  const trainingQuery = useQuery({
    queryKey: ['campaign-training', campaignId],
    queryFn: async (): Promise<TrainingModule[]> => {
      if (!campaignId) return [];

      try {
        // Try to fetch from blueprint_modules table
        const { data, error } = await (supabase as any)
          .from('blueprint_modules')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('order_index', { ascending: true });

        if (error) {
          console.warn('blueprint_modules table not found:', error.message);
          return [];
        }

        return (data || []).map((m: any) => ({
          id: m.id,
          title: m.title || '',
          content: m.content || null,
          video_url: m.video_url || null,
          required: m.required ?? false,
          order_index: m.order_index ?? 0,
        }));
      } catch {
        return [];
      }
    },
    enabled: !!campaignId,
  });

  // Fetch campaign assets (may not exist in all schemas)
  const assetsQuery = useQuery({
    queryKey: ['campaign-assets', campaignId],
    queryFn: async (): Promise<CampaignAsset[]> => {
      if (!campaignId) return [];

      try {
        const { data, error } = await (supabase as any)
          .from('campaign_assets')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('campaign_assets table not found:', error.message);
          return [];
        }

        return (data || []).map((a: any) => ({
          id: a.id,
          name: a.name || 'Untitled',
          file_url: a.file_url || '',
          file_type: a.file_type || 'unknown',
          created_at: a.created_at || new Date().toISOString(),
        }));
      } catch {
        return [];
      }
    },
    enabled: !!campaignId,
  });

  // Fetch earnings transactions
  const earningsQuery = useQuery({
    queryKey: ['campaign-earnings', campaignId, user?.id],
    queryFn: async (): Promise<EarningTransaction[]> => {
      if (!user?.id || !campaignId) return [];

      // Get payouts from video submissions for this campaign
      const { data: submissions, error } = await supabase
        .from('video_submissions')
        .select('id, payout_amount, status, created_at, video_url')
        .eq('source_id', campaignId)
        .eq('source_type', 'campaign')
        .eq('creator_id', user.id)
        .not('payout_amount', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (submissions || []).map((s: any) => ({
        id: s.id,
        amount: s.payout_amount || 0,
        type: 'video_payout',
        description: 'Video submission payout',
        created_at: s.created_at || new Date().toISOString(),
        status: s.status === 'paid' ? 'completed' : 'pending',
      }));
    },
    enabled: !!user?.id && !!campaignId,
  });

  // Refetch all data
  const refetchAll = async () => {
    await Promise.all([
      campaignQuery.refetch(),
      statsQuery.refetch(),
      membersQuery.refetch(),
      submissionsQuery.refetch(),
      trainingQuery.refetch(),
      assetsQuery.refetch(),
      earningsQuery.refetch(),
    ]);
  };

  return {
    // Campaign
    campaign: campaignQuery.data,
    isLoadingCampaign: campaignQuery.isLoading,
    campaignError: campaignQuery.error,

    // Stats
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,

    // Members
    members: membersQuery.data || [],
    isLoadingMembers: membersQuery.isLoading,

    // Submissions
    submissions: submissionsQuery.data || [],
    isLoadingSubmissions: submissionsQuery.isLoading,

    // Training
    trainingModules: trainingQuery.data || [],
    isLoadingTraining: trainingQuery.isLoading,

    // Assets
    assets: assetsQuery.data || [],
    isLoadingAssets: assetsQuery.isLoading,

    // Earnings
    earnings: earningsQuery.data || [],
    isLoadingEarnings: earningsQuery.isLoading,

    // Actions
    refetchAll,

    // Overall loading state
    isLoading:
      campaignQuery.isLoading ||
      statsQuery.isLoading ||
      membersQuery.isLoading,
  };
}

// Hook to fetch a single training module
export function useTrainingModule(moduleId: string | null) {
  return useQuery({
    queryKey: ['training-module', moduleId],
    queryFn: async (): Promise<TrainingModule | null> => {
      if (!moduleId) return null;

      try {
        const { data, error } = await (supabase as any)
          .from('blueprint_modules')
          .select('*')
          .eq('id', moduleId)
          .single();

        if (error) {
          console.warn('Error fetching training module:', error.message);
          return null;
        }

        return {
          id: data.id,
          title: data.title || '',
          content: data.content || null,
          video_url: data.video_url || null,
          required: data.required ?? false,
          order_index: data.order_index ?? 0,
        };
      } catch {
        return null;
      }
    },
    enabled: !!moduleId,
  });
}
