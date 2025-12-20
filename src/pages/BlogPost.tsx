import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthDialog from "@/components/AuthDialog";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import DOMPurify from "dompurify";

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
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
    const fetchPost = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

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
  const articleStructuredData = post ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt || "",
    "image": post.image_url || "",
    "datePublished": formatISODate(post.published_at),
    "dateModified": formatISODate(post.published_at),
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "Virality",
      "logo": {
        "@type": "ImageObject",
        "url": "https://app.virality.gg/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://app.virality.gg/blog/${post.slug}`
    }
  } : null;

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background overflow-y-auto">
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
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="h-[100dvh] bg-background overflow-y-auto flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Article not found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/resources')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resources
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background overflow-y-auto">
      <Helmet>
        <title>{post.title} | Virality</title>
        <meta name="description" content={post.excerpt || `Read ${post.title} on Virality`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || ""} />
        {post.image_url && <meta property="og:image" content={post.image_url} />}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://app.virality.gg/blog/${post.slug}`} />
        <link rel="canonical" href={`https://app.virality.gg/blog/${post.slug}`} />
        {articleStructuredData && (
          <script type="application/ld+json">
            {JSON.stringify(articleStructuredData)}
          </script>
        )}
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link 
            to="/resources" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-inter tracking-[-0.5px]">Back to Resources</span>
          </Link>
          
          {!isAuthenticated && (
            <Button onClick={() => setShowAuthDialog(true)} size="sm" className="font-inter tracking-[-0.5px]">
              Sign Up Free
            </Button>
          )}
        </div>
      </header>

      {/* Article Content */}
      <article 
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        itemScope 
        itemType="https://schema.org/Article"
      >
        <header className="mb-8">
          {post.category && (
            <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-4 font-inter tracking-[-0.5px]">
              {post.category}
            </span>
          )}
          
          <h1 
            className="text-3xl md:text-4xl font-inter tracking-[-0.5px] font-bold text-foreground mb-4" 
            itemProp="headline"
          >
            {post.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-inter tracking-[-0.5px]">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span itemProp="author">{post.author}</span>
            </div>
            {post.published_at && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
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
        
        {post.image_url && (
          <figure className="mb-8">
            <img 
              src={post.image_url} 
              alt={`Featured image for ${post.title}`}
              className="w-full h-64 md:h-96 object-cover rounded-2xl"
              itemProp="image"
              loading="lazy"
            />
          </figure>
        )}
        
        {/* Rich HTML Content */}
        <div 
          className="prose prose-neutral dark:prose-invert prose-lg max-w-none 
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
            [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto"
          itemProp="articleBody"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 pt-8 border-t border-border">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full font-inter tracking-[-0.5px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA at bottom of article */}
        {!isAuthenticated && (
          <section className="mt-12 p-8 bg-gradient-to-br from-primary/20 via-card to-background border border-primary/20 rounded-2xl">
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
          </section>
        )}
      </article>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
}
