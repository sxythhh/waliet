import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Download, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import viralityLogoWhite from "@/assets/virality-logo-white.png";
import sharePattern from "@/assets/share-pattern.png";
import { cn } from "@/lib/utils";
interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'referral' | 'balance_correction' | 'transfer_sent' | 'transfer_received' | 'boost_earning' | 'transfer_out';
  amount: number;
  date: Date;
  destination?: string;
  source?: string;
  status?: string;
  rejection_reason?: string;
  metadata?: any;
  campaign?: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url: string | null;
  } | null;
  boost?: {
    id: string;
    title: string;
    brand_name: string;
    brand_logo_url: string | null;
  } | null;
}
interface UserProfile {
  username?: string;
  avatar_url?: string;
  banner_url?: string;
}
interface TransactionShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  userProfile?: UserProfile;
}
const COLOR_THEMES = [{
  id: 'plum',
  name: 'Plum',
  primary: '#6366f1',
  secondary: '#818cf8',
  gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
}, {
  id: 'melon',
  name: 'Melon',
  primary: '#10b981',
  secondary: '#34d399',
  gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
}, {
  id: 'peach',
  name: 'Peach',
  primary: '#f97316',
  secondary: '#fb923c',
  gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
}, {
  id: 'apple',
  name: 'Apple',
  primary: '#22c55e',
  secondary: '#4ade80',
  gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
}, {
  id: 'rose',
  name: 'Rose',
  primary: '#f43f5e',
  secondary: '#fb7185',
  gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
}, {
  id: 'sky',
  name: 'Sky',
  primary: '#0ea5e9',
  secondary: '#38bdf8',
  gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
}, {
  id: 'amber',
  name: 'Amber',
  primary: '#f59e0b',
  secondary: '#fbbf24',
  gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
}, {
  id: 'violet',
  name: 'Violet',
  primary: '#8b5cf6',
  secondary: '#a78bfa',
  gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
}];
export function TransactionShareDialog({
  open,
  onOpenChange,
  transaction,
  userProfile
}: TransactionShareDialogProps) {
  const [selectedTheme, setSelectedTheme] = useState(COLOR_THEMES[0]);
  const [showViralityLogo, setShowViralityLogo] = useState(true);
  const [useDarkCard, setUseDarkCard] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const {
    toast
  } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // Detect system dark mode preference
    const isDarkMode = document.documentElement.classList.contains('dark');
    setUseDarkCard(isDarkMode);
  }, [open]);
  useEffect(() => {
    if (open && transaction) {
      generateImage();
    }
  }, [open, transaction, selectedTheme, showViralityLogo, useDarkCard]);
  const generateImage = async () => {
    if (!transaction) return;
    setIsGenerating(true);

    // Higher resolution for better quality (2x scale)
    const scale = 2;
    const width = 1200;
    const height = 750;
    try {
      // Load Virality logo
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = viralityLogoWhite;
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });
      const logoCanvas = document.createElement('canvas');
      logoCanvas.width = logoImg.width;
      logoCanvas.height = logoImg.height;
      const logoCtx = logoCanvas.getContext('2d');
      if (logoCtx) {
        logoCtx.drawImage(logoImg, 0, 0);
      }
      const logoBase64 = logoCanvas.toDataURL('image/png');

      // Load pattern image
      const patternImg = new Image();
      patternImg.crossOrigin = "anonymous";
      patternImg.src = sharePattern;
      let patternBase64 = '';
      try {
        await new Promise((resolve, reject) => {
          patternImg.onload = resolve;
          patternImg.onerror = reject;
        });
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = patternImg.width;
        patternCanvas.height = patternImg.height;
        const patternCtx = patternCanvas.getContext('2d');
        if (patternCtx) {
          patternCtx.drawImage(patternImg, 0, 0);
        }
        patternBase64 = patternCanvas.toDataURL('image/png');
      } catch (e) {
        console.log('Failed to load pattern:', e);
      }

      // Load user avatar if available - crop to square for proper circle display
      let avatarBase64 = '';
      if (userProfile?.avatar_url) {
        try {
          const avatarImg = new Image();
          avatarImg.crossOrigin = "anonymous";
          avatarImg.src = userProfile.avatar_url;
          await new Promise(resolve => {
            avatarImg.onload = resolve;
            avatarImg.onerror = () => resolve(null);
          });
          if (avatarImg.width > 0 && avatarImg.height > 0) {
            // Create a square canvas and center-crop the image
            const size = Math.min(avatarImg.width, avatarImg.height);
            const avatarCanvas = document.createElement('canvas');
            avatarCanvas.width = size;
            avatarCanvas.height = size;
            const avatarCtx = avatarCanvas.getContext('2d');
            if (avatarCtx) {
              // Calculate crop position to center
              const sx = (avatarImg.width - size) / 2;
              const sy = (avatarImg.height - size) / 2;
              avatarCtx.drawImage(avatarImg, sx, sy, size, size, 0, 0, size, size);
              avatarBase64 = avatarCanvas.toDataURL('image/png');
            }
          }
        } catch (e) {
          console.log('Failed to load avatar:', e);
        }
      }

      // Load brand logo if available
      let brandLogoBase64 = '';
      const brandLogoUrl = transaction.campaign?.brand_logo_url || transaction.boost?.brand_logo_url;
      if (brandLogoUrl) {
        try {
          const brandLogoImg = new Image();
          brandLogoImg.crossOrigin = "anonymous";
          brandLogoImg.src = brandLogoUrl;
          await new Promise(resolve => {
            brandLogoImg.onload = resolve;
            brandLogoImg.onerror = () => resolve(null);
          });
          if (brandLogoImg.width > 0) {
            const brandLogoCanvas = document.createElement('canvas');
            brandLogoCanvas.width = brandLogoImg.width;
            brandLogoCanvas.height = brandLogoImg.height;
            const brandLogoCtx = brandLogoCanvas.getContext('2d');
            if (brandLogoCtx) {
              brandLogoCtx.drawImage(brandLogoImg, 0, 0);
              brandLogoBase64 = brandLogoCanvas.toDataURL('image/png');
            }
          }
        } catch (e) {
          console.log('Failed to load brand logo:', e);
        }
      }
      const amountColor = transaction.type === 'earning' || transaction.type === 'boost_earning' || transaction.type === 'transfer_received' || transaction.type === 'referral' ? '#10b981' : transaction.type === 'balance_correction' ? '#f97316' : '#ef4444';
      const amountSign = transaction.type === 'earning' || transaction.type === 'boost_earning' || transaction.type === 'transfer_received' || transaction.type === 'referral' ? '+' : '';
      const programName = transaction.campaign?.title || transaction.boost?.title || transaction.campaign?.brand_name || transaction.boost?.brand_name || 'Virality';
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${selectedTheme.primary}"/>
              <stop offset="100%" style="stop-color:${selectedTheme.secondary}"/>
            </linearGradient>
            <clipPath id="avatarClip">
              <circle cx="90" cy="660" r="36"/>
            </clipPath>
            <clipPath id="brandLogoClip">
              <circle cx="165" cy="180" r="24"/>
            </clipPath>
          </defs>
          
          <style>
            text { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          </style>
          
          <!-- Main background with gradient -->
          <rect width="${width}" height="${height}" fill="url(#bgGradient)" rx="36"/>
          
          <!-- Pattern overlay -->
          ${patternBase64 ? `<image href="${patternBase64}" x="0" y="0" width="${width}" height="${height}" opacity="0.5" preserveAspectRatio="xMidYMid slice"/>` : ''}
          
          <!-- Virality logo at top center -->
          ${showViralityLogo ? `
            <image href="${logoBase64}" x="${(width - 60) / 2}" y="30" width="60" height="60"/>
          ` : ''}
          
          <!-- Card background - dark or light based on mode -->
          <rect x="90" y="110" width="1020" height="430" fill="${useDarkCard ? '#0a0a0a' : '#fff'}" rx="30"/>
          
          <!-- Amount -->
          <text x="135" y="230" font-size="84" font-weight="700" fill="${amountColor}">${amountSign}$${Math.abs(transaction.amount).toFixed(2)}</text>
          
          <!-- Secondary info -->
          <text x="135" y="290" font-size="24" fill="${useDarkCard ? '#666' : '#999'}">${format(transaction.date, 'MMMM dd, yyyy')}</text>
          
          <!-- Status -->
          ${transaction.status === 'completed' ? `
            <rect x="135" y="320" width="150" height="42" fill="#10b98120" rx="21"/>
            <text x="210" y="350" font-size="20" font-weight="600" fill="#10b981" text-anchor="middle">Completed</text>
          ` : transaction.status === 'pending' ? `
            <rect x="135" y="320" width="135" height="42" fill="#f59e0b20" rx="21"/>
            <text x="202" y="350" font-size="20" font-weight="600" fill="#f59e0b" text-anchor="middle">Pending</text>
          ` : ''}
          
          <!-- Decorative line in card -->
          <rect x="135" y="400" width="900" height="3" fill="${useDarkCard ? '#222' : '#f0f0f0'}" rx="1.5"/>
          
          <!-- Date range at bottom of card -->
          <text x="135" y="470" font-size="20" fill="${useDarkCard ? '#666' : '#999'}">${format(transaction.date, 'MMM dd')}</text>
          <text x="1035" y="470" font-size="20" fill="${useDarkCard ? '#666' : '#999'}" text-anchor="end">Today</text>
          
          <!-- User profile at bottom -->
          ${avatarBase64 ? `
            <image href="${avatarBase64}" x="54" y="624" width="72" height="72" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>
          ` : `
            <circle cx="90" cy="660" r="36" fill="rgba(255,255,255,0.3)"/>
          `}
          ${userProfile?.username ? `
            <text x="144" y="668" font-size="22" font-weight="600" fill="#fff">virality.gg/@${userProfile.username}</text>
          ` : ''}
        </svg>
      `;

      // Convert SVG to blob
      const svgBlob = new Blob([svg], {
        type: 'image/svg+xml;charset=utf-8'
      });

      // Create canvas at higher resolution
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Enable high quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const img = new Image();
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const imageDataUrl = canvas.toDataURL('image/png', 1.0);
        setGeneratedImageUrl(imageDataUrl);
        setIsGenerating(false);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setIsGenerating(false);
      };
      img.src = url;
    } catch (error) {
      console.error('Error generating image:', error);
      setIsGenerating(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate image"
      });
    }
  };
  const handleCopyImage = async () => {
    if (!generatedImageUrl) return;
    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({
        'image/png': blob
      })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Image copied to clipboard"
      });
    } catch (error) {
      // Fallback: download the image instead
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Use the download button instead"
      });
    }
  };
  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.download = `virality-transaction-${transaction?.id?.slice(0, 8) || Date.now()}.png`;
    link.href = generatedImageUrl;
    link.click();
    toast({
      title: "Downloaded!",
      description: "Image saved to your device"
    });
  };
  const handleShareOnX = () => {
    const tweetText = encodeURIComponent(`Just earned $${Math.abs(transaction?.amount || 0).toFixed(2)} on @JoinVirality! 💰`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank', 'width=550,height=420');
    toast({
      title: "Share on X",
      description: "Attach the downloaded image to your post!"
    });
  };
  if (!transaction) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl font-inter">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-[-0.5px]">Share your stats</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-[1fr,280px] gap-6">
          {/* Preview */}
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-border bg-muted/30">
              {isGenerating ? <div className="w-full aspect-[8/5] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div> : generatedImageUrl ? <img src={generatedImageUrl} alt="Transaction" className="w-full h-auto" /> : <div className="w-full aspect-[8/5] flex items-center justify-center text-muted-foreground">
                  Generating preview...
                </div>}
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 gap-2 bg-muted/50 hover:bg-muted border-0 font-inter tracking-[-0.5px] text-foreground hover:text-foreground" onClick={handleCopyImage} disabled={!generatedImageUrl || isGenerating}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button variant="ghost" className="flex-1 gap-2 bg-muted/50 hover:bg-muted border-0 font-inter tracking-[-0.5px] text-foreground hover:text-foreground" onClick={handleDownload} disabled={!generatedImageUrl || isGenerating}>
                <Download className="h-4 w-4" />
                Save image
              </Button>
            </div>
          </div>
          
          {/* Options */}
          <div className="space-y-6">
            {/* Color theme */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Color theme</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_THEMES.map(theme => <button key={theme.id} onClick={() => setSelectedTheme(theme)} className={cn("p-2 rounded-lg border transition-all flex items-center justify-center", selectedTheme.id === theme.id ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border hover:border-primary/50")}>
                    <div className="w-8 h-8 rounded-full" style={{
                  background: theme.gradient
                }} />
                  </button>)}
              </div>
            </div>
            
            {/* Toggle options */}
            
            
            {/* Share button */}
            <Button className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90" onClick={handleShareOnX} disabled={!generatedImageUrl || isGenerating}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}