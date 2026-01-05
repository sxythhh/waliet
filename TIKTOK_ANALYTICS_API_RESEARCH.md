# TikTok Video Analytics API Research

**Research Date:** January 4, 2026
**Goal:** Find automated solutions to replace manual screen recordings for pulling TikTok video analytics

---

## Executive Summary

There are four main approaches to programmatically access TikTok video analytics:

1. **Official TikTok APIs** - Highly restricted, requires approval, limited to specific use cases
2. **RapidAPI & Third-party APIs** - Various options with different pricing, reliability varies
3. **Specialized Analytics Platforms** - Feature-rich but expensive, designed for agencies/businesses
4. **Unofficial Scraping Tools** - Most flexible but comes with legal/TOS risks

**Recommendation:** For automated analytics extraction, third-party APIs (RapidAPI/Apify) or specialized platforms (Bright Data, SocialKit) offer the best balance of reliability and functionality, though all unofficial methods carry some legal risk.

---

## 1. Official TikTok APIs

### A. Research API

**What It Provides:**
- Public video data (views, likes, comments, shares)
- User profile information
- Comment data
- Hashtag and trend data

**Requirements:**
- Must be an accredited researcher from non-profit universities in U.S. or Europe
- Must submit research plans for approval
- Data must be refreshed every 15 days (stricter than YouTube's 30-day rule)
- Cannot access: TikTok-created videos, ads, some accounts (Canada, China-linked)

**Limitations:**
- Rate Limits: 1,000 requests/day, up to 100,000 records/day (100 records/request)
- Access tokens expire every 2 hours
- View/engagement counts may be significantly lower than app shows (10-day delay for accurate data)
- No access to historical data in many cases
- Geographic restrictions (videos from Canada, China-linked accounts excluded)

**Pricing:** Free for approved researchers

**Authentication:** Requires developer account, app registration, and research approval

**Reliability:** High for approved users, but data accuracy delayed up to 10 days

**Legal/TOS:** Compliant if approved, very strict usage policies

---

### B. Business API (Marketing API)

**What It Provides:**
- Ad campaign analytics
- Audience targeting data
- Performance tracking for paid content
- Campaign management metrics

**Requirements:**
- Must have TikTok Business Account
- Requires OAuth 2.0 authentication
- Minimum "Ads Management" and "Reporting" permissions required

**Limitations:**
- Only for advertising/paid content analytics
- Does NOT provide organic content analytics
- Access tokens expire every 24 hours (but can auto-refresh)
- Does NOT provide audience demographics (age, gender, location)

**Pricing:** Free but requires ad spend on platform

**Authentication:** OAuth 2.0, requires business account

**Reliability:** High for paid campaign data

**Use Case:** Not suitable for organic video analytics

---

### C. Content Posting API

**What It Provides:**
- Ability to post videos programmatically
- Basic creator info via creator_info API
- Content management capabilities

**Limitations:**
- Posting Caps: ~15 posts/day per creator account
- 6 photos per minute max
- Unaudited clients can only post in SELF_ONLY mode (private)
- Requires audit process to post publicly
- Videos must comply with max_video_post_duration_sec limits
- 2,200 character limit for post text
- Processing time: 30 seconds - 2 minutes per video

**Pricing:** Free but requires approval

**Authentication:** OAuth 2.0, app registration required

**Use Case:** Primarily for posting, not analytics extraction

**Analytics Capability:** Minimal - not designed for analytics extraction

---

### D. Display API

**What It Provides:**
- Basic profile information
- Recent or self-selected videos
- Public user feed data

**Limitations:**
- Read-only access to public data
- Cannot access private information or analytics
- Cannot upload, edit, or delete content
- No detailed engagement metrics or analytics

**Pricing:** Free

**Authentication:** OAuth 2.0, app registration required

**Use Case:** Displaying TikTok content on external platforms

**Analytics Capability:** Very limited - basic public data only

---

## 2. RapidAPI Options

### A. ScrapTik (Most Popular)

**What It Provides:**
- User profiles and statistics
- Video data (views, likes, comments, shares)
- Post engagement metrics
- Music and sound data
- Search functionality (users, videos, hashtags)
- Feeds and trends
- Comments and follower data
- Live stream data
- Advanced features: X-Argus, X-Ladon, X-Gorgon generation

**Pricing:**
- Specific tier pricing not disclosed in search results
- Alternative pricing on Apify: $0.002 per request (95% cheaper than competitors)
- Visit: https://rapidapi.com/scraptik-api-scraptik-api-default/api/scraptik/pricing

**Rate Limits:** Varies by tier

**Reliability:** Described as "most stable and always-maintained" option
- ~1M unique users, ~0.7M requests daily
- <0.001% failure rate
- 99.99% uptime
- Deployed across multiple data centers

**Authentication:** RapidAPI key only, no TikTok account needed

**Legal/TOS:** Unofficial - violates TikTok ToS

---

### B. TikTok API (by omarmhaimdat)

**What It Provides:**
- User profiles and insights
- In-depth video analytics
- Trending content data
- Search capabilities (users, videos, sounds, hashtags)
- Engagement metrics

**Pricing:** Not specified in search results
- Visit: https://rapidapi.com/omarmhaimdat/api/tiktok-api6/pricing

**Rate Limits:** Varies by tier

**Reliability:** Described as "robust and easy-to-use"

**Authentication:** RapidAPI key only

**Legal/TOS:** Unofficial - violates TikTok ToS

---

### C. TikTok Scraper7 (by tikwm)

**What It Provides:**
- Trends data
- User information
- Posts and comments
- Follower data
- Original quality videos

**Pricing:** Described as "cheap, fast, and stable"
- Specific pricing not disclosed
- Visit: https://rapidapi.com/tikwm-tikwm-default/api/tiktok-scraper7

**Rate Limits:** Varies by tier

**Reliability:** Marketed as stable

**Authentication:** RapidAPI key only

**Legal/TOS:** Unofficial - violates TikTok ToS

---

### D. General RapidAPI Pricing Structure

**Typical Tiers (2026):**
- **Free:** 500-1,000 requests/month, limited features
- **Basic:** $10-20/month, 50,000 requests
- **Pro/Enterprise:** Custom pricing, millions of requests, priority support

**Overage Pricing:** Typically $0.003 per request over cap

**Note:** Exact pricing varies significantly between API providers on RapidAPI

---

## 3. Third-Party Analytics Platforms

### A. Socialinsider

**What It Provides:**
- Views, engagement, follower growth metrics
- Historical content trends
- Top-performing content analysis
- Competitor benchmarking
- Multi-month historical data
- Advanced reporting features

**Pricing:**
- Adapt: $99/month (20 accounts, 3 months history, 1 user)
- Optimize: $149/month (30 accounts, 6 months history, 2 users)
- Predict: $239/month (40 accounts, 12 months history, 5 users)
- Alternative pricing: Starts at $82/month base plan

**Rate Limits:** Based on account limits per plan

**Reliability:** High - enterprise-grade platform
- Strong historical data capabilities
- Designed for mid-to-large businesses and agencies

**Authentication:** Requires TikTok account connection

**Best For:** Businesses needing long-term trend analysis and competitor insights

**Legal/TOS:** Likely uses official APIs where possible, may supplement with scraping

---

### B. Pentos (TikTok-Specific)

**What It Provides:**
- Competitor tracking
- Viral trend identification
- Audio/music trend analysis
- Performance tracking
- Leaderboards (top songs, users, videos, hashtags)
- Hashtag tracking

**Pricing:**
- Base: $49/month
- Trends Pro: $99/month (track specific trends, hashtags, competitor profiles)

**API Access:** Available - contact [email protected] for API pricing
- Can connect TikTok data to other tools in place of official API

**Rate Limits:** Based on tracked accounts/hashtags per plan

**Reliability:** High - specialized TikTok analytics platform
- Purpose-built for TikTok
- Strong trend analysis features

**Authentication:** Requires account setup, varies by access method

**Best For:** Marketers, talent agencies, music labels, TikTok-focused creators

**Legal/TOS:** Uses unofficial methods, ToS compliance unclear

---

### C. Exolyt

**What It Provides:**
- Audience demographics and behavior
- Engagement trends
- Sentiment analysis (AI-powered)
- Social listening capabilities
- Real-time data
- Multi-account tracking
- Influencer campaign management
- Comment analysis
- Brand/industry mention monitoring

**Pricing:**
- Basic: €0 (free) - 1 account, 1 hashtag, 1 influencer campaign
- Essentials: €250/month - 50 accounts/hashtags, 10 campaigns, 3 listening projects
- Advanced: €600/month - 300 accounts/hashtags, 100 campaigns
- Enterprise: Custom pricing

**Rate Limits:** Based on tracked accounts/hashtags per plan

**Reliability:** High - powerhouse for deep analytics
- Real-time data updates
- Advanced sentiment analysis

**Authentication:** Platform account, TikTok account connection

**Best For:** Deep analytics, sentiment analysis, influencer tracking

**Limitations:** No content creation/scheduling features

**Legal/TOS:** Uses unofficial methods, ToS compliance unclear

---

### D. Bright Data

**What It Provides:**
- Profile data (account ID, nickname, bio, engagement rate, followers, following, verification status)
- Post data (ID, description, timestamps, share/collect/comment counts, play count, video duration, hashtags, sound info, video URLs, CDN URLs)
- Engagement metrics (average engagement rate, comment/like engagement rates, counts)
- Comments API
- TikTok Shop data (products, prices, discounts, reviews, seller details)

**Pricing:**
- Web Unlocker: $3 per 1,000 requests
- Web Scraper API: $1 per 1,000 records
- Datasets: $250 per 100K records ($2.50 per 1K)
- TikTok Shop: $500 per 200K records
- **Current Promo:** 25% off for 6 months with code APIS25

**Rate Limits:** No specific usage limits - scales as needed

**Reliability:** Very high - enterprise-grade
- 24/7 dedicated support
- Multiple scraper tools (Web Unlocker, API, Datasets)
- Flawless integration with major platforms

**Authentication:** API key only, no TikTok account needed

**Delivery Options:**
- Amazon S3, Google Cloud Storage, Google PubSub
- Microsoft Azure Storage, Snowflake, SFTP
- Formats: JSON, NDJSON, CSV, Parquet with .gz compression

**Best For:** Large-scale data extraction, enterprise needs

**Legal/TOS:** Unofficial scraping - violates TikTok ToS

---

### E. SocialKit

**What It Provides:**
- Video summaries (AI-powered)
- Video transcripts
- Comments extraction with sentiment analysis
- Engagement metrics
- Video statistics
- Creator data
- Performance metrics
- Channel analytics (follower counts, video performance)
- TikTok link analysis

**Pricing:**
- Free: 20 credits (no expiration, access to all APIs)
- Basic: $13/month (2,000 credits)
- Pro: $27/month (10,000 credits)
- High Volume: $79/month (50,000 credits) - ~$0.00158 per summary

**Rate Limits:** Based on credits per plan (1 API call = 1 credit)

**Reliability:** High
- 10x cheaper than enterprise alternatives
- Unified pricing for all APIs
- Built for bulk video processing

**Authentication:** API key only

**Best For:** Teams needing bulk video processing, data scientists, content agencies

**Features:**
- All APIs included at all tiers
- No feature restrictions
- Works with YouTube, TikTok, Instagram, Shorts

**Legal/TOS:** Unofficial - ToS compliance unclear

---

### F. Phyllo (Unified Social Media API)

**What It Provides:**
- User-permissioned creator data across multiple platforms
- Engagement metrics (views, likes, comments) for TikTok videos
- Demographics data (gender, age, geography) - NOT available through official TikTok API
- Webhooks for content/profile updates
- Automatic API updates without reconnection
- Multi-platform support (YouTube, Instagram, TikTok, Facebook, Twitter, Twitch, etc.)

**Pricing:**
- Not publicly disclosed
- Custom pricing based on data volume and platform access
- Contact sales for quote

**Rate Limits:** Based on plan

**Reliability:** High - unified API platform
- Handles data normalization
- Manages platform partnerships
- Expedites app approvals
- Auto-updates when TikTok changes APIs

**Authentication:** User-permissioned (creator must connect their account)

**Best For:** Apps requiring multi-platform creator data, influencer marketing platforms

**Key Benefits:**
- Single API for multiple platforms
- Access to demographics TikTok doesn't provide via official API
- Webhook support (TikTok doesn't provide this)
- Automatic API maintenance

**Legal/TOS:** Appears to use official APIs with user permission, more compliant than scraping

---

## 4. Unofficial Scraping Methods

### A. Apify TikTok Scrapers

**Available Scrapers:**
- TikTok Scraper (main)
- TikTok Data Extractor
- TikTok Video Scraper
- TikTok Hashtag Scraper
- TikTok Profile Scraper
- TikTok Explore Scraper
- TikTok Discover Scraper

**What It Provides:**
- Profiles, hashtags, posts data
- Video URLs, engagement metrics
- Comments, shares, likes
- User information
- Trending data

**Pricing (Pay-Per-Result):**
- TikTok Data Extractor: $5 per 1,000 results ($0.005/item)
- Hashtag Scraper: $5 per 1,000 results ($0.005/item)
- Profile Scraper (Clockworks): $5 per 1,000 results ($0.005/item)
- Video/Comments Scraper: $10 per 1,000 results ($0.010/item)
- Profile Scraper (ApiDojo): $0.30 per 1,000 posts (98% success rate)

**Pricing (Pay-Per-Event):**
- Explore Scraper: $0.03 per start + $0.003 per item + $0.001 per video download
- Budget option: $0.50 per 10,000 results

**Free Tier:** $5 free credits monthly (= 1,000 results from Data Extractor)

**Rate Limits:** No specific limits, scales as needed

**Reliability:** High - enterprise platform
- 98%+ success rates
- Structured data export (JSON, CSV)
- Integrations: Make, Zapier, Slack, Google Sheets, etc.

**Authentication:** Apify account only, no TikTok login needed

**Legal/TOS:** Violates TikTok ToS - scraping platform

---

### B. Python Libraries (Open Source)

#### 1. TikTok-Api (by David Teather)

**GitHub:** https://github.com/davidteather/TikTok-Api

**What It Provides:**
- Trending content
- User information
- Video data
- Basic analytics

**Limitations:**
- Cannot post/upload content
- No user-authenticated routes
- Constant cat-and-mouse game with TikTok anti-scraping measures
- TikTok watches the repo and patches vulnerabilities
- Requires frequent updates as TikTok changes security

**Installation:** `pip install TikTokApi` + `python -m playwright install`

**Pricing:** Free and open-source

**Rate Limits:** Subject to TikTok's anti-bot detection
- EmptyResponseException = TikTok blocking (need proxies)

**Reliability:** Medium
- Requires maintenance as TikTok updates
- Community-supported
- Used in academic research (Yale, Northwestern)
- Frequently broken by TikTok updates

**Authentication:** No login required

**Legal/TOS:** Violates TikTok ToS

---

#### 2. PyTok

**GitHub:** https://github.com/networkdynamics/pytok

**What It Provides:**
- Playwright-based version of TikTok-Api
- Limited feature set vs original
- Automatic captcha solving via browser automation

**Pricing:** Free and open-source

**Rate Limits:** Subject to TikTok detection

**Reliability:** Medium - trade-off between automation and performance

**Authentication:** No login required

**Legal/TOS:** Violates TikTok ToS

---

#### 3. TikTokAPIPy

**PyPI:** https://pypi.org/project/tiktokapipy/

**What It Provides:**
- Synchronous and asynchronous API
- No login required
- No API keys needed

**Pricing:** Free and open-source

**Rate Limits:** Subject to TikTok detection

**Reliability:** Medium

**Authentication:** None required

**Legal/TOS:** Violates TikTok ToS

---

### C. ScrapFly

**What It Provides:**
- Open-source TikTok scraper tool
- Anti-bot protection bypass
- Rotating residential proxies
- JavaScript rendering
- Managed web scraping service

**Pricing:** Service-based (not disclosed in search results)

**Reliability:** High - professional service
- Manages proxy rotation
- Handles anti-bot measures
- JavaScript rendering included

**Authentication:** ScrapFly account

**Legal/TOS:** Violates TikTok ToS

---

## Legal & Terms of Service Considerations

### TikTok's Terms of Service

**Violations:**
- TikTok ToS explicitly prohibits automated access and data scraping
- Scraping violates terms of service for most unofficial methods
- Authenticated data scraping is a breach of ToS

**TikTok's Anti-Scraping Measures:**
- CAPTCHAs
- Device/network/interaction monitoring
- Rate limiting
- Bot behavior detection (request speed, patterns, datacenter IPs, missing headers)
- Once flagged, blocks are persistent

---

### Legal Risks (2026 Landscape)

#### 1. Computer Fraud and Abuse Act (CFAA) - United States
- Federal statute applicable to unauthorized access to computer systems
- Bypassing technical restrictions could violate CFAA
- Particularly relevant if circumventing anti-bot measures

#### 2. Copyright Issues
- TikTok content (videos, music) is copyright protected
- Unauthorized scraping and redistribution = copyright infringement
- Risk of infringement claims

#### 3. Privacy Laws
- **GDPR** (Europe): Personal data scraping without consent = violations, significant fines
- **CCPA** (California): Similar protections
- User personal data is protected under various privacy laws

#### 4. Breach of Contract
- Developer API users: Scraping without consent = breach of contract
- TikTok can pursue civil litigation for damages or injunctions

#### 5. Digital Millennium Copyright Act (DMCA) Section 1201
- **New in 2026:** Platforms invoking DMCA for bypassing "technological measures"
- Rate limits, captchas, security tools count as protection measures
- Bypassing these = potential DMCA violation

#### 6. Recent Legal Precedents (2026)
- Reddit v. Perplexity
- NYT v. OpenAI
- Focus on AI training and technical circumvention
- Legal landscape shifting dramatically

---

### Recommended Legal Approach

1. **Always review and comply with TikTok ToS**
2. **Use official APIs when possible** (Research API, Business API)
3. **Obtain consent from TikTok** before scraping activities
4. **Consider user-permissioned data** (like Phyllo) for more compliant access
5. **Consult legal counsel** before implementing scraping solutions
6. **Be aware of 2026 legal changes** regarding technical circumvention

---

## Comparison Matrix

| Solution | Data Available | Pricing | Rate Limits | Auth Required | Legal Risk | Reliability | Best For |
|----------|---------------|---------|-------------|---------------|------------|-------------|----------|
| **Official Research API** | Full analytics | Free | 1K req/day | Yes (approved researchers) | None | High | Academic research |
| **Official Business API** | Ads only | Free | 24hr tokens | Yes (business account) | None | High | Paid campaigns |
| **RapidAPI (ScrapTik)** | Full analytics | ~$0.002/req | Varies | No | High | High (99.99%) | Automated extraction |
| **Apify** | Full analytics | $0.005-0.01/item | None | No | High | High (98%+) | Scalable scraping |
| **Bright Data** | Full analytics + Shop | $1-3/1K | None | No | High | Very High | Enterprise scale |
| **SocialKit** | Analytics + AI | $13-79/mo | Credit-based | No | Medium | High | Bulk processing |
| **Socialinsider** | Full analytics | $99-239/mo | Account-based | Yes | Low-Medium | High | Long-term analysis |
| **Pentos** | Trends + analytics | $49-99/mo | Track-based | Varies | Medium | High | Trend tracking |
| **Exolyt** | Deep analytics | €0-600/mo | Account-based | Yes | Low-Medium | High | Sentiment analysis |
| **Phyllo** | Multi-platform | Custom | Custom | Yes (user-permissioned) | Low | High | Influencer platforms |
| **Python Libraries** | Basic analytics | Free | Subject to detection | No | High | Medium | Development/testing |

---

## Recommendations

### For Legal Compliance
1. **Phyllo** - User-permissioned, multi-platform
2. **Official Research API** - If you qualify as researcher
3. **Socialinsider/Exolyt** - Commercial platforms with established practices

### For Cost-Effectiveness
1. **SocialKit** - $13/month for 2,000 credits
2. **Apify** - $5 free monthly, then $0.005/item
3. **Python Libraries** - Free but requires maintenance

### For Reliability & Scale
1. **Bright Data** - Enterprise-grade, 99.99% uptime
2. **ScrapTik on RapidAPI** - 99.99% uptime, <0.001% failure
3. **Apify** - 98%+ success rate, professional platform

### For Feature Richness
1. **Exolyt** - Sentiment analysis, social listening
2. **Socialinsider** - Historical trends, competitor benchmarking
3. **Phyllo** - Multi-platform unified API with demographics

### For Quick Implementation
1. **RapidAPI options** - Immediate API access
2. **Apify** - $5 free credits to start
3. **SocialKit** - 20 free credits, simple pricing

---

## Important Considerations

### Anti-Bot Detection
- Most scraping methods face TikTok's anti-bot measures
- Professional services (Bright Data, Apify) handle this
- DIY Python libraries require proxy management

### Data Accuracy
- Official APIs have 10-day delay for accurate engagement data
- Unofficial methods may have real-time data but variable accuracy
- Compare multiple sources for critical decisions

### Maintenance Requirements
- Official APIs: Low maintenance, stable
- Professional services: No maintenance (handled by provider)
- Python libraries: High maintenance (TikTok constantly updates)

### Account Requirements
- Some platforms require TikTok account connection (Socialinsider, Exolyt)
- Others work with public data only (Apify, RapidAPI)
- User-permissioned (Phyllo) requires creator approval

### Data Refresh Rates
- Real-time: Most scraping services, RapidAPI
- 24-hour refresh: Phyllo, some platforms
- 15-day refresh: Official Research API
- Delayed (10 days): Official API accurate engagement data

---

## Sources

- [TikTok for Developers](https://developers.tiktok.com/doc/research-api-faq)
- [TikTok Research API](https://developers.tiktok.com/products/research-api/)
- [Scrapfly TikTok API Guide](https://scrapfly.io/blog/posts/guide-to-tiktok-api)
- [WebScraping.AI TikTok FAQ](https://webscraping.ai/faq/tiktok-scraping/)
- [TikTok Terms of Service](https://www.tiktok.com/legal/page/us/terms-of-service/en)
- [TikTok Anti-Scraping Blog](https://www.tiktok.com/privacy/blog/how-we-combat-scraping/en)
- [TikTok Legal Repercussions](https://webscraping.ai/faq/tiktok-scraping/what-are-the-legal-repercussions-for-scraping-tiktok-without-consent)
- [Scrapfly Legal Guide 2026](https://scrapfly.io/blog/posts/how-to-scrape-tiktok-python-json)
- [RapidAPI TikTok APIs](https://rapidapi.com/search/tiktok)
- [ScrapTik on RapidAPI](https://rapidapi.com/scraptik-api-scraptik-api-default/api/scraptik)
- [Apify TikTok Scraper](https://apify.com/clockworks/tiktok-scraper)
- [Bright Data TikTok Scraper](https://brightdata.com/products/web-scraper/tiktok)
- [SocialKit Pricing](https://www.socialkit.dev/pricing)
- [SocialKit TikTok APIs](https://www.socialkit.dev/blog/introducing-socialkit-tiktok-apis)
- [Pentos Pricing](https://pentos.co/pricing/)
- [Socialinsider Analytics Tools](https://curator.io/blog/tiktok-analytics-tools)
- [Sprout Social TikTok Analytics](https://sproutsocial.com/insights/tiktok-analytics-tools/)
- [Phyllo TikTok API](https://www.getphyllo.com/influencer-marketing/tiktok-api)
- [Outstand Unified APIs](https://www.outstand.so/blog/best-unified-social-media-apis-for-devs)
- [TikTok-Api GitHub](https://github.com/davidteather/TikTok-Api)
- [PyTok GitHub](https://github.com/networkdynamics/pytok)
- [TikTokAPIPy PyPI](https://pypi.org/project/tiktokapipy/)
- [TikTok Business API](https://business-api.tiktok.com/portal/docs)
- [TikTok API Authentication](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)

---

**Last Updated:** January 4, 2026
