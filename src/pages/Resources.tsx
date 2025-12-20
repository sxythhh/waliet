import { Link } from "react-router-dom";
import { LogOut, ArrowRight, BookOpen, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthDialog from "@/components/AuthDialog";
import { Helmet } from "react-helmet-async";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import blueprintsMenuIcon from "@/assets/blueprints-menu-icon.svg";
import campaignsMenuIcon from "@/assets/campaigns-menu-icon.svg";
import boostsMenuIcon from "@/assets/boosts-menu-icon.svg";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  author: string;
  category: string | null;
  image_url: string | null;
  read_time: string | null;
  published_at: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  created_at: string;
  module_count?: number;
}

type ResourceFilter = 'all' | 'articles' | 'courses';

export default function Resources() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ResourceFilter>('all');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: postsData, error: postsError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (!postsError && postsData) {
        setBlogPosts(postsData);
      }

      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*, course_modules(id)')
        .order('created_at', { ascending: false });

      if (!coursesError && coursesData) {
        const coursesWithCount = coursesData.map(course => ({
          ...course,
          module_count: course.course_modules?.length || 0
        }));
        setCourses(coursesWithCount);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatISODate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString();
  };

  // Generate structured data for the resources list
  const resourcesStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Creator Resources | Virality",
    "description": "Expert guides, tutorials, and courses for content creators. Learn how to grow your audience and monetize your content.",
    "url": "https://app.virality.gg/resources",
    "publisher": {
      "@type": "Organization",
      "name": "Virality",
      "logo": {
        "@type": "ImageObject",
        "url": "https://app.virality.gg/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png"
      }
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": [
        ...blogPosts.map((post, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Article",
            "name": post.title,
            "description": post.excerpt || "",
            "url": `https://app.virality.gg/blog/${post.slug}`
          }
        })),
        ...courses.map((course, index) => ({
          "@type": "ListItem",
          "position": blogPosts.length + index + 1,
          "item": {
            "@type": "Course",
            "name": course.title,
            "description": course.description || "",
            "url": `https://app.virality.gg/course/${course.id}`
          }
        }))
      ]
    }
  };

  const pageTitle = "Creator Resources & Guides | Virality";
  const pageDescription = "Expert guides, tutorials, and courses for content creators. Learn strategies to grow your audience, monetize content, and succeed on social media.";
  const pageImage = "https://app.virality.gg/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png";

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="creator resources, content creator guides, social media monetization, TikTok tips, YouTube growth, Instagram marketing, influencer marketing" />
        <meta name="author" content="Virality" />
        <link rel="canonical" href="https://app.virality.gg/resources" />
        
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://app.virality.gg/resources" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={pageImage} />
        <meta property="og:site_name" content="Virality" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://app.virality.gg/resources" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageImage} />
        
        <script type="application/ld+json">
          {JSON.stringify(resourcesStructuredData)}
        </script>
      </Helmet>

      {/* Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2" aria-label="Virality Home">
                <img 
                  alt="Virality Logo" 
                  className="h-6 w-6" 
                  src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png"
                  width="24"
                  height="24"
                />
                <span className="text-lg font-clash font-semibold text-white">VIRALITY</span>
              </Link>
              
              <NavigationMenu className="hidden md:flex">
                <NavigationMenuList className="gap-1">
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="font-inter tracking-[-0.5px] text-white/70 hover:text-white hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-white">
                      For Brands
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[400px] p-4 bg-[#0f0f0f] border border-white/10 rounded-xl">
                        <NavigationMenuLink asChild>
                          <Link to="/apply" className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                            <img src={blueprintsMenuIcon} alt="" className="w-8 h-8 mt-0.5" />
                            <div>
                              <p className="font-inter tracking-[-0.5px] font-medium text-white">Blueprints</p>
                              <p className="text-sm text-white/50 font-inter tracking-[-0.5px]">Create structured content guidelines</p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <Link to="/apply" className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                            <img src={campaignsMenuIcon} alt="" className="w-8 h-8 mt-0.5" />
                            <div>
                              <p className="font-inter tracking-[-0.5px] font-medium text-white">UGC Campaigns</p>
                              <p className="text-sm text-white/50 font-inter tracking-[-0.5px]">Launch RPM-based creator campaigns</p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <Link to="/apply" className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                            <img src={boostsMenuIcon} alt="" className="w-8 h-8 mt-0.5" />
                            <div>
                              <p className="font-inter tracking-[-0.5px] font-medium text-white">Boosts</p>
                              <p className="text-sm text-white/50 font-inter tracking-[-0.5px]">Fixed-fee creator partnerships</p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link to="/discover" className="px-3 py-2 font-inter tracking-[-0.5px] text-white/70 hover:text-white text-sm">
                      For Creators
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link to="/resources" className="px-3 py-2 font-inter tracking-[-0.5px] text-white text-sm">
                      Resources
                    </Link>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
            
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">
                    <Button 
                      size="sm" 
                      className="font-geist font-medium tracking-[-0.5px] px-5 bg-gradient-to-b from-primary via-primary to-primary/70 border-t shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 border-[#a11010]/[0.26] rounded-2xl"
                    >
                      Dashboard
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={async () => { await supabase.auth.signOut(); }} 
                    className="font-inter tracking-[-0.3px] font-medium text-muted-foreground hover:text-white hover:bg-destructive/20 gap-1.5 rounded-xl"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="font-geist font-medium tracking-[-0.5px] hover:bg-transparent hover:text-foreground px-[10px] rounded-3xl text-white/80" 
                    onClick={() => setShowAuthDialog(true)}
                  >
                    Sign In
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setShowAuthDialog(true)} 
                    className="font-geist font-medium tracking-[-0.5px] px-5 bg-gradient-to-b from-primary via-primary to-primary/70 border-t shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] active:translate-y-[2px] transition-all duration-150 border-[#a11010]/[0.26] rounded-2xl"
                  >
                    Create Account
                  </Button>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-labelledby="resources-heading">
          <header className="mb-8">
            <h1 id="resources-heading" className="sr-only">Creator Resources - Articles and Courses</h1>
            
            {/* Filter Tabs */}
            <nav className="flex items-center gap-2" aria-label="Filter resources">
              <button 
                onClick={() => setFilter('all')} 
                className={`px-4 py-2 rounded-full text-sm font-inter tracking-[-0.5px] transition-all ${filter === 'all' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                aria-pressed={filter === 'all'}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('articles')} 
                className={`px-4 py-2 rounded-full text-sm font-inter tracking-[-0.5px] transition-all ${filter === 'articles' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                aria-pressed={filter === 'articles'}
              >
                Articles
              </button>
              <button 
                onClick={() => setFilter('courses')} 
                className={`px-4 py-2 rounded-full text-sm font-inter tracking-[-0.5px] transition-all ${filter === 'courses' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                aria-pressed={filter === 'courses'}
              >
                Courses
              </button>
            </nav>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading resources">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-48 bg-white/5 rounded-xl mb-4" />
                  <div className="h-4 bg-white/5 rounded w-20 mb-3" />
                  <div className="h-6 bg-white/5 rounded mb-2" />
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
              {/* Courses */}
              {(filter === 'all' || filter === 'courses') && courses.map(course => (
                <Link 
                  key={course.id} 
                  to={`/course/${course.id}`} 
                  className="group cursor-pointer bg-[#111] rounded-xl overflow-hidden transition-all"
                  role="listitem"
                  itemScope 
                  itemType="https://schema.org/Course"
                >
                  {course.banner_url ? (
                    <div className="relative">
                      <img 
                        src={course.banner_url} 
                        alt={`${course.title} course banner`}
                        className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                        loading="lazy"
                        itemProp="image"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-white rounded-full text-xs font-inter tracking-[-0.5px] bg-primary">
                          <Folder className="w-3 h-3" aria-hidden="true" />
                          Course
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-emerald-500/50" aria-hidden="true" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white/40 text-xs font-inter tracking-[-0.5px]">
                        {course.module_count} lessons
                      </span>
                    </div>
                    <h2 className="text-lg font-inter tracking-[-0.5px] font-semibold text-white mb-2 line-clamp-2" itemProp="name">
                      {course.title}
                    </h2>
                    {course.description && (
                      <p className="text-white/60 text-sm font-inter tracking-[-0.5px] line-clamp-2" itemProp="description">
                        {course.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}

              {/* Blog Posts */}
              {(filter === 'all' || filter === 'articles') && blogPosts.map(post => (
                <Link 
                  key={post.id} 
                  to={`/blog/${post.slug}`}
                  className="group cursor-pointer bg-[#111] rounded-xl overflow-hidden transition-all" 
                  role="listitem"
                  itemScope 
                  itemType="https://schema.org/Article"
                >
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt={`${post.title} article thumbnail`}
                      className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                      loading="lazy"
                      itemProp="image"
                    />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      {post.category ? (
                        <span className="inline-block px-2.5 py-1 bg-primary/20 text-primary rounded-full text-xs font-inter tracking-[-0.5px]" itemProp="articleSection">
                          {post.category}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 bg-white/10 text-white/60 rounded-full text-xs font-inter tracking-[-0.5px]">
                          Article
                        </span>
                      )}
                      {post.read_time && (
                        <span className="text-white/40 text-xs font-inter tracking-[-0.5px]">
                          {post.read_time}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-inter tracking-[-0.5px] font-semibold text-white mb-2 line-clamp-2" itemProp="headline">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-white/60 text-sm font-inter tracking-[-0.5px] line-clamp-2" itemProp="description">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3 text-white/40 text-xs font-inter tracking-[-0.5px]">
                      <span itemProp="author">{post.author}</span>
                      <span aria-hidden="true">•</span>
                      <time dateTime={formatISODate(post.published_at)} itemProp="datePublished">
                        {formatDate(post.published_at)}
                      </time>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && (
            (filter === 'all' && blogPosts.length === 0 && courses.length === 0) ||
            (filter === 'articles' && blogPosts.length === 0) ||
            (filter === 'courses' && courses.length === 0)
          ) && (
            <div className="text-center py-12">
              <p className="text-white/50 font-inter tracking-[-0.5px]">
                No {filter === 'all' ? 'resources' : filter} found yet.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Auth Dialog */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
}
