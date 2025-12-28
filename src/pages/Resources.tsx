import { Link } from "react-router-dom";
import { BookOpen, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import PublicNavbar from "@/components/PublicNavbar";

const ImageWithSkeleton = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className="relative w-full h-48">
      {!isLoaded && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};
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
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ResourceFilter>('all');

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
    <div className="h-screen flex flex-col bg-background">
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

      <PublicNavbar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-labelledby="resources-heading">
          <header className="mb-8">
            <h1 id="resources-heading" className="sr-only">Creator Resources - Articles and Courses</h1>
            
            {/* Filter Tabs */}
            <nav className="flex items-center gap-2" aria-label="Filter resources">
              <button 
                onClick={() => setFilter('all')} 
                className={`px-4 py-2 rounded-full text-sm font-inter tracking-[-0.5px] transition-all ${filter === 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
                aria-pressed={filter === 'all'}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('articles')} 
                className={`px-4 py-2 rounded-full text-sm font-inter tracking-[-0.5px] transition-all ${filter === 'articles' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
                aria-pressed={filter === 'articles'}
              >
                Articles
              </button>
              <button 
                onClick={() => setFilter('courses')} 
                className={`px-4 py-2 rounded-full text-sm font-inter tracking-[-0.5px] transition-all ${filter === 'courses' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
                aria-pressed={filter === 'courses'}
              >
                Courses
              </button>
            </nav>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading resources">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-card rounded-xl overflow-hidden animate-pulse">
                  <div className="w-full h-48 bg-muted" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
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
                  className="group cursor-pointer bg-card rounded-xl overflow-hidden transition-all border border-border"
                  role="listitem"
                  itemScope 
                  itemType="https://schema.org/Course"
                >
                  {course.banner_url ? (
                    <div className="relative">
                      <ImageWithSkeleton 
                        src={course.banner_url} 
                        alt={`${course.title} course banner`}
                        className="w-full h-48 object-cover group-hover:opacity-90"
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
                      <span className="text-muted-foreground text-xs font-inter tracking-[-0.5px]">
                        {course.module_count} lessons
                      </span>
                    </div>
                    <h2 className="text-lg font-inter tracking-[-0.5px] font-semibold text-foreground mb-2 line-clamp-2" itemProp="name">
                      {course.title}
                    </h2>
                    {course.description && (
                      <p className="text-muted-foreground text-sm font-inter tracking-[-0.5px] line-clamp-2" itemProp="description">
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
                  className="group cursor-pointer bg-card rounded-xl overflow-hidden transition-all border border-border"
                  role="listitem"
                  itemScope 
                  itemType="https://schema.org/Article"
                >
                  {post.image_url ? (
                    <div className="relative">
                      <ImageWithSkeleton 
                        src={post.image_url} 
                        alt={`${post.title} article thumbnail`}
                        className="w-full h-48 object-cover group-hover:opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {post.category && (
                        <div className="absolute bottom-3 left-3">
                          <span className="inline-block px-2.5 py-1 bg-white/10 text-white/80 rounded-full text-xs font-inter tracking-[-0.5px]" itemProp="articleSection">
                            {post.category}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-blue-500/20 to-purple-600/10 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-blue-500/50" aria-hidden="true" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      {post.published_at && (
                        <time 
                          dateTime={formatISODate(post.published_at)} 
                          className="text-muted-foreground text-xs font-inter tracking-[-0.5px]"
                          itemProp="datePublished"
                        >
                          {formatDate(post.published_at)}
                        </time>
                      )}
                      {post.read_time && (
                        <>
                          <span className="text-muted-foreground/50">·</span>
                          <span className="text-muted-foreground text-xs font-inter tracking-[-0.5px]">{post.read_time}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-lg font-inter tracking-[-0.5px] font-semibold text-foreground mb-2 line-clamp-2" itemProp="headline">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-muted-foreground text-sm font-inter tracking-[-0.5px] line-clamp-2" itemProp="description">
                        {post.excerpt}
                      </p>
                    )}
                    <meta itemProp="author" content={post.author} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Empty States */}
          {!loading && filter === 'all' && blogPosts.length === 0 && courses.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" aria-hidden="true" />
              <p className="text-muted-foreground font-inter tracking-[-0.5px]">No resources available yet</p>
            </div>
          )}

          {!loading && filter === 'articles' && blogPosts.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" aria-hidden="true" />
              <p className="text-muted-foreground font-inter tracking-[-0.5px]">No articles available yet</p>
            </div>
          )}

          {!loading && filter === 'courses' && courses.length === 0 && (
            <div className="text-center py-16">
              <Folder className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" aria-hidden="true" />
              <p className="text-muted-foreground font-inter tracking-[-0.5px]">No courses available yet</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
