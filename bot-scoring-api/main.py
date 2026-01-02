"""
Bot Scoring API - Anomaly detection for video submissions
Uses PyOD ensemble methods to detect fraudulent/bot engagement patterns
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import numpy as np
from datetime import datetime, timezone

# PyOD models
from pyod.models.iforest import IForest
from pyod.models.lof import LOF
from pyod.models.ecod import ECOD
from pyod.models.combination import average, maximization

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
    account_age_days: int

    # Historical features
    creator_previous_submissions: int = 0
    creator_previous_flags: int = 0
    creator_trust_score: float = 100.0

    # Campaign context
    campaign_avg_engagement_rate: Optional[float] = None
    campaign_avg_views: Optional[float] = None
    platform: str  # tiktok, instagram, youtube


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
    Returns array of 12 features.
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

    return np.array([
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
    ])


def detect_rule_based_flags(features: VideoFeatures) -> List[str]:
    """
    Rule-based checks that complement ML scoring.
    Returns list of human-readable flags.
    """
    flags = []
    views = max(features.views, 1)

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

    return flags


def calculate_bot_score(
    feature_vectors: np.ndarray,
    features_list: List[VideoFeatures]
) -> List[SubmissionScore]:
    """
    Calculate bot scores using PyOD ensemble methods.
    Uses combination of Isolation Forest, LOF, and ECOD.
    """
    n_samples = len(feature_vectors)

    if n_samples == 0:
        return []

    # For single samples, we can't train models - use rule-based scoring
    if n_samples < 5:
        scores = []
        for i, features in enumerate(features_list):
            rule_flags = detect_rule_based_flags(features)

            # Base score from rules
            base_score = len(rule_flags) * 15  # Each flag adds 15 points

            # Adjust based on specific high-risk flags
            if "repeat_fraud_history" in rule_flags:
                base_score += 25
            if "extremely_low_engagement" in rule_flags:
                base_score += 20
            if "high_velocity_unverified" in rule_flags:
                base_score += 15

            # Cap at 100
            bot_score = min(base_score, 100.0)

            scores.append(SubmissionScore(
                bot_score=bot_score,
                confidence=0.5,  # Lower confidence for rule-based only
                flags=rule_flags,
                feature_contributions={"rule_based": True}
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

            # Boost ML score based on rule flags
            ml_score = normalized_scores[i]
            flag_boost = len(rule_flags) * 5  # Each flag adds 5 points
            final_score = min(ml_score + flag_boost, 100.0)

            # Calculate feature contributions
            feature_names = [
                "like_ratio", "comment_ratio", "share_ratio", "bookmark_ratio",
                "engagement_rate", "view_velocity", "total_views", "submission_delay",
                "trust_score", "account_age", "fraud_history", "campaign_deviation"
            ]

            # Get feature importances (simplified - based on deviation from mean)
            mean_features = feature_vectors.mean(axis=0)
            deviations = np.abs(feature_vectors[i] - mean_features)
            top_contributors = np.argsort(deviations)[-3:][::-1]  # Top 3

            contributions = {
                feature_names[idx]: float(deviations[idx])
                for idx in top_contributors
            }

            scores.append(SubmissionScore(
                bot_score=float(final_score),
                confidence=0.8,  # Higher confidence with ML
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
