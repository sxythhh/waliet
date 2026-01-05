# Instagram Video Analytics Scraping Research

**Date:** January 4, 2026
**Goal:** Find automated solutions to pull Reels and video post analytics from Instagram programmatically

---

## 1. Official Instagram/Meta APIs

### Instagram Graph API

**Overview:**
The official Instagram Graph API from Meta provides comprehensive access to Instagram Business and Creator account analytics, including Reels-specific metrics.

**Analytics Data Available for Reels:**
- **Views (Plays)**: Total times a Reel was played (including repeats)
- **Reach**: Unique accounts that saw the Reel
- **Engagement Metrics**: Likes, comments, shares, saves
- **Average Watch Time**: Average seconds users watch (returned in milliseconds)
- **Completion Rate**: Percentage of viewers who watched to the end
- **Skip Rate**: NEW (2025) - Percentage of views where viewers skip within first 3 seconds
- **Repost Counts**: NEW (2025) - Media level and account level
- **Profile Visits**: NEW (2025) - Via Marketing API
- **Crossposted Views**: For Reels crossposted to Facebook
- **Audience Demographics**: Age ranges, locations (cities, countries), gender distribution

**Key API Endpoints:**
- `GET /me/media?fields={fields}` - Retrieve recent Reels and core metrics
- `GET /{ig-media-id}/insights` - Deep dive analytics for specific Reel

**Requirements:**
- **Account Type**: Instagram Business or Creator account ONLY (personal accounts not supported)
- **Facebook Page**: Must be linked to a Facebook Page
- **Follower Threshold**: Some metrics only available for accounts with 1,000+ followers
- **Permissions**: Requires `instagram_basic`, `instagram_content_publish`, and `instagram_manage_insights` scopes
- **App Review**: Apps must be reviewed and switched to Live mode for production use
- **Tokens**: Manage short-lived and long-lived token refresh workflows

**Pricing:**
- **FREE** - Meta does not charge for Graph API access
- No direct usage fees, only rate limits apply

**Rate Limits:**
- **200 API calls per hour per Instagram account** (drastically reduced from 5,000 previously)
- Scales linearly: 10 connected accounts = 2,000 requests/hour total
- Business Use Case (BUC) rate limiting system
- **Automated DMs**: 200 messages/hour per account, 1 message per user per 24 hours
- Exceeding limits pauses automation for 1 hour (no account ban when using official API)

**Optimization Strategies:**
- Use webhooks instead of polling (event-driven vs continuous checking)
- Implement caching (70% reduction in API calls)
- Use field selection to only request needed data (20% reduction)
- Batch requests where possible (30% reduction)
- Combined optimizations can reduce API volume to 1/8th of naive implementation

**Reliability Concerns:**
- Many developers describe the API as "clunky" with overlapping/contradicting endpoints
- Tokens expire frequently requiring refresh management
- Requests can randomly fail or behave inconsistently
- Strict rate limits make scaling difficult for high-volume use cases

**Recent Changes (2025-2026):**
- Added: Skip Rate, Repost Counts, Profile Visits metrics
- **DEPRECATED (Jan 8, 2025)**: video_views (for non-Reels), email_contacts (time series), profile_views, website_clicks, phone_call_clicks, text_message_clicks
- Reels limit extended to 90 seconds for most accounts (some still capped at 60s)
- Trial Reels support and media deletion capabilities added

**Best For:**
- Managing your own Instagram Business/Creator accounts
- Applications with moderate data volume needs
- Users who need free, official API access
- Teams who can manage technical complexity of token/permission management

---

### Instagram Basic Display API

**Status:** ❌ **DEPRECATED - END OF LIFE (December 4, 2024)**

**Important:**
- This API is NO LONGER FUNCTIONAL as of December 2024
- Previously provided read-only access to personal Instagram accounts
- **Did NOT provide analytics data** - only basic profile info and media
- Meta deprecated to restrict third-party access to personal accounts
- All integrations must now use Instagram Graph API or Instagram Messaging API

---

## 2. RapidAPI Options

### Overview
RapidAPI hosts multiple Instagram analytics APIs from various third-party providers. Quality, reliability, and pricing vary significantly by provider.

### Notable APIs Available:

#### Instagram Statistics API (artemlipko)
**Data Available:**
- Followers, audience demographics
- Fake followers detection
- Mentions, quality score, hashtags
- IGTV, ads, audience quality
- Engagement rate
- Business and influencer audience demographics
- Interest categories

**Pricing:** Not specified in public documentation - requires RapidAPI account to view

#### Instagram Analytics and Insights (smartmetrics)
**Data Available:**
- Engagement metrics (activity patterns, audience interaction)
- Content analysis (profile engagement, reach analytics)
- Growth analytics (follower count trends, engagement rates)

**Pricing:** Not specified in public documentation

#### Instagram API39 (diyorbekkanal)
**Features:**
- 100% uptime claim, 300 req/sec capability
- Download reels, IGTV, videos, photos, stories, highlights
- Low price (specific pricing not disclosed)

#### Instagram Fast API (omarcosramiro)
**Features:**
- Profile data, feed, story, followers/following lists
- "No payment for empty or error responses" guarantee

**Pricing:** Not specified in public documentation

#### Instagram API Cheap & Best Performance
**Stats:**
- ~2.5M unique users, ~1M daily requests
- Less than 0.001% failure rate
- 99.99% uptime claim

**Pricing:** Not specified in public documentation

### General RapidAPI Considerations:

**Pricing Model:**
- Each API sets its own rates and tier structures
- Generally tiered based on request volume
- Credit card processing through PCI-compliant banking partner
- Estimated ~$2-3 per 1,000 requests (varies by API)

**Rate Limits:**
- Varies by API and subscription tier
- Typically higher limits on paid tiers

**Reliability Concerns:**
- Quality varies significantly between providers
- Community-based APIs may be abandoned or outdated
- No official support from Instagram/Meta
- Risk of API discontinuation if provider stops maintaining
- **Recent news**: Nokia acquired Rapid's technology assets (may affect future availability)

**Requirements:**
- RapidAPI account required
- Some APIs may require Instagram authentication
- Most work with public data (no business account needed for target profiles)

**Best For:**
- Users who need competitor/influencer analytics (not just owned accounts)
- Access to public Instagram data without business account requirements
- Developers comfortable with third-party API reliability risks

---

## 3. Third-Party Analytics Platforms

### Iconosquare

**Overview:**
Analytics-first social media management platform specializing in Instagram and Facebook.

**Analytics Features:**
- Follower Evolution tracking
- Engagement metrics for posts, Stories, and Reels
- Competitor analysis and benchmarking
- Hashtag performance analysis
- Clean graphs and visualization
- Content optimization recommendations

**Pricing:**
- **Basic**: €33/month (~$36/month)
- **Mid-tier**: €116/month (~$127/month)
- **Enterprise**: Custom pricing (starts at 20 social profiles)
- Free trial available

**API Access:**
- Available on **Enterprise tier only**
- Custom pricing, contact sales for quote
- "Integrate seamlessly with your existing tools through API access"

**Limitations:**
- Direct scheduling of Stories and Carousels limited due to Instagram API restrictions
- Must use Instagram Business/Creator accounts

**Best For:**
- Small to medium businesses needing dashboard analytics
- Teams wanting competitor benchmarking
- Affordable entry point compared to enterprise tools

---

### Later

**Overview:**
Content scheduling platform with detailed analytics and calendar management.

**Analytics Features:**
- In-depth post performance metrics
- Engagement tracking (likes, comments)
- Best time to post recommendations
- Long lookback periods on higher tiers
- Visual content calendar with analytics integration

**Pricing:**
- Specific pricing not disclosed in research
- Tiered plans based on features and social profiles
- Check Later.com for current pricing

**API Access:**
- Not clearly documented in public materials
- Likely requires enterprise/custom plan

**Best For:**
- Content creators and influencers
- Small businesses focusing on content planning
- Teams that batch create Reels/Stories weekly

---

### Sprout Social

**Overview:**
Premium all-in-one social media management platform with enterprise-grade features.

**Analytics Features:**
- Comprehensive analytics across X, Facebook, Threads, Instagram, LinkedIn, Pinterest, YouTube, TikTok
- Deep social listening capabilities (add-on)
- Advanced reporting and custom dashboards
- Team collaboration tools
- Governance and approval workflows

**Pricing:**
- **Standard**: $199/user/month
- **Professional**: $299/user/month
- **Advanced**: $399/user/month
- **Enterprise**: Custom pricing
- **Social Listening Add-on**: Starting at $999/month
- **Advanced Reports**: Additional fees (not transparent)

**API Access:**
- **Sprout Public API** available on Advanced Plan customers
- Enables integration with Publishing and Reporting tools
- Access owned social profile data
- Power dashboards and automate reporting
- Retrieve analytics programmatically
- Analytics available for all major platforms

**Rate Limits:**
- Not publicly documented - likely enterprise-grade

**Best For:**
- Large teams and enterprises (503% more expensive than Iconosquare entry)
- Organizations needing social listening and brand monitoring
- Teams requiring collaboration, approval workflows, and governance
- Users managing multiple platforms beyond just Instagram

---

### Phyllo API

**Overview:**
Specialized unified API for creator economy, focusing on accurate consented data across 20+ platforms.

**Analytics Features for Instagram Reels:**
- Views (Plays), Reach, Engagement (likes, comments, shares, saves)
- Average Watch Time, Completion Rate
- Tap-Through and Drop-off by timestamp
- Audience demographics
- Only platform claiming "100% accurate and consented data" for Stories, Reels, and YT Shorts

**Platform Coverage:**
- Instagram, YouTube, TikTok, Twitch, and 16+ other creator platforms
- Unified API across all platforms
- Focus on creator-relevant metrics: engagement, demographics, performance, earnings

**Pricing:**
- **Custom pricing** based on number of creator profiles
- High-scale clients reportedly pay **~$20,000/year**
- Contact for quote based on use case

**Requirements:**
- 1,000+ follower threshold for some Instagram metrics
- Uses Instagram Graph API under the hood

**Support:**
- 24/7 support via email, chat, and Discord
- Named account manager
- SLA: 3-6 business hours response time
- Comprehensive API documentation

**Best For:**
- Influencer marketing platforms
- Creator economy applications
- Companies needing multi-platform unified data
- Teams with budget for premium, supported API access

---

### Data365

**Overview:**
Social media API provider offering real-time public data across multiple platforms.

**Platform Coverage:**
- Instagram, Twitter/X, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Reddit

**Analytics Features:**
- User profiles, posts, engagement metrics in real-time
- Hashtags, comments, public engagement data
- Extensive filtering options
- Large volume data handling
- Well-structured JSON output

**Pricing:**
- **Custom-based** depending on data volume and platform access
- Plans: Basic, Standard, Premium
- Designed for high-volume applications, not occasional API calls
- More affordable than Graph API for scaling (Graph API free but has restrictive rate limits)

**Use Cases:**
- Analytics platforms
- Market research tools
- Social listening applications
- Competitor monitoring
- Brand performance tracking

**Advantages over Graph API:**
- Covers multiple platforms in one API
- Better for scaling beyond rate limit constraints
- Add platforms as needs grow
- No Facebook Page connection required

**Best For:**
- Analytics dashboards needing multi-platform data
- Social listening and competitor analysis at scale
- Market research applications
- Companies processing significant data volumes

---

## 4. Unofficial/Scraping Methods

### Instaloader

**Overview:**
Open-source Python library for downloading Instagram content and metadata without using official API.

**Capabilities:**
- Download photos, videos (including Reels), captions, metadata
- Scrape public and private profiles (with authentication)
- Hashtag scraping
- Stories, feeds, saved media
- Comments and engagement data
- Create analytics dashboards with pandas/matplotlib

**Analytics Use Cases:**
- Track average likes per day for hashtags
- Follower demographics analysis (age, gender, location, interests)
- Performance metrics (likes, comments, shares, saves)
- Hashtag popularity and reach analysis
- Competitor monitoring

**Pricing:**
- **FREE** - Open source

**Rate Limits:**
- ⚠️ **SEVERE RESTRICTIONS** as of 2026
- Previous: ~200 requests/minute
- **Current: 1-2 requests per 30 seconds** (sometimes lower)
- Limits vary by endpoint and change frequently
- Instagram dramatically lowered allowed request rates

**Best Practices to Avoid Bans:**
- Randomize delays: 10-30s between profiles, 1-3s between posts, 3-10s between stories
- Mimic human browsing patterns
- Don't make requests in rapid succession

**Risks:**
- ❌ **Account security warnings or temporary locks** even with moderate usage
- ❌ **429 Too Many Requests errors** trigger easily
- ❌ Instagram actively detects and restricts automated scraping
- ❌ No guarantee of continued functionality

**Requirements:**
- Python installation
- Instagram account for authenticated scraping
- Technical knowledge for implementation

**Best For:**
- Personal/research projects
- One-time data extraction
- Users comfortable with technical implementation
- Acceptable risk of account warnings/temporary locks

---

### Instagrapi (Instagram Private API)

**Overview:**
Python library for Instagram Private API - "The fastest and powerful Python library for Instagram Private API 2026 with HikerAPI SaaS"

**Capabilities:**
- Access to private Instagram API endpoints
- Mixed public (anonymous) and private (authorized) methods
- Public methods with `_gql` or `_a1` suffixes
- Private methods with `_v1` suffix
- Automatic fallback from public to private if exceptions occur

**Features:**
- Media scraping and analytics
- User profiles, followers, following
- Stories, highlights, IGTV, Reels
- Comments, likes, engagement data

**Pricing:**
- **FREE** - Open source library
- **HikerAPI SaaS**: Commercial paid service (recommended by developers for business use)

**Rate Limits:**
- No official limits (uses private API)
- Subject to Instagram's anti-bot detection

**Critical Risks - Direct from Developers:**
- ⚠️ **"It will be difficult to find good accounts, good proxies, or resolve challenges, and IG will ban your accounts"**
- ⚠️ **"Instagrapi more suits for testing or research than a working business!"**
- ❌ **Account bans reported after scraping just 10 posts**, even with paid proxies
- ❌ **"Wait a few minutes to try again" blocks lasting several days**
- ❌ Instagram suspends accounts despite proxy use and rate limiting

**Best Practices to Reduce Bans:**
- Add random delays between requests
- Reuse sessions (don't `.login()` repeatedly - very suspicious)
- Use quality proxy services (e.g., SOAX)
- Avoid suspicious patterns
- **Still high risk of bans even with best practices**

**Developer Warning:**
- Developers explicitly advise **NOT using instagrapi for business**
- Recommend their HikerAPI SaaS instead for commercial use
- Clients who tried to save money "ultimately returned to HikerAPI SaaS after spending much more time and money"

**Legal Status:**
- Violates Instagram's Terms of Service
- Uses private/undocumented API endpoints
- No authorization from Meta

**Best For:**
- Testing and research ONLY
- Non-commercial projects
- Users accepting high risk of account bans
- Academic or personal experimentation

**NOT Recommended For:**
- Production applications
- Business use cases
- Applications requiring reliability
- Accounts you care about keeping

---

### Commercial Scraping Services

#### Bright Data

**Overview:**
Enterprise-grade proxy and scraping infrastructure provider with Instagram-specific tools.

**Services Offered:**
- Instagram Scraper API (comments, posts, profiles, reels endpoints)
- Pre-scraped Instagram datasets
- Web Unlocker for Instagram
- 120+ no-code scrapers officially maintained by engineering team

**Pricing:**
- **Instagram Scraper API**: $1 per 1,000 records
- **Instagram Datasets**: $500 for 200K records ($2.50/1K)
- **Web Unlocker**: Starting at $3 per 1,000 results

**Features:**
- API-based integration
- Structured data output (JSON, CSV, Excel, XML)
- Officially maintained with security audits
- Consistent quality and updates when Instagram changes
- Robust proxy infrastructure

**Rate Limits:**
- Enterprise-grade infrastructure
- Scales to high volumes

**Reliability:**
- High - officially maintained by engineering team
- Regular updates when target sites change
- Security audits and quality control

**Best For:**
- Enterprise applications requiring reliability
- High-volume scraping needs
- Teams needing official support and SLAs
- Production environments where downtime is costly

---

#### Apify

**Overview:**
Full-stack web scraping platform with 4,000+ pre-built scrapers ("Actors") in marketplace.

**Services Offered:**
- Instagram profile scrapers
- Hashtag scrapers
- Post and comment scrapers
- No-code templates (customize or use as-is)
- Cloud integration (Slack, GitHub, Google Drive, etc.)
- Webhook notifications

**Pricing:**
- **Starting**: $39/month
- **Estimated**: $2.42 per 1,000 requests (varies by actor complexity and compute)

**Output Formats:**
- HTML, JSON, CSV, Excel, XML

**Features:**
- 4,000+ actors (vs Bright Data's 120 scrapers)
- Community marketplace model
- Broader coverage across websites
- Developer revenue sharing for actor creators

**Reliability Concerns:**
- ⚠️ **Community-created actors** - not officially maintained
- ⚠️ Actors can be **abandoned, outdated, or contain security vulnerabilities**
- ⚠️ **Variable quality** - no central maintenance guarantee
- ⚠️ Must evaluate individual actors before trusting in production

**Rate Limits:**
- Depends on subscription tier and actor

**Best For:**
- Projects needing broad site coverage beyond Instagram
- Users who can evaluate and test actors before deployment
- Teams accepting variable quality for wider coverage
- Budget-conscious teams ($39/month entry vs enterprise pricing)

**NOT Best For:**
- Mission-critical applications requiring guaranteed uptime
- Teams unable to vet third-party code
- Applications requiring consistent, predictable performance

---

#### Other Notable Scrapers

**Zyte API:**
- General-purpose scraper capable of handling Instagram
- Bundled proxy management (automatic IP rotation, retries, ban detection)
- 19 geographic locations for proxy selection

**ScrapingBee:**
- Developer-friendly scraping API
- Transparent pricing with opt-in credit multipliers
- Know exact costs upfront (vs Bright Data's pay-per-GB model)

---

### Legal Considerations for Scraping

**Legal Status:**
- ✅ **US Ninth Circuit Court of Appeals ruling**: Can scrape publicly available data not behind login
- ✅ Scraped public content not subject to intellectual property rights
- ❌ **Terms of Service**: All scraping violates Instagram's ToS
- ❌ **Private API use**: Explicitly unauthorized by Meta

**Risks:**
- Account bans/suspensions
- Legal action for ToS violations (rare but possible)
- Unreliable access as Instagram implements anti-scraping measures

---

## Summary Comparison Table

| Method | Pricing | Rate Limits | Reliability | Auth Required | Reels Analytics | Best Use Case |
|--------|---------|-------------|-------------|---------------|-----------------|---------------|
| **Instagram Graph API** | FREE | 200/hr per account | Medium | Business/Creator account + FB Page | ✅ Comprehensive | Own accounts, official access |
| **RapidAPI (various)** | ~$2-3/1K requests | Varies by API | Low-Medium | Varies | ⚠️ Limited/varies | Competitor analysis, public data |
| **Iconosquare** | €33-116/mo | Not disclosed | High | Business account | ✅ Dashboard only | SMB analytics dashboards |
| **Sprout Social** | $199-399+/user/mo | Enterprise-grade | High | Business account | ✅ Via API (Advanced plan) | Enterprise teams, multi-platform |
| **Phyllo** | ~$20K/year | Not disclosed | High | Business account | ✅ Comprehensive | Influencer platforms, creator economy |
| **Data365** | Custom (volume-based) | High volume | High | Not required for public data | ✅ Public data | Analytics platforms, social listening |
| **Instaloader** | FREE | 1-2 req/30s | Low | Personal account | ⚠️ Manual analysis | Research, one-time extractions |
| **Instagrapi** | FREE | No official limit | Very Low ❌ | Personal account | ⚠️ High ban risk | Testing ONLY, not production |
| **Bright Data** | $1-2.5/1K | Enterprise | High | Not required | ✅ Via scraping | Enterprise scraping, high volume |
| **Apify** | $39+/mo | Varies | Medium | Not required | ⚠️ Varies by actor | Broad coverage, budget-conscious |

---

## Recommendations

### For Your Own Instagram Business/Creator Accounts:
**✅ Instagram Graph API** - Official, free, comprehensive Reels analytics
- **Pros**: Free, official, comprehensive metrics, no ban risk
- **Cons**: Requires business account, 200/hr rate limit, technical setup
- **When to use**: Managing 1-10 owned Instagram accounts with moderate data needs

### For Competitor/Influencer Analysis (Public Data):
**✅ Bright Data** (if budget allows) - Most reliable scraping
- **Pros**: Enterprise reliability, maintained infrastructure, structured data
- **Cons**: $1-2.5 per 1K records
- **When to use**: Production applications, high reliability needs

**✅ Apify** (if budget-conscious) - Broader coverage, lower cost
- **Pros**: $39/mo entry, 4000+ actors, flexible
- **Cons**: Variable quality, must vet actors
- **When to use**: Moderate budgets, can test/evaluate actors

**⚠️ Data365** (for multi-platform at scale) - Public data aggregation
- **Pros**: Multi-platform, real-time, high volume
- **Cons**: Custom pricing (likely expensive for volume)
- **When to use**: Need Instagram + other platforms, processing significant data volumes

### For Influencer Marketing Platforms:
**✅ Phyllo API** - Purpose-built for creator economy
- **Pros**: Multi-platform, accurate consented data, great support
- **Cons**: ~$20K/year
- **When to use**: Building influencer marketing SaaS, need multi-platform creator data

### For Enterprise Teams (Multi-Platform):
**✅ Sprout Social API** - Advanced plan customers
- **Pros**: Multi-platform, team collaboration, reporting automation
- **Cons**: $199-399+/user/month, API on Advanced plan only
- **When to use**: Large teams needing collaboration + analytics + publishing across platforms

### For SMB/Agencies (Dashboard Focus):
**✅ Iconosquare** - Most affordable analytics-first platform
- **Pros**: €33/mo entry, analytics-focused, competitor benchmarking
- **Cons**: API on enterprise tier only, Instagram API limitations
- **When to use**: Small teams needing affordable dashboards + competitor analysis

### ❌ NOT Recommended for Production:
- **Instaloader**: Too restrictive (1-2 req/30s), account warning risks
- **Instagrapi**: Developers explicitly warn against business use, high ban risk
- **RapidAPI (unvetted)**: Variable quality, discontinuation risk

---

## Key Takeaways

1. **Official API is Best for Owned Accounts**: If you manage Instagram Business/Creator accounts, the Graph API is free and comprehensive for Reels analytics, despite the 200/hr rate limit.

2. **Scraping Required for Competitor Data**: Official API only works for accounts you manage. Competitor/influencer analysis requires scraping services or third-party APIs.

3. **Free Scraping is Risky**: Instaloader and Instagrapi work but have severe rate limits and high ban risks. Not suitable for production or business use.

4. **Commercial Scraping Costs Add Up**: $1-2.5 per 1K records means $1,000-2,500 for 1M data points. Budget accordingly.

5. **1,000 Follower Threshold**: Many official metrics only available for accounts with 1,000+ followers.

6. **Business Account Required**: Almost all official/authorized methods require converting to Instagram Business or Creator account linked to Facebook Page.

7. **Rate Limits are Strict**: Official API reduced from 5,000 to 200 calls/hour in recent years. Plan for optimization (caching, webhooks, field selection).

8. **Multi-Platform Needs Different Solution**: If you need Instagram + YouTube + TikTok analytics, unified APIs (Phyllo, Data365) or multi-platform tools (Sprout Social) are more efficient than separate integrations.

---

## Next Steps

1. **Define Your Exact Use Case:**
   - Own accounts only, or competitor analysis needed?
   - Number of Instagram accounts to track?
   - Expected API call volume?
   - Multi-platform needs?

2. **Choose Primary Method:**
   - **Own accounts**: Start with Graph API (free)
   - **Competitor analysis**: Evaluate Bright Data vs Apify vs Data365 based on budget
   - **Influencer platform**: Consider Phyllo
   - **Enterprise multi-platform**: Evaluate Sprout Social or Data365

3. **Prototype and Test:**
   - Graph API: Register app, get credentials, test with owned account
   - Commercial scrapers: Start with free trials or low-tier plans
   - Validate data quality, rate limits, and reliability before committing

4. **Plan for Scale:**
   - Implement caching to reduce API calls
   - Use webhooks instead of polling where possible
   - Budget for increased costs as data volume grows

5. **Monitor Compliance:**
   - Ensure Terms of Service compliance
   - Review data privacy regulations (GDPR, CCPA if applicable)
   - Document data sources and usage rights
