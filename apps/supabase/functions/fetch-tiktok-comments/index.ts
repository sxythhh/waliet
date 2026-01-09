const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TikTokCommentsRequest {
  videoId: string;
  cursor?: number;
  count?: number;
}

interface ProcessedComment {
  id: string;
  text: string;
  likes: number;
  authorUsername: string;
  authorNickname: string;
  createTime: number;
  replyCount: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, cursor = 0, count = 50 }: TikTokCommentsRequest = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching comments for video:', videoId);

    const apiUrl = `https://tiktok-api23.p.rapidapi.com/api/post/comments?videoId=${videoId}&count=${count}&cursor=${cursor}`;

    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    });

    if (!apiResponse.ok) {
      console.error('TikTok API error:', apiResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch comments from TikTok' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await apiResponse.json();
    const comments = data.comments || [];

    // Transform to consistent format
    const processedComments: ProcessedComment[] = comments.map((c: any) => ({
      id: c.cid,
      text: c.text || '',
      likes: c.digg_count || 0,
      authorUsername: c.user?.unique_id || '',
      authorNickname: c.user?.nickname || '',
      createTime: c.create_time,
      replyCount: c.reply_comment_total || 0,
    }));

    // Quick bot analysis (server-side)
    const commentTexts = processedComments.map(c => c.text);
    const analysis = analyzeComments(commentTexts);

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        total: processedComments.length,
        cursor: data.cursor || cursor + count,
        hasMore: data.has_more === 1,
        comments: processedComments,
        analysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in fetch-tiktok-comments:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Comment Analysis (ported from Python bot-scoring-api)
// ============================================================================

const GENERIC_BOT_PATTERNS = [
  /^nice\s*[!.]*$/i,
  /^cool\s*[!.]*$/i,
  /^amazing\s*[!.]*$/i,
  /^great\s*[!.]*$/i,
  /^love\s*(it|this)?\s*[!.]*$/i,
  /^wow\s*[!.]*$/i,
  /^fire\s*[!.]*$/i,
  /^beautiful\s*[!.]*$/i,
  /^awesome\s*[!.]*$/i,
  /^perfect\s*[!.]*$/i,
  /^follow\s*(me|back)/i,
  /^check\s*(out\s*)?(my|profile)/i,
  /^dm\s*(me|for)/i,
  /^link\s*in\s*bio/i,
  /^f4f$/i,
  /^l4l$/i,
  /^follow\s*for\s*follow/i,
  /^like\s*for\s*like/i,
  /^[\u{1F525}\u{1F4AF}\u{2764}\u{FE0F}\u{1F44F}\u{1F44D}\u{1F60D}\u{1F64C}]+$/u,  // Emoji-only
  /^.{1,3}$/,  // Very short (1-3 chars)
];

function analyzeComments(comments: string[]): {
  totalComments: number;
  avgLength: number;
  genericRatio: number;
  duplicateRatio: number;
  shortCommentRatio: number;
  botPatternScore: number;
  verdict: string;
} {
  if (comments.length === 0) {
    return {
      totalComments: 0,
      avgLength: 0,
      genericRatio: 0,
      duplicateRatio: 0,
      shortCommentRatio: 0,
      botPatternScore: 0,
      verdict: 'no_data',
    };
  }

  const total = comments.length;
  const lengths = comments.map(c => c.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / total;

  // Generic bot comment detection
  let genericCount = 0;
  for (const comment of comments) {
    const trimmed = comment.trim().toLowerCase();
    for (const pattern of GENERIC_BOT_PATTERNS) {
      if (pattern.test(trimmed)) {
        genericCount++;
        break;
      }
    }
  }
  const genericRatio = genericCount / total;

  // Duplicate detection
  const commentCounts = new Map<string, number>();
  for (const c of comments) {
    const key = c.toLowerCase().trim();
    commentCounts.set(key, (commentCounts.get(key) || 0) + 1);
  }
  let duplicates = 0;
  for (const count of commentCounts.values()) {
    if (count > 1) duplicates += count - 1;
  }
  const duplicateRatio = duplicates / total;

  // Short comment ratio
  const shortComments = comments.filter(c => c.trim().length < 5).length;
  const shortCommentRatio = shortComments / total;

  // Combined bot score
  const botPatternScore = Math.min(100,
    genericRatio * 40 +
    duplicateRatio * 30 +
    shortCommentRatio * 20
  );

  // Verdict
  let verdict: string;
  if (botPatternScore < 15) verdict = 'organic';
  else if (botPatternScore < 30) verdict = 'mostly_organic';
  else if (botPatternScore < 50) verdict = 'mixed';
  else if (botPatternScore < 70) verdict = 'suspicious';
  else verdict = 'likely_fake';

  return {
    totalComments: total,
    avgLength: Math.round(avgLength * 10) / 10,
    genericRatio: Math.round(genericRatio * 1000) / 1000,
    duplicateRatio: Math.round(duplicateRatio * 1000) / 1000,
    shortCommentRatio: Math.round(shortCommentRatio * 1000) / 1000,
    botPatternScore: Math.round(botPatternScore * 10) / 10,
    verdict,
  };
}
