import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthDialog from "@/components/AuthDialog";
import { Skeleton } from "@/components/ui/skeleton";
import DOMPurify from "dompurify";
import PublicNavbar from "@/components/PublicNavbar";
import { SEOHead } from "@/components/SEOHead";
import { generateArticleSchema, getCanonicalUrl } from "@/lib/seo";
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
  tags: string[] | null;
}
export default function BlogPostPage() {
  const {
    slug
  } = useParams<{
    slug: string;
  }>();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setIsAuthenticated(!!session);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const {
        data,
        error
      } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('is_published', true).maybeSingle();
      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data);
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);
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

  // Sanitize HTML content
  const sanitizedContent = post?.content ? DOMPurify.sanitize(post.content, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
  }) : '';

  // Generate structured data for SEO
  const articleStructuredData = post ? generateArticleSchema({
    title: post.title,
    description: post.excerpt || '',
    author: post.author,
    publishedTime: formatISODate(post.published_at),
    image: post.image_url || undefined,
    url: `/blog/${post.slug}`
  }) : null;
  if (loading) {
    return <div className="h-[100dvh] bg-background overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-64 w-full mb-8 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>;
  }
  if (notFound || !post) {
    return <div className="h-[100dvh] bg-background overflow-y-auto flex items-center justify-center">
        <SEOHead title="Article Not Found" description="The article you're looking for doesn't exist or has been removed." noIndex={true} />
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Article not found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/resources')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resources
          </Button>
        </div>
      </div>;
  }
  return <div className="h-[100dvh] flex flex-col bg-background">
      <SEOHead title={post.title} description={post.excerpt || `Read ${post.title} on Virality`} ogImage={post.image_url || undefined} ogType="article" canonical={getCanonicalUrl(`/blog/${post.slug}`)} author={post.author} publishedTime={formatISODate(post.published_at)} keywords={post.tags || undefined} breadcrumbs={[{
      name: 'Home',
      url: '/'
    }, {
      name: 'Resources',
      url: '/resources'
    }, {
      name: post.title,
      url: `/blog/${post.slug}`
    }]} structuredData={articleStructuredData || undefined} />

      <PublicNavbar />

      {/* Article Content */}
      <main className="flex-1 overflow-y-auto pt-14">
        <article itemScope itemType="https://schema.org/Article">
        {/* Hero Cover Section */}
        {post.image_url ? (
          <div className="relative w-full h-[50vh] md:h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
            {/* Cover Image */}
            <img
              src={post.image_url}
              alt={`Featured image for ${post.title}`}
              className="absolute inset-0 w-full h-full object-cover"
              itemProp="image"
              loading="eager"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            {/* Content positioned over image */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-12 max-w-4xl mx-auto">
              {post.category && (
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full mb-4 font-inter tracking-[-0.5px]">
                  {post.category}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-inter tracking-[-0.5px] font-bold text-white mb-4 leading-tight" itemProp="headline">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/80 font-inter tracking-[-0.5px]">
                {post.published_at && (
                  <div className="flex items-center gap-1.5">
                    <time dateTime={formatISODate(post.published_at)} itemProp="datePublished">
                      {formatDate(post.published_at)}
                    </time>
                  </div>
                )}
                {post.read_time && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{post.read_time}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Fallback header when no image */
          <header className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
            {post.category && (
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-4 font-inter tracking-[-0.5px]">
                {post.category}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-inter tracking-[-0.5px] font-bold text-foreground mb-4" itemProp="headline">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              {post.published_at && (
                <div className="flex items-center gap-1.5">
                  <time dateTime={formatISODate(post.published_at)} itemProp="datePublished">
                    {formatDate(post.published_at)}
                  </time>
                </div>
              )}
              {post.read_time && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{post.read_time}</span>
                </div>
              )}
            </div>
          </header>
        )}
        
        {/* Article Body Container */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Rich HTML Content */}
          <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none
              [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-8
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6
              [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:mt-4
              [&_p]:text-base [&_p]:leading-relaxed [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
              [&_li]:mb-1
              [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80
              [&_img]:rounded-lg [&_img]:my-4 [&_img]:max-w-full
              [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic
              [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
              [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto" itemProp="articleBody" dangerouslySetInnerHTML={{
            __html: sanitizedContent
          }} />

          {/* Tags and Back Link */}
          <div className="mt-8 pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {post.tags && post.tags.length > 0 && post.tags.map((tag, index) => <span key={index} className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full font-inter tracking-[-0.5px]">
                  {tag}
                </span>)}
            </div>
            <Link to="/resources" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-inter tracking-[-0.5px]">
              <ArrowLeft className="w-4 h-4" />
              Back to Resources
            </Link>
          </div>

          {/* CTA at bottom of article */}
          {!isAuthenticated && <section className="mt-12 p-8 border border-primary/20 rounded-2xl">
              <h2 className="text-xl font-inter tracking-[-0.5px] font-semibold text-foreground mb-2">
                Ready to start earning?
              </h2>
              <p className="text-muted-foreground text-sm font-inter tracking-[-0.5px] mb-4">
                Join thousands of creators getting paid for their content. Sign up for free and start monetizing today.
              </p>
              <Button onClick={() => setShowAuthDialog(true)} className="font-inter tracking-[-0.5px]">
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </section>}
        </div>
        </article>
      </main>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>;
}