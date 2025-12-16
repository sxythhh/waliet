import { Link } from "react-router-dom";
import { LogOut, ArrowRight, Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthDialog from "@/components/AuthDialog";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import blueprintsMenuIcon from "@/assets/blueprints-menu-icon.svg";
import campaignsMenuIcon from "@/assets/campaigns-menu-icon.svg";
import boostsMenuIcon from "@/assets/boosts-menu-icon.svg";

const blogPosts = [
  {
    id: 1,
    title: "The Rise of UGC: Why Brands Are Shifting Away from Traditional Advertising",
    excerpt: "User-generated content is revolutionizing how brands connect with audiences. With 79% of consumers saying UGC highly impacts their purchasing decisions, the shift from polished ads to authentic creator content isn't just a trend—it's the new standard.",
    content: `The advertising landscape is undergoing a seismic shift. Traditional commercials and polished brand content are losing their grip on consumer attention, while authentic, creator-driven content is capturing hearts and wallets like never before.

## The Trust Factor

Modern consumers are increasingly skeptical of traditional advertising. They've grown up with ad-blockers, skip buttons, and an innate ability to tune out anything that feels "salesy." But when content comes from real people—creators they follow and trust—everything changes.

Studies show that 92% of consumers trust recommendations from individuals over brands, even if they don't know them personally. This fundamental shift in trust dynamics is why UGC has become the cornerstone of successful marketing strategies.

## The Economics Make Sense

Beyond trust, the economics of UGC are compelling. Traditional ad campaigns require massive budgets for production, talent, and media buying. A single TV commercial can cost anywhere from $50,000 to millions of dollars.

In contrast, working with creators through platforms like Virality allows brands to generate dozens of authentic content pieces for a fraction of the cost. And because this content resonates more deeply with audiences, the return on investment often surpasses traditional methods.

## What This Means for Creators

For content creators, this shift represents an unprecedented opportunity. Brands are actively seeking authentic voices to represent their products, and they're willing to pay for quality content that connects with audiences.

The barrier to entry has never been lower. You don't need millions of followers—you need engaged audiences and the ability to create content that feels genuine. Micro-influencers with 10,000-100,000 followers often see higher engagement rates than mega-influencers, making them increasingly valuable to brands.

## The Future is Collaborative

The most successful brands aren't just buying ad space anymore—they're building relationships with creators. They're investing in long-term partnerships that benefit both parties: creators get stable income and creative freedom, while brands get a steady stream of authentic content.

Platforms like Virality are at the forefront of this collaboration, connecting brands with creators and streamlining the entire process from campaign creation to payment. It's a new ecosystem that rewards authenticity and punishes inauthenticity.

The message is clear: the future of marketing is human, authentic, and creator-driven. The question isn't whether to embrace this shift—it's how quickly you can adapt to it.`,
    author: "Virality Team",
    date: "December 10, 2024",
    readTime: "6 min read",
    category: "Industry Trends",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=400&fit=crop"
  },
  {
    id: 2,
    title: "How to 10x Your Creator Earnings: Strategies That Actually Work",
    excerpt: "Stop leaving money on the table. From optimizing your content for brand partnerships to leveraging multiple revenue streams, here's a comprehensive guide to maximizing your income as a content creator in 2024.",
    content: `If you're creating content but struggling to monetize effectively, you're not alone. The creator economy is booming, but the gap between top earners and everyone else is widening. Here's how to bridge that gap.

## Diversify Your Revenue Streams

The biggest mistake creators make is relying on a single income source. Platform ad revenue is unpredictable and often disappointing. The most successful creators have multiple revenue streams working simultaneously:

**Brand Partnerships**: This should be your primary focus. Brands are spending over $15 billion annually on creator partnerships, and that number is growing. Platforms like Virality connect you directly with brands looking for authentic content.

**Affiliate Marketing**: Recommend products you genuinely use and earn commissions on sales. This works especially well when combined with authentic content—your audience trusts your recommendations.

**Digital Products**: Create templates, presets, courses, or guides related to your niche. These have high margins and can generate passive income.

## Optimize Your Profile for Brands

When brands are looking for creators to partner with, they're scanning profiles quickly. Make sure yours stands out:

- **Clear niche positioning**: Brands want specialists, not generalists
- **Engagement metrics over follower count**: A 10% engagement rate with 5,000 followers is more valuable than 1% with 50,000
- **Professional presentation**: Quality profile photos, clear bios, and linked portfolios

## Master the Art of the Pitch

Don't wait for brands to find you—go after opportunities proactively. A good pitch includes:

1. Why you specifically are right for their brand
2. Content ideas tailored to their goals
3. Examples of past successful partnerships
4. Clear metrics and expected outcomes

## Leverage Campaign Platforms

Platforms like Virality have changed the game for creators. Instead of cold-pitching brands, you can browse active campaigns, apply to those that fit your niche, and get paid based on performance.

The RPM (revenue per mille) model means your earnings scale with your content's success. Create a viral video, and you could earn thousands from a single piece of content.

## Build Long-Term Relationships

One-off brand deals are nice, but recurring partnerships are where real wealth is built. Focus on over-delivering for every brand you work with. Ask for feedback, propose new ideas, and treat each partnership as the beginning of a relationship.

## The Consistency Compound Effect

Finally, remember that creator earnings compound over time. Each piece of content you create adds to your portfolio, builds your audience, and increases your value to brands. The creators who succeed aren't necessarily the most talented—they're the most consistent.

Start implementing these strategies today, and watch your earnings transform over the coming months.`,
    author: "Virality Team",
    date: "December 5, 2024",
    readTime: "8 min read",
    category: "Creator Tips",
    image: "https://images.unsplash.com/photo-1553484771-371a605b060b?w=800&h=400&fit=crop"
  },
  {
    id: 3,
    title: "Inside Virality: How We're Building the Future of Brand-Creator Collaboration",
    excerpt: "A behind-the-scenes look at how Virality is reimagining the relationship between brands and creators—from instant payments to transparent metrics, and everything in between.",
    content: `When we started Virality, we had a simple observation: the creator economy was broken. Brands struggled to find authentic voices, creators struggled to get paid fairly, and everyone was frustrated with the opacity of the system.

## The Problem We're Solving

Traditional influencer marketing is plagued with problems:

**For Brands**:
- Difficulty verifying creator authenticity and engagement
- Complicated contracts and payment processes
- No standardized metrics for measuring success
- High costs with uncertain returns

**For Creators**:
- Inconsistent payment (sometimes waiting months to get paid)
- Lack of transparency in how compensation is calculated
- Limited access to brand opportunities
- No leverage in negotiations

We built Virality to solve these problems from both sides.

## Our Approach: Transparency First

Everything at Virality is designed around transparency. Creators can see exactly how campaigns work before they join—the RPM rates, the budget, the expectations. There are no hidden terms or surprise deductions.

For brands, we provide verified creator metrics, demographic data, and performance tracking in real-time. No more guessing whether a creator's engagement is real or inflated.

## The Blueprint System

One of our most innovative features is our Blueprint system. Brands create detailed content briefs—we call them Blueprints—that clearly communicate their vision, talking points, dos and don'ts, and examples of content they love.

This solves one of the biggest friction points in creator partnerships: misaligned expectations. When both sides are crystal clear on what success looks like, the collaboration is smoother and the content is better.

## Performance-Based Compensation

We pioneered the performance-based compensation model for UGC. Instead of flat fees that may or may not reflect actual value, our RPM model means creators earn based on the real performance of their content.

Great content that resonates with audiences gets rewarded. This aligns incentives perfectly—brands only pay for results, and creators are incentivized to create their best work.

## Instant, Reliable Payments

Perhaps nothing frustrates creators more than payment delays. We've built our payment infrastructure to be fast and reliable. When you earn money on Virality, you can withdraw it quickly without jumping through hoops.

## What's Next

We're just getting started. Our roadmap includes:

- **Advanced matching algorithms** to connect brands with perfect-fit creators
- **Collaborative content tools** for real-time feedback and iteration
- **Expanded payment options** including crypto and international transfers
- **Creator education resources** to help you level up your skills

## Join the Movement

The creator economy is the future of marketing, and Virality is at its center. Whether you're a brand looking to harness authentic content or a creator ready to monetize your influence, we're building this platform for you.

The relationship between brands and creators doesn't have to be adversarial. When both sides succeed together, everyone wins. That's the future we're building at Virality.`,
    author: "Virality Team",
    date: "November 28, 2024",
    readTime: "7 min read",
    category: "Company",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=400&fit=crop"
  }
];

export default function Blog() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState<typeof blogPosts[0] | null>(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2">
                <img alt="Virality" className="h-6 w-6" src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png" />
                <span className="text-lg font-clash font-semibold text-white">VIRALITY</span>
              </Link>
              
              <div className="hidden md:flex items-center gap-1">
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="bg-transparent text-white/80 hover:text-white hover:bg-[#1a1a1a] font-inter tracking-[-0.5px] text-sm data-[state=open]:bg-[#1a1a1a]">
                        Product
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-64 p-3 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl">
                          <NavigationMenuLink asChild>
                            <Link to="/dashboard?tab=discover" className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors">
                              <img src={blueprintsMenuIcon} alt="" className="w-5 h-5" />
                              <div>
                                <div className="font-medium text-white">Blueprints</div>
                                <div className="text-xs text-white/50">Campaign templates & briefs</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                          <NavigationMenuLink asChild>
                            <Link to="/dashboard?tab=discover" className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors">
                              <img src={campaignsMenuIcon} alt="" className="w-5 h-5" />
                              <div>
                                <div className="font-medium text-white">Campaigns</div>
                                <div className="text-xs text-white/50">RPM-based creator programs</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                          <NavigationMenuLink asChild>
                            <Link to="/dashboard?tab=discover" className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg font-inter tracking-[-0.5px] transition-colors">
                              <img src={boostsMenuIcon} alt="" className="w-5 h-5" />
                              <div>
                                <div className="font-medium text-white">Boosts</div>
                                <div className="text-xs text-white/50">Fixed-rate video bounties</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                
                <Link to="/blog" className="px-3 py-2 text-sm text-white font-inter tracking-[-0.5px]">
                  Blog
                </Link>
                
                <Link to="/new" className="px-3 py-2 text-sm text-white/80 hover:text-white font-inter tracking-[-0.5px]">
                  Contact
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">
                    <Button size="sm" className="font-inter tracking-[-0.3px] font-medium bg-[#2060df] hover:bg-[#2060df]/90 border-t border-[#4f89ff] text-white">
                      Dashboard
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await supabase.auth.signOut();
                  }} className="font-inter tracking-[-0.3px] font-medium text-muted-foreground hover:text-white hover:bg-destructive/20 gap-1.5 rounded-xl">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="font-geist font-medium tracking-[-0.5px] hover:bg-transparent hover:text-foreground px-[10px] rounded-3xl text-white/80" onClick={() => setShowAuthDialog(true)}>
                    Sign In
                  </Button>
                  <Button size="sm" onClick={() => setShowAuthDialog(true)} className="font-geist font-medium tracking-[-0.5px] px-5 bg-gradient-to-b from-primary via-primary to-primary/70 border-t shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 border-[#a11010]/[0.26] rounded-2xl">
                    Create Account
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-14">
        {selectedPost ? (
          // Single Blog Post View
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <button 
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-2 text-white/60 hover:text-white mb-8 font-inter tracking-[-0.5px] text-sm transition-colors"
            >
              ← Back to all posts
            </button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <article className="lg:col-span-2">
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-inter tracking-[-0.5px] mb-4">
                    {selectedPost.category}
                  </span>
                  <h1 className="text-3xl md:text-4xl font-inter tracking-[-0.5px] font-semibold text-white mb-4">
                    {selectedPost.title}
                  </h1>
                  <div className="flex items-center gap-4 text-white/50 text-sm font-inter tracking-[-0.5px]">
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      {selectedPost.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {selectedPost.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {selectedPost.readTime}
                    </span>
                  </div>
                </div>
                
                <img 
                  src={selectedPost.image} 
                  alt={selectedPost.title}
                  className="w-full h-64 md:h-80 object-cover rounded-2xl mb-8"
                />
                
                <div className="prose prose-invert prose-lg max-w-none">
                  {selectedPost.content.split('\n\n').map((paragraph, index) => {
                    if (paragraph.startsWith('## ')) {
                      return (
                        <h2 key={index} className="text-xl font-inter tracking-[-0.5px] font-semibold text-white mt-8 mb-4">
                          {paragraph.replace('## ', '')}
                        </h2>
                      );
                    }
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return (
                        <p key={index} className="font-inter tracking-[-0.5px] text-white font-medium">
                          {paragraph.replace(/\*\*/g, '')}
                        </p>
                      );
                    }
                    if (paragraph.startsWith('**')) {
                      return (
                        <p key={index} className="font-inter tracking-[-0.5px] text-white/80 leading-relaxed">
                          <strong className="text-white">{paragraph.split('**')[1]}</strong>
                          {paragraph.split('**')[2]}
                        </p>
                      );
                    }
                    if (paragraph.startsWith('1.') || paragraph.startsWith('- ')) {
                      return (
                        <ul key={index} className="list-disc list-inside text-white/80 font-inter tracking-[-0.5px] space-y-2">
                          {paragraph.split('\n').map((item, i) => (
                            <li key={i}>{item.replace(/^[\d\.\-\s]+/, '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={index} className="font-inter tracking-[-0.5px] text-white/80 leading-relaxed mb-4">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              </article>

              {/* Sidebar CTA */}
              <aside className="lg:col-span-1">
                <div className="sticky top-24 space-y-6">
                  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-inter tracking-[-0.5px] font-semibold text-white mb-2">
                      Ready to start earning?
                    </h3>
                    <p className="text-white/60 text-sm font-inter tracking-[-0.5px] mb-4">
                      Join thousands of creators getting paid for their content. Sign up for free and start monetizing today.
                    </p>
                    <Button 
                      onClick={() => setShowAuthDialog(true)}
                      className="w-full font-inter tracking-[-0.5px] bg-primary hover:bg-primary/90"
                    >
                      Create Free Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-inter tracking-[-0.5px] font-semibold text-white mb-4">
                      More Articles
                    </h3>
                    <div className="space-y-4">
                      {blogPosts.filter(p => p.id !== selectedPost.id).map(post => (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className="block text-left group"
                        >
                          <h4 className="text-sm font-inter tracking-[-0.5px] text-white/80 group-hover:text-white transition-colors line-clamp-2">
                            {post.title}
                          </h4>
                          <span className="text-xs text-white/40 font-inter tracking-[-0.5px]">
                            {post.readTime}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          // Blog List View
          <>
            {/* Hero Section */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border-b border-white/5">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <div className="max-w-3xl">
                  <span className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-inter tracking-[-0.5px] mb-4">
                    The Virality Blog
                  </span>
                  <h1 className="text-4xl md:text-5xl font-inter tracking-[-0.5px] font-semibold text-white mb-4">
                    Insights for creators and brands
                  </h1>
                  <p className="text-lg text-white/60 font-inter tracking-[-0.5px]">
                    Industry trends, creator tips, and the latest from Virality. Everything you need to succeed in the creator economy.
                  </p>
                </div>
              </div>
            </div>

            {/* Blog Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                  {blogPosts.map((post, index) => (
                    <article 
                      key={post.id}
                      className={`group cursor-pointer ${index === 0 ? '' : 'border-t border-white/10 pt-8'}`}
                      onClick={() => setSelectedPost(post)}
                    >
                      {index === 0 ? (
                        // Featured Post
                        <div>
                          <img 
                            src={post.image} 
                            alt={post.title}
                            className="w-full h-64 md:h-80 object-cover rounded-2xl mb-6 group-hover:opacity-90 transition-opacity"
                          />
                          <span className="inline-block px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs font-inter tracking-[-0.5px] mb-3">
                            {post.category}
                          </span>
                          <h2 className="text-2xl md:text-3xl font-inter tracking-[-0.5px] font-semibold text-white mb-3 group-hover:text-primary transition-colors">
                            {post.title}
                          </h2>
                          <p className="text-white/60 font-inter tracking-[-0.5px] mb-4 line-clamp-2">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center gap-4 text-white/40 text-sm font-inter tracking-[-0.5px]">
                            <span>{post.author}</span>
                            <span>•</span>
                            <span>{post.date}</span>
                            <span>•</span>
                            <span>{post.readTime}</span>
                          </div>
                        </div>
                      ) : (
                        // Regular Post
                        <div className="flex gap-6">
                          <img 
                            src={post.image} 
                            alt={post.title}
                            className="w-32 h-32 md:w-48 md:h-32 object-cover rounded-xl flex-shrink-0 group-hover:opacity-90 transition-opacity"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="inline-block px-2 py-0.5 bg-white/10 text-white/80 rounded-full text-xs font-inter tracking-[-0.5px] mb-2">
                              {post.category}
                            </span>
                            <h2 className="text-lg md:text-xl font-inter tracking-[-0.5px] font-semibold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                              {post.title}
                            </h2>
                            <p className="text-white/60 text-sm font-inter tracking-[-0.5px] mb-3 line-clamp-2 hidden md:block">
                              {post.excerpt}
                            </p>
                            <div className="flex items-center gap-3 text-white/40 text-xs font-inter tracking-[-0.5px]">
                              <span>{post.date}</span>
                              <span>•</span>
                              <span>{post.readTime}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                {/* Sidebar */}
                <aside className="lg:col-span-1">
                  <div className="sticky top-24 space-y-6">
                    {/* CTA Card */}
                    <div className="bg-gradient-to-br from-primary/20 via-[#1a1a1a] to-[#0f0f0f] border border-primary/20 rounded-2xl p-6">
                      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
                        <img src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png" alt="Virality" className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-inter tracking-[-0.5px] font-semibold text-white mb-2">
                        Start earning today
                      </h3>
                      <p className="text-white/60 text-sm font-inter tracking-[-0.5px] mb-4">
                        Join Virality and connect with brands looking for authentic creators like you.
                      </p>
                      <Button 
                        onClick={() => setShowAuthDialog(true)}
                        className="w-full font-inter tracking-[-0.5px] bg-primary hover:bg-primary/90"
                      >
                        Create Free Account
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>

                    {/* For Brands CTA */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-inter tracking-[-0.5px] font-semibold text-white mb-2">
                        Are you a brand?
                      </h3>
                      <p className="text-white/60 text-sm font-inter tracking-[-0.5px] mb-4">
                        Launch your first UGC campaign and connect with thousands of authentic creators.
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => setShowAuthDialog(true)}
                        className="w-full font-inter tracking-[-0.5px] border-white/20 text-white hover:bg-white/5"
                      >
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>

                    {/* Newsletter */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-inter tracking-[-0.5px] font-semibold text-white mb-2">
                        Stay updated
                      </h3>
                      <p className="text-white/60 text-sm font-inter tracking-[-0.5px] mb-4">
                        Get the latest creator economy insights delivered to your inbox.
                      </p>
                      <div className="flex gap-2">
                        <input 
                          type="email" 
                          placeholder="Enter your email"
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 font-inter tracking-[-0.5px] focus:outline-none focus:border-primary"
                        />
                        <Button size="sm" className="font-inter tracking-[-0.5px] bg-primary hover:bg-primary/90 px-4">
                          Subscribe
                        </Button>
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-inter tracking-[-0.5px] font-semibold text-white mb-4">
                        Categories
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {['Industry Trends', 'Creator Tips', 'Company', 'Case Studies', 'Product Updates'].map(cat => (
                          <span 
                            key={cat}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-sm font-inter tracking-[-0.5px] cursor-pointer transition-colors"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Auth Dialog */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
}
