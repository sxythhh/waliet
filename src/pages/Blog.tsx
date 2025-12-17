import { Link } from "react-router-dom";
import { LogOut, ArrowRight, Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
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

interface TableOfContentsItem {
  id: string;
  text: string;
}

export default function Blog() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  
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
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      
      if (!error && data) {
        setBlogPosts(data);
      }
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const tableOfContents = useMemo<TableOfContentsItem[]>(() => {
    if (!selectedPost) return [];
    const headings: TableOfContentsItem[] = [];
    selectedPost.content.split('\n\n').forEach((paragraph, index) => {
      if (paragraph.startsWith('## ')) {
        const text = paragraph.replace('## ', '');
        headings.push({
          id: `heading-${index}`,
          text
        });
      }
    });
    return headings;
  }, [selectedPost]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
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

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto pt-14">
        {selectedPost ? (
          // Single Blog Post View
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <button 
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-2 text-white/60 hover:text-white mb-8 font-inter tracking-[-0.5px] text-sm transition-colors"
            >
              ← Back to all posts
            </button>
            
            <article>
              <div className="mb-6">
                {selectedPost.category && (
                  <span className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-inter tracking-[-0.5px] mb-4">
                    {selectedPost.category}
                  </span>
                )}
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
                    {formatDate(selectedPost.published_at)}
                  </span>
                  {selectedPost.read_time && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {selectedPost.read_time}
                    </span>
                  )}
                </div>
              </div>
              
              {selectedPost.image_url && (
                <img 
                  src={selectedPost.image_url} 
                  alt={selectedPost.title}
                  className="w-full h-64 md:h-96 object-cover rounded-2xl mb-8"
                />
              )}
              
              <div className="prose prose-invert prose-lg max-w-none">
                {selectedPost.content.split('\n\n').map((paragraph, index) => {
                  if (paragraph.startsWith('## ')) {
                    const text = paragraph.replace('## ', '');
                    const headingId = `heading-${index}`;
                    return (
                      <h2 key={index} id={headingId} className="text-xl font-inter tracking-[-0.5px] font-semibold text-white mt-8 mb-4 scroll-mt-20">
                        {text}
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

              {/* Floating Table of Contents Menu */}
              {tableOfContents.length > 0 && (
                <div className="fixed bottom-6 right-6 z-50">
                  <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 max-w-xs shadow-2xl">
                    {!isAuthenticated && (
                      <div className="mb-4 pb-4 border-b border-white/10">
                        <p className="text-white/60 text-xs font-inter tracking-[-0.5px] mb-2">
                          Start earning as a creator
                        </p>
                        <Button 
                          onClick={() => setShowAuthDialog(true)}
                          size="sm"
                          className="w-full font-inter tracking-[-0.5px] bg-primary hover:bg-primary/90"
                        >
                          Sign Up Free
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    )}
                    
                    <span className="text-xs font-inter tracking-[-0.5px] text-white/60 uppercase mb-3 block">
                      Contents
                    </span>
                    
                    <nav className="space-y-1.5">
                      {tableOfContents.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => scrollToHeading(item.id)}
                          className="block w-full text-left text-sm font-inter tracking-[-0.5px] text-white/70 hover:text-white hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors"
                        >
                          {item.text}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              )}

              {/* CTA at bottom of article */}
              <div className="mt-12 p-8 bg-gradient-to-br from-primary/20 via-[#1a1a1a] to-[#0f0f0f] border border-primary/20 rounded-2xl">
                <h3 className="text-xl font-inter tracking-[-0.5px] font-semibold text-white mb-2">
                  Ready to start earning?
                </h3>
                <p className="text-white/60 text-sm font-inter tracking-[-0.5px] mb-4">
                  Join thousands of creators getting paid for their content. Sign up for free and start monetizing today.
                </p>
                <Button 
                  onClick={() => setShowAuthDialog(true)}
                  className="font-inter tracking-[-0.5px] bg-primary hover:bg-primary/90"
                >
                  Create Free Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </article>
          </div>
        ) : (
          // Blog List View
          <>
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
              <div className="text-center max-w-3xl mx-auto">
                <h1 className="text-5xl md:text-6xl font-inter tracking-[-1px] font-semibold text-white mb-6">
                  Blog
                </h1>
                <p className="text-lg text-white/50 font-inter tracking-[-0.5px]">
                  Industry trends, creator tips, and the latest from Virality.
                </p>
              </div>
            </div>

            {/* Blog Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {blogPosts.map((post) => (
                    <article 
                      key={post.id}
                      className="group cursor-pointer bg-[#111] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all hover:shadow-lg hover:shadow-black/20"
                      onClick={() => setSelectedPost(post)}
                    >
                      {post.image_url && (
                        <img 
                          src={post.image_url} 
                          alt={post.title}
                          className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                        />
                      )}
                      <div className="p-5">
                        {post.category && (
                          <span className="inline-block px-2 py-0.5 bg-white/10 text-white/80 rounded-full text-xs font-inter tracking-[-0.5px] mb-3">
                            {post.category}
                          </span>
                        )}
                        <h2 className="text-lg font-inter tracking-[-0.5px] font-semibold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className="text-white/60 text-sm font-inter tracking-[-0.5px] mb-4 line-clamp-2">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-white/40 text-xs font-inter tracking-[-0.5px]">
                          <span>{formatDate(post.published_at)}</span>
                          {post.read_time && (
                            <>
                              <span>•</span>
                              <span>{post.read_time}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* Bottom CTA */}
              <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl">
                <div>
                  <h3 className="text-xl font-inter tracking-[-0.5px] font-semibold text-white mb-2">
                    Ready to start creating?
                  </h3>
                  <p className="text-white/60 text-sm font-inter tracking-[-0.5px]">
                    Join Virality and connect with brands looking for authentic creators like you.
                  </p>
                </div>
                <Button 
                  onClick={() => setShowAuthDialog(true)}
                  className="font-inter tracking-[-0.5px] bg-primary hover:bg-primary/90 whitespace-nowrap"
                >
                  Create Free Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
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
