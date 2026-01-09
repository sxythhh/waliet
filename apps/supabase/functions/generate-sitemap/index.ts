import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://virality.gg";

// Static routes with their priorities
const staticRoutes = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/discover", priority: 0.9, changefreq: "hourly" },
  { path: "/resources", priority: 0.8, changefreq: "weekly" },
  { path: "/case-studies", priority: 0.7, changefreq: "weekly" },
  { path: "/apply", priority: 0.7, changefreq: "monthly" },
  { path: "/leaderboard", priority: 0.6, changefreq: "daily" },
  { path: "/contact", priority: 0.5, changefreq: "monthly" },
  { path: "/support", priority: 0.5, changefreq: "monthly" },
  { path: "/install", priority: 0.5, changefreq: "monthly" },
  { path: "/terms", priority: 0.3, changefreq: "yearly" },
  { path: "/privacy", priority: 0.3, changefreq: "yearly" },
  { path: "/creator-terms", priority: 0.3, changefreq: "yearly" },
];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function generateSitemapXml(urls: Array<{ loc: string; lastmod?: string; changefreq: string; priority: number }>): string {
  const urlEntries = urls
    .map(
      (url) => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(1)}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const urls: Array<{ loc: string; lastmod?: string; changefreq: string; priority: number }> = [];

    // Add static routes
    for (const route of staticRoutes) {
      urls.push({
        loc: `${BASE_URL}${route.path}`,
        changefreq: route.changefreq,
        priority: route.priority,
      });
    }

    // Fetch active public campaigns
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("slug, updated_at, created_at")
      .eq("status", "active")
      .eq("is_private", false)
      .order("created_at", { ascending: false })
      .limit(500);

    if (campaigns) {
      for (const campaign of campaigns) {
        urls.push({
          loc: `${BASE_URL}/c/${campaign.slug}`,
          lastmod: formatDate(new Date(campaign.updated_at || campaign.created_at)),
          changefreq: "weekly",
          priority: 0.8,
        });
      }
    }

    // Fetch active public boost campaigns
    const { data: boostCampaigns } = await supabase
      .from("bounty_campaigns")
      .select("id, updated_at, created_at")
      .eq("status", "active")
      .eq("is_private", false)
      .order("created_at", { ascending: false })
      .limit(200);

    if (boostCampaigns) {
      for (const boost of boostCampaigns) {
        urls.push({
          loc: `${BASE_URL}/c/${boost.id}`,
          lastmod: formatDate(new Date(boost.updated_at || boost.created_at)),
          changefreq: "weekly",
          priority: 0.7,
        });
      }
    }

    // Fetch public creator profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("username, updated_at, created_at")
      .eq("hide_from_leaderboard", false)
      .not("username", "is", null)
      .order("current_xp", { ascending: false })
      .limit(1000);

    if (profiles) {
      for (const profile of profiles) {
        if (profile.username) {
          urls.push({
            loc: `${BASE_URL}/@${profile.username}`,
            lastmod: formatDate(new Date(profile.updated_at || profile.created_at)),
            changefreq: "weekly",
            priority: 0.6,
          });
        }
      }
    }

    // Fetch active public brands
    const { data: brands } = await supabase
      .from("brands")
      .select("slug, updated_at, created_at")
      .eq("is_active", true)
      .not("slug", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (brands) {
      for (const brand of brands) {
        urls.push({
          loc: `${BASE_URL}/b/${brand.slug}`,
          lastmod: formatDate(new Date(brand.updated_at || brand.created_at)),
          changefreq: "weekly",
          priority: 0.7,
        });
      }
    }

    // Fetch published blog posts
    const { data: blogPosts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(100);

    if (blogPosts) {
      for (const post of blogPosts) {
        urls.push({
          loc: `${BASE_URL}/blog/${post.slug}`,
          lastmod: formatDate(new Date(post.updated_at || post.published_at)),
          changefreq: "monthly",
          priority: 0.6,
        });
      }
    }

    // Fetch public courses
    const { data: courses } = await supabase
      .from("courses")
      .select("id, updated_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (courses) {
      for (const course of courses) {
        urls.push({
          loc: `${BASE_URL}/course/${course.id}`,
          lastmod: formatDate(new Date(course.updated_at || course.created_at)),
          changefreq: "monthly",
          priority: 0.6,
        });
      }
    }

    const sitemap = generateSitemapXml(urls);

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate sitemap" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
