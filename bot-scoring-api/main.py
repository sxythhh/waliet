"""
Bot Scoring API - Anomaly detection for video submissions
Uses PyOD ensemble methods to detect fraudulent/bot engagement patterns

Enhanced for TikTok with platform-specific features and comment analysis.
Inspired by: github.com/gv-1280/DETECTION-OF-FAKE-ENGAGEMENTS-ON-INSTAGRAM-USING-MACHINE-LEARNING
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import numpy as np
import re
from datetime import datetime, timezone
from collections import Counter

# PyOD models
from pyod.models.iforest import IForest
from pyod.models.lof import LOF
from pyod.models.ecod import ECOD
from pyod.models.combination import average, maximization


# ============================================================================
# COMMENT ANALYSIS (No training data required - pattern-based)
# ============================================================================

# Generic bot comments commonly seen on TikTok/Instagram
GENERIC_BOT_COMMENTS = [
    r"^nice\s*[!.]*$",
    r"^cool\s*[!.]*$",
    r"^amazing\s*[!.]*$",
    r"^great\s*[!.]*$",
    r"^love\s*(it|this)?\s*[!.]*$",
    r"^wow\s*[!.]*$",
    r"^fire\s*[!.]*$",
    r"^beautiful\s*[!.]*$",
    r"^awesome\s*[!.]*$",
    r"^perfect\s*[!.]*$",
    r"^follow\s*(me|back)",
    r"^check\s*(out\s*)?(my|profile)",
    r"^dm\s*(me|for)",
    r"^link\s*in\s*bio",
    r"^f4f",
    r"^l4l",
    r"^follow\s*for\s*follow",
    r"^like\s*for\s*like",
    r"^[🔥💯❤️👏👍😍🙌]+$",  # Emoji-only comments
    r"^.{1,3}$",  # Very short comments (1-3 chars)
]

COMPILED_BOT_PATTERNS = [re.compile(p, re.IGNORECASE) for p in GENERIC_BOT_COMMENTS]


def analyze_comments(comments: List[str]) -> dict:
    """
    Analyze a list of comments for bot-like patterns.
    Returns metrics that don't require ML training.
    """
    if not comments:
        return {
            "total_comments": 0,
            "avg_length": 0,
            "emoji_ratio": 0,
            "generic_ratio": 0,
            "duplicate_ratio": 0,
            "short_comment_ratio": 0,
            "bot_pattern_score": 0,
        }

    total = len(comments)

    # Average comment length
    lengths = [len(c) for c in comments]
    avg_length = sum(lengths) / total

    # Emoji analysis
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+", flags=re.UNICODE
    )

    emoji_counts = [len(emoji_pattern.findall(c)) for c in comments]
    total_chars = sum(lengths) or 1
    total_emojis = sum(emoji_counts)
    emoji_ratio = total_emojis / total_chars

    # Generic/bot comment detection
    generic_count = 0
    for comment in comments:
        comment_lower = comment.strip().lower()
        for pattern in COMPILED_BOT_PATTERNS:
            if pattern.match(comment_lower):
                generic_count += 1
                break
    generic_ratio = generic_count / total

    # Duplicate detection
    comment_counts = Counter(c.lower().strip() for c in comments)
    duplicates = sum(count - 1 for count in comment_counts.values() if count > 1)
    duplicate_ratio = duplicates / total

    # Short comment ratio (< 5 chars)
    short_comments = sum(1 for c in comments if len(c.strip()) < 5)
    short_comment_ratio = short_comments / total

    # Combined bot pattern score (0-100)
    bot_pattern_score = min(100, (
        generic_ratio * 40 +
        duplicate_ratio * 30 +
        short_comment_ratio * 20 +
        (1 if emoji_ratio > 0.5 else 0) * 10
    ))

    return {
        "total_comments": total,
        "avg_length": avg_length,
        "emoji_ratio": emoji_ratio,
        "generic_ratio": generic_ratio,
        "duplicate_ratio": duplicate_ratio,
        "short_comment_ratio": short_comment_ratio,
        "bot_pattern_score": bot_pattern_score,
    }

app = FastAPI(
    title="Bot Scoring API",
    description="Anomaly detection for video submission fraud",
    version="1.0.0"
)

# CORS configuration - restrict to production domains
ALLOWED_ORIGINS = [
    "https://virality.so",
    "https://www.virality.so",
    "https://app.virality.so",
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative dev port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class CommentData(BaseModel):
    """Optional comment data for deeper analysis"""
    texts: List[str] = []  # Raw comment texts for pattern analysis


class VideoFeatures(BaseModel):
    """Features extracted from a video submission"""
    # Core engagement metrics
    views: int
    likes: int
    comments: int
    shares: int
    bookmarks: Optional[int] = 0

    # Temporal features
    hours_since_upload: float
    hours_since_submission: float

    # Author/account features
    author_verified: bool = False
    author_follower_count: Optional[int] = None
    author_following_count: Optional[int] = None  # NEW: for follower ratio
    account_age_days: int

    # Historical features
    creator_previous_submissions: int = 0
    creator_previous_flags: int = 0
    creator_trust_score: float = 100.0

    # Campaign context
    campaign_avg_engagement_rate: Optional[float] = None
    campaign_avg_views: Optional[float] = None
    platform: str  # tiktok, instagram, youtube

    # =========================================================================
    # TIKTOK-SPECIFIC FEATURES
    # =========================================================================

    # TikTok engagement metrics
    duets: Optional[int] = None  # Number of duets (TikTok unique)
    stitches: Optional[int] = None  # Number of stitches (TikTok unique)

    # Sound/audio features
    sound_is_original: Optional[bool] = None  # Original vs trending sound
    sound_is_trending: Optional[bool] = None  # Is sound currently viral

    # Video metadata
    video_duration_seconds: Optional[float] = None
    avg_watch_time_seconds: Optional[float] = None  # If available

    # Hashtag analysis
    hashtag_count: Optional[int] = None
    uses_trending_hashtag: Optional[bool] = None
    uses_challenge_hashtag: Optional[bool] = None

    # Posting behavior
    author_total_videos: Optional[int] = None
    author_videos_last_30_days: Optional[int] = None

    # Comment data for pattern analysis (optional)
    comment_data: Optional[CommentData] = None


class ScoringRequest(BaseModel):
    """Request to score one or more submissions"""
    submissions: List[VideoFeatures]


class SubmissionScore(BaseModel):
    """Score result for a single submission"""
    bot_score: float  # 0-100 (100 = definitely bot)
    confidence: float  # 0-1 confidence in the score
    flags: List[str]  # Human-readable flags
    feature_contributions: dict  # Which features contributed most


class ScoringResponse(BaseModel):
    """Response with scores for all submissions"""
    scores: List[SubmissionScore]


def extract_feature_vector(features: VideoFeatures) -> np.ndarray:
    """
    Convert video features to a normalized feature vector for ML models.
    Returns array of 20 features (expanded for TikTok).
    """
    # Engagement ratios (handle division by zero)
    views = max(features.views, 1)
    like_ratio = features.likes / views
    comment_ratio = features.comments / views
    share_ratio = features.shares / views
    bookmark_ratio = (features.bookmarks or 0) / views

    # Combined engagement rate
    total_engagement_rate = (features.likes + features.comments + features.shares) / views

    # View velocity (views per hour since upload)
    hours_since_upload = max(features.hours_since_upload, 0.1)
    view_velocity = features.views / hours_since_upload

    # Normalize velocities using log scale (handles viral videos)
    log_view_velocity = np.log1p(view_velocity)
    log_views = np.log1p(features.views)

    # Time gap ratio (how long after upload was it submitted)
    time_gap_ratio = features.hours_since_submission / max(features.hours_since_upload, 0.1)

    # Account trust signals
    trust_score_normalized = features.creator_trust_score / 100.0
    account_age_score = min(features.account_age_days / 365, 1.0)  # Cap at 1 year

    # Historical fraud indicator
    fraud_history_score = min(features.creator_previous_flags / 5, 1.0)  # Cap at 5 flags

    # Follower engagement ratio (if available)
    if features.author_follower_count and features.author_follower_count > 0:
        follower_engagement = features.views / features.author_follower_count
    else:
        follower_engagement = 1.0  # Neutral if unknown

    # Campaign deviation (if campaign averages available)
    if features.campaign_avg_engagement_rate and features.campaign_avg_engagement_rate > 0:
        engagement_deviation = abs(total_engagement_rate - features.campaign_avg_engagement_rate) / features.campaign_avg_engagement_rate
    else:
        engagement_deviation = 0.0

    # =========================================================================
    # TIKTOK-SPECIFIC FEATURES
    # =========================================================================

    # Follower to following ratio (bot accounts often have skewed ratios)
    if features.author_follower_count and features.author_following_count:
        if features.author_following_count > 0:
            follower_following_ratio = features.author_follower_count / features.author_following_count
        else:
            follower_following_ratio = features.author_follower_count  # Following 0 is suspicious
    else:
        follower_following_ratio = 1.0  # Neutral if unknown

    # Normalize to 0-1 range (ratio > 10 is very high, cap it)
    follower_following_score = min(follower_following_ratio / 10, 1.0)

    # Duet/Stitch engagement (TikTok-specific organic signals)
    duet_ratio = (features.duets or 0) / views if views > 0 else 0
    stitch_ratio = (features.stitches or 0) / views if views > 0 else 0

    # Watch time completion (if available)
    if features.video_duration_seconds and features.avg_watch_time_seconds:
        watch_completion = features.avg_watch_time_seconds / features.video_duration_seconds
        watch_completion = min(watch_completion, 1.0)  # Cap at 100%
    else:
        watch_completion = 0.5  # Neutral if unknown

    # Posting frequency score (videos per month)
    if features.author_videos_last_30_days is not None:
        # 1-2 videos/day is normal, more is suspicious for engagement farming
        posting_frequency = features.author_videos_last_30_days / 30
        posting_frequency_score = min(posting_frequency / 5, 1.0)  # Cap at 5/day
    else:
        posting_frequency_score = 0.5  # Neutral

    # Hashtag score (excessive hashtags can indicate spam)
    if features.hashtag_count is not None:
        # 3-5 hashtags is normal, 10+ is excessive
        hashtag_score = min(features.hashtag_count / 15, 1.0)
    else:
        hashtag_score = 0.3  # Neutral-low

    # Sound/trend signals (organic content often uses trending sounds)
    sound_signal = 0.5  # Neutral default
    if features.sound_is_trending:
        sound_signal = 0.3  # Trending sound = more likely organic
    elif features.sound_is_original:
        sound_signal = 0.4  # Original sound = slightly more likely organic

    # Comment quality score (from pattern analysis)
    comment_bot_score = 0.0
    if features.comment_data and features.comment_data.texts:
        comment_analysis = analyze_comments(features.comment_data.texts)
        comment_bot_score = comment_analysis["bot_pattern_score"] / 100.0

    return np.array([
        # Original 12 features
        like_ratio,              # 0: Likes per view
        comment_ratio,           # 1: Comments per view
        share_ratio,             # 2: Shares per view
        bookmark_ratio,          # 3: Bookmarks per view
        total_engagement_rate,   # 4: Total engagement rate
        log_view_velocity,       # 5: Log of views per hour
        log_views,               # 6: Log of total views
        time_gap_ratio,          # 7: Submission delay ratio
        trust_score_normalized,  # 8: Creator trust score
        account_age_score,       # 9: Account age score
        fraud_history_score,     # 10: Previous fraud flags
        engagement_deviation,    # 11: Deviation from campaign average
        # New TikTok features (8 additional)
        follower_following_score,  # 12: Follower/following ratio
        duet_ratio,                # 13: Duets per view
        stitch_ratio,              # 14: Stitches per view
        watch_completion,          # 15: Watch time completion rate
        posting_frequency_score,   # 16: Posting frequency
        hashtag_score,             # 17: Hashtag usage
        sound_signal,              # 18: Sound/trend signal
        comment_bot_score,         # 19: Comment bot pattern score
    ])


def detect_rule_based_flags(features: VideoFeatures) -> List[str]:
    """
    Rule-based checks that complement ML scoring.
    Returns list of human-readable flags.
    Includes TikTok-specific patterns.
    """
    flags = []
    views = max(features.views, 1)

    # =========================================================================
    # UNIVERSAL FLAGS (all platforms)
    # =========================================================================

    # Extremely low engagement (potential view botting)
    engagement_rate = (features.likes + features.comments) / views
    if features.views > 1000 and engagement_rate < 0.001:
        flags.append("extremely_low_engagement")

    # Suspiciously perfect ratios (bot fingerprint)
    if features.views > 100:
        like_ratio = features.likes / views
        if 0.09 < like_ratio < 0.11:  # Exactly ~10% likes
            flags.append("suspicious_like_ratio")

    # Very high velocity for non-verified accounts
    hours = max(features.hours_since_upload, 0.1)
    velocity = features.views / hours
    if velocity > 10000 and not features.author_verified:
        flags.append("high_velocity_unverified")

    # New account with high views
    if features.account_age_days < 30 and features.views > 50000:
        flags.append("new_account_viral")

    # Previous fraud history
    if features.creator_previous_flags >= 2:
        flags.append("repeat_fraud_history")

    # Low trust score
    if features.creator_trust_score < 50:
        flags.append("low_trust_score")

    # Zero comments with high views (unnatural)
    if features.views > 5000 and features.comments == 0:
        flags.append("zero_comments_high_views")

    # Engagement significantly above campaign average
    if features.campaign_avg_engagement_rate:
        total_rate = (features.likes + features.comments + features.shares) / views
        if total_rate > features.campaign_avg_engagement_rate * 5:
            flags.append("engagement_far_above_average")

    # =========================================================================
    # TIKTOK-SPECIFIC FLAGS
    # =========================================================================

    if features.platform == "tiktok":
        # Follower/Following ratio anomalies (common bot pattern)
        if features.author_follower_count and features.author_following_count:
            if features.author_following_count > 0:
                ff_ratio = features.author_follower_count / features.author_following_count

                # Very low ratio with high views = likely bought followers/views
                if ff_ratio < 0.1 and features.views > 10000:
                    flags.append("tiktok_low_follower_ratio_high_views")

                # Following way more than followers (engagement pod behavior)
                if features.author_following_count > 5000 and ff_ratio < 0.5:
                    flags.append("tiktok_engagement_pod_pattern")

            # Following exactly 0 with followers (bot pattern)
            elif features.author_follower_count > 1000:
                flags.append("tiktok_zero_following_suspicious")

        # No duets or stitches with viral views (inorganic)
        # Real viral TikToks usually get some duets/stitches
        if features.views > 100000:
            duets = features.duets or 0
            stitches = features.stitches or 0
            if duets == 0 and stitches == 0:
                flags.append("tiktok_viral_no_engagement_actions")

        # Excessive hashtag usage (spam pattern)
        if features.hashtag_count and features.hashtag_count > 12:
            flags.append("tiktok_excessive_hashtags")

        # Very short watch time for long videos (view botting signal)
        if features.video_duration_seconds and features.avg_watch_time_seconds:
            if features.video_duration_seconds > 30:
                completion = features.avg_watch_time_seconds / features.video_duration_seconds
                if completion < 0.1 and features.views > 5000:
                    flags.append("tiktok_low_watch_completion")

        # Mass posting pattern (content farms)
        if features.author_videos_last_30_days and features.author_videos_last_30_days > 90:
            flags.append("tiktok_mass_posting")

        # Original sound but trending engagement (unusual)
        if features.sound_is_original and not features.sound_is_trending:
            if features.views > 500000 and engagement_rate < 0.01:
                flags.append("tiktok_original_sound_viral_low_engagement")

    # =========================================================================
    # COMMENT ANALYSIS FLAGS
    # =========================================================================

    if features.comment_data and features.comment_data.texts:
        comment_analysis = analyze_comments(features.comment_data.texts)

        # High generic comment ratio
        if comment_analysis["generic_ratio"] > 0.5:
            flags.append("high_generic_comments")

        # High duplicate comments
        if comment_analysis["duplicate_ratio"] > 0.3:
            flags.append("high_duplicate_comments")

        # Very short average comment length
        if comment_analysis["avg_length"] < 5 and comment_analysis["total_comments"] > 10:
            flags.append("very_short_comments")

        # High emoji-only ratio
        if comment_analysis["emoji_ratio"] > 0.7:
            flags.append("emoji_heavy_comments")

        # Overall bot comment pattern
        if comment_analysis["bot_pattern_score"] > 60:
            flags.append("bot_comment_pattern_detected")

    return flags


# Flag severity weights for scoring
FLAG_WEIGHTS = {
    # High severity (20+ points)
    "repeat_fraud_history": 25,
    "bot_comment_pattern_detected": 25,
    "extremely_low_engagement": 20,
    "tiktok_engagement_pod_pattern": 20,

    # Medium severity (15 points)
    "high_velocity_unverified": 15,
    "new_account_viral": 15,
    "tiktok_low_follower_ratio_high_views": 15,
    "tiktok_viral_no_engagement_actions": 15,
    "high_generic_comments": 15,
    "high_duplicate_comments": 15,

    # Lower severity (10 points)
    "suspicious_like_ratio": 10,
    "low_trust_score": 10,
    "zero_comments_high_views": 10,
    "engagement_far_above_average": 10,
    "tiktok_zero_following_suspicious": 10,
    "tiktok_excessive_hashtags": 10,
    "tiktok_low_watch_completion": 10,
    "tiktok_mass_posting": 10,
    "tiktok_original_sound_viral_low_engagement": 10,
    "very_short_comments": 10,
    "emoji_heavy_comments": 10,
}

DEFAULT_FLAG_WEIGHT = 8  # For any flag not in the dict


def calculate_bot_score(
    feature_vectors: np.ndarray,
    features_list: List[VideoFeatures]
) -> List[SubmissionScore]:
    """
    Calculate bot scores using PyOD ensemble methods.
    Uses combination of Isolation Forest, LOF, and ECOD.
    Enhanced with TikTok-specific features and weighted flag scoring.
    """
    n_samples = len(feature_vectors)

    if n_samples == 0:
        return []

    # For single samples, we can't train models - use rule-based scoring
    if n_samples < 5:
        scores = []
        for i, features in enumerate(features_list):
            rule_flags = detect_rule_based_flags(features)

            # Weighted score from rules
            base_score = sum(
                FLAG_WEIGHTS.get(flag, DEFAULT_FLAG_WEIGHT)
                for flag in rule_flags
            )

            # Add comment analysis score if available
            if features.comment_data and features.comment_data.texts:
                comment_analysis = analyze_comments(features.comment_data.texts)
                # Blend in comment bot score (0-100 scaled to 0-30 contribution)
                base_score += comment_analysis["bot_pattern_score"] * 0.3

            # Cap at 100
            bot_score = min(base_score, 100.0)

            # Confidence based on how much data we have
            confidence = 0.4
            if features.comment_data and len(features.comment_data.texts) > 5:
                confidence += 0.1
            if features.author_follower_count:
                confidence += 0.05
            if features.platform == "tiktok" and features.duets is not None:
                confidence += 0.05

            scores.append(SubmissionScore(
                bot_score=bot_score,
                confidence=min(confidence, 0.7),  # Cap at 0.7 for rule-based
                flags=rule_flags,
                feature_contributions={"rule_based": True, "flag_count": len(rule_flags)}
            ))
        return scores

    # For multiple samples, use PyOD ensemble
    try:
        # Initialize models with contamination estimate
        contamination = 0.1  # Assume ~10% fraud rate

        # Isolation Forest - good for high-dimensional anomalies
        iforest = IForest(contamination=contamination, random_state=42, n_estimators=100)
        iforest.fit(feature_vectors)
        iforest_scores = iforest.decision_scores_

        # Local Outlier Factor - good for density-based anomalies
        lof = LOF(contamination=contamination, n_neighbors=min(5, n_samples - 1))
        lof.fit(feature_vectors)
        lof_scores = lof.decision_scores_

        # ECOD - good for tail-based anomalies
        ecod = ECOD(contamination=contamination)
        ecod.fit(feature_vectors)
        ecod_scores = ecod.decision_scores_

        # Combine scores using average
        combined_scores = average([iforest_scores, lof_scores, ecod_scores])

        # Normalize to 0-100 range
        min_score = combined_scores.min()
        max_score = combined_scores.max()
        if max_score > min_score:
            normalized_scores = (combined_scores - min_score) / (max_score - min_score) * 100
        else:
            normalized_scores = np.zeros(n_samples)

        # Build response
        scores = []
        for i, features in enumerate(features_list):
            rule_flags = detect_rule_based_flags(features)

            # Weighted boost from rule flags
            flag_boost = sum(
                FLAG_WEIGHTS.get(flag, DEFAULT_FLAG_WEIGHT) * 0.3  # 30% of flag weight
                for flag in rule_flags
            )

            # Add comment analysis contribution
            comment_contribution = 0
            if features.comment_data and features.comment_data.texts:
                comment_analysis = analyze_comments(features.comment_data.texts)
                comment_contribution = comment_analysis["bot_pattern_score"] * 0.2

            # Combine ML score with rule-based boosts
            ml_score = normalized_scores[i]
            final_score = min(ml_score + flag_boost + comment_contribution, 100.0)

            # Calculate feature contributions
            feature_names = [
                # Original 12
                "like_ratio", "comment_ratio", "share_ratio", "bookmark_ratio",
                "engagement_rate", "view_velocity", "total_views", "submission_delay",
                "trust_score", "account_age", "fraud_history", "campaign_deviation",
                # TikTok 8
                "follower_following_ratio", "duet_ratio", "stitch_ratio",
                "watch_completion", "posting_frequency", "hashtag_usage",
                "sound_signal", "comment_bot_score"
            ]

            # Get feature importances (simplified - based on deviation from mean)
            mean_features = feature_vectors.mean(axis=0)
            deviations = np.abs(feature_vectors[i] - mean_features)
            top_contributors = np.argsort(deviations)[-5:][::-1]  # Top 5

            contributions = {
                feature_names[idx] if idx < len(feature_names) else f"feature_{idx}": float(deviations[idx])
                for idx in top_contributors
            }

            # Add ML vs rule contribution breakdown
            contributions["ml_score"] = float(ml_score)
            contributions["rule_boost"] = float(flag_boost)
            contributions["comment_boost"] = float(comment_contribution)

            # Confidence based on sample size and data quality
            base_confidence = min(0.7 + (n_samples / 100) * 0.2, 0.9)
            if features.comment_data and len(features.comment_data.texts) > 10:
                base_confidence += 0.05

            scores.append(SubmissionScore(
                bot_score=float(final_score),
                confidence=min(base_confidence, 0.95),
                flags=rule_flags,
                feature_contributions=contributions
            ))

        return scores

    except Exception as e:
        # Fallback to rule-based on error
        print(f"PyOD error, falling back to rules: {e}")
        return calculate_bot_score(feature_vectors[:0], features_list)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}


@app.post("/score", response_model=ScoringResponse)
async def score_submissions(request: ScoringRequest):
    """
    Score video submissions for bot/fraud probability.

    Returns bot_score (0-100) where:
    - 0-20: Very likely legitimate
    - 20-40: Probably legitimate
    - 40-60: Uncertain, may need review
    - 60-80: Suspicious, likely fraudulent
    - 80-100: Very likely bot/fraud
    """
    if not request.submissions:
        raise HTTPException(status_code=400, detail="No submissions provided")

    if len(request.submissions) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 submissions per request")

    # Extract feature vectors
    feature_vectors = np.array([
        extract_feature_vector(sub) for sub in request.submissions
    ])

    # Calculate scores
    scores = calculate_bot_score(feature_vectors, request.submissions)

    return ScoringResponse(scores=scores)


@app.post("/score/single", response_model=SubmissionScore)
async def score_single_submission(features: VideoFeatures):
    """
    Score a single video submission.
    Convenience endpoint that wraps the batch scoring.
    """
    response = await score_submissions(ScoringRequest(submissions=[features]))
    return response.scores[0]


# =============================================================================
# COMMENT ANALYSIS ENDPOINTS
# =============================================================================

class CommentAnalysisRequest(BaseModel):
    """Request for standalone comment analysis"""
    comments: List[str]


class CommentAnalysisResponse(BaseModel):
    """Response with comment analysis results"""
    total_comments: int
    avg_length: float
    emoji_ratio: float
    generic_ratio: float
    duplicate_ratio: float
    short_comment_ratio: float
    bot_pattern_score: float
    verdict: str
    flags: List[str]


@app.post("/analyze/comments", response_model=CommentAnalysisResponse)
async def analyze_comments_endpoint(request: CommentAnalysisRequest):
    """
    Analyze a list of comments for bot-like patterns.
    Standalone endpoint - doesn't require video metrics.

    Returns bot_pattern_score (0-100) where:
    - 0-20: Comments appear organic
    - 20-40: Mostly organic with some generic patterns
    - 40-60: Mixed signals, uncertain
    - 60-80: Suspicious patterns detected
    - 80-100: Strong bot/fake comment indicators
    """
    if not request.comments:
        raise HTTPException(status_code=400, detail="No comments provided")

    if len(request.comments) > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 comments per request")

    analysis = analyze_comments(request.comments)

    # Generate flags
    flags = []
    if analysis["generic_ratio"] > 0.5:
        flags.append("high_generic_comments")
    if analysis["generic_ratio"] > 0.3:
        flags.append("moderate_generic_comments")
    if analysis["duplicate_ratio"] > 0.3:
        flags.append("high_duplicate_comments")
    if analysis["duplicate_ratio"] > 0.15:
        flags.append("moderate_duplicates")
    if analysis["avg_length"] < 5:
        flags.append("very_short_comments")
    if analysis["emoji_ratio"] > 0.7:
        flags.append("emoji_heavy")
    if analysis["short_comment_ratio"] > 0.5:
        flags.append("many_short_comments")

    # Determine verdict
    score = analysis["bot_pattern_score"]
    if score < 20:
        verdict = "organic"
    elif score < 40:
        verdict = "mostly_organic"
    elif score < 60:
        verdict = "uncertain"
    elif score < 80:
        verdict = "suspicious"
    else:
        verdict = "likely_fake"

    return CommentAnalysisResponse(
        total_comments=analysis["total_comments"],
        avg_length=analysis["avg_length"],
        emoji_ratio=analysis["emoji_ratio"],
        generic_ratio=analysis["generic_ratio"],
        duplicate_ratio=analysis["duplicate_ratio"],
        short_comment_ratio=analysis["short_comment_ratio"],
        bot_pattern_score=analysis["bot_pattern_score"],
        verdict=verdict,
        flags=flags
    )


# =============================================================================
# TIKTOK-SPECIFIC ENDPOINT
# =============================================================================

class TikTokQuickCheckRequest(BaseModel):
    """Quick check for TikTok profiles without full submission context"""
    follower_count: int
    following_count: int
    total_likes: int  # Total likes across all videos
    video_count: int
    account_age_days: int
    avg_views_per_video: Optional[int] = None
    avg_comments_per_video: Optional[int] = None
    verified: bool = False


class TikTokQuickCheckResponse(BaseModel):
    """Quick check results"""
    authenticity_score: float  # 0-100, higher = more authentic
    risk_level: str  # low, medium, high
    flags: List[str]
    metrics: dict


@app.post("/tiktok/quick-check", response_model=TikTokQuickCheckResponse)
async def tiktok_quick_check(request: TikTokQuickCheckRequest):
    """
    Quick authenticity check for a TikTok profile.
    Useful for vetting creators before engagement.

    Returns authenticity_score (0-100) where higher = more likely authentic.
    """
    flags = []
    risk_score = 0  # Lower is better

    # Follower/Following ratio analysis
    if request.following_count > 0:
        ff_ratio = request.follower_count / request.following_count
    else:
        ff_ratio = request.follower_count if request.follower_count > 0 else 0

    # Engagement per follower
    if request.follower_count > 0:
        likes_per_follower = request.total_likes / request.follower_count
    else:
        likes_per_follower = 0

    # Videos per day (posting velocity)
    if request.account_age_days > 0:
        videos_per_day = request.video_count / request.account_age_days
    else:
        videos_per_day = request.video_count

    # === FLAG CHECKS ===

    # Following way more than followers (engagement farming)
    if request.following_count > 3000 and ff_ratio < 0.3:
        flags.append("engagement_farming_pattern")
        risk_score += 25

    # Very new account with lots of followers (bought followers)
    if request.account_age_days < 30 and request.follower_count > 10000:
        flags.append("new_account_high_followers")
        risk_score += 20

    # Low engagement relative to followers
    if request.follower_count > 1000 and likes_per_follower < 0.1:
        flags.append("low_engagement_ratio")
        risk_score += 15

    # Excessive posting (content farm)
    if videos_per_day > 5:
        flags.append("excessive_posting_rate")
        risk_score += 15

    # Zero following (often bot pattern)
    if request.following_count == 0 and request.follower_count > 500:
        flags.append("zero_following")
        risk_score += 10

    # Very high follower count but no verification
    if request.follower_count > 100000 and not request.verified:
        flags.append("high_followers_unverified")
        risk_score += 10

    # Unusual engagement patterns if we have video-level data
    if request.avg_views_per_video and request.avg_comments_per_video:
        if request.avg_views_per_video > 10000 and request.avg_comments_per_video < 5:
            flags.append("high_views_low_comments")
            risk_score += 20

    # === POSITIVE SIGNALS (reduce risk) ===

    if request.verified:
        risk_score -= 20

    if request.account_age_days > 365:
        risk_score -= 10

    if 1 < ff_ratio < 50:  # Healthy ratio
        risk_score -= 5

    if 0.1 < videos_per_day < 2:  # Normal posting rate
        risk_score -= 5

    # Clamp risk score
    risk_score = max(0, min(100, risk_score))

    # Convert to authenticity score (inverse of risk)
    authenticity_score = 100 - risk_score

    # Determine risk level
    if risk_score < 25:
        risk_level = "low"
    elif risk_score < 50:
        risk_level = "medium"
    else:
        risk_level = "high"

    return TikTokQuickCheckResponse(
        authenticity_score=authenticity_score,
        risk_level=risk_level,
        flags=flags,
        metrics={
            "follower_following_ratio": round(ff_ratio, 2),
            "likes_per_follower": round(likes_per_follower, 2),
            "videos_per_day": round(videos_per_day, 3),
            "account_age_days": request.account_age_days,
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
