import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Download, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import viralityGhostLogo from "@/assets/virality-ghost-logo.png";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'referral' | 'balance_correction' | 'transfer_sent' | 'transfer_received' | 'boost_earning';
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

const COLOR_THEMES = [
  { id: 'plum', name: 'Plum', primary: '#6366f1', secondary: '#818cf8', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
  { id: 'melon', name: 'Melon', primary: '#10b981', secondary: '#34d399', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  { id: 'peach', name: 'Peach', primary: '#f97316', secondary: '#fb923c', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
  { id: 'apple', name: 'Apple', primary: '#22c55e', secondary: '#4ade80', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
];

const PATTERNS = [
  { id: 'none', name: 'Solid' },
  { id: 'confetti', name: 'Confetti' },
  { id: 'dots', name: 'Dots' },
  { id: 'lines', name: 'Lines' },
  { id: 'waves', name: 'Waves' },
  { id: 'circles', name: 'Circles' },
];

export function TransactionShareDialog({
  open,
  onOpenChange,
  transaction,
  userProfile,
}: TransactionShareDialogProps) {
  const [selectedTheme, setSelectedTheme] = useState(COLOR_THEMES[0]);
  const [selectedPattern, setSelectedPattern] = useState(PATTERNS[1]);
  const [showViralityLogo, setShowViralityLogo] = useState(true);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && transaction) {
      generateImage();
    }
  }, [open, transaction, selectedTheme, selectedPattern, showViralityLogo]);

  const generatePatternSvg = (theme: typeof COLOR_THEMES[0], pattern: typeof PATTERNS[0]) => {
    const patterns: Record<string, string> = {
      none: '',
      confetti: `
        <g opacity="0.3">
          ${Array.from({ length: 40 }, (_, i) => {
            const x = Math.random() * 800;
            const y = Math.random() * 500;
            const rotation = Math.random() * 360;
            const size = 8 + Math.random() * 12;
            const colors = [theme.primary, theme.secondary, '#a5b4fc', '#c4b5fd'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shapes = ['rect', 'circle'];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            if (shape === 'circle') {
              return `<circle cx="${x}" cy="${y}" r="${size/2}" fill="${color}" opacity="${0.4 + Math.random() * 0.4}"/>`;
            }
            return `<rect x="${x}" y="${y}" width="${size}" height="${size/3}" fill="${color}" transform="rotate(${rotation} ${x} ${y})" opacity="${0.4 + Math.random() * 0.4}"/>`;
          }).join('')}
        </g>
      `,
      dots: `
        <g opacity="0.15">
          ${Array.from({ length: 200 }, (_, i) => {
            const x = (i % 20) * 45 + 20;
            const y = Math.floor(i / 20) * 45 + 20;
            const size = 3 + Math.random() * 4;
            return `<circle cx="${x}" cy="${y}" r="${size}" fill="${theme.secondary}"/>`;
          }).join('')}
        </g>
      `,
      lines: `
        <g opacity="0.2">
          ${Array.from({ length: 25 }, (_, i) => {
            const x = i * 40;
            const height = 60 + Math.random() * 400;
            const y = 500 - height;
            return `<rect x="${x}" y="${y}" width="12" height="${height}" fill="${theme.secondary}" rx="6"/>`;
          }).join('')}
        </g>
      `,
      waves: `
        <g opacity="0.15">
          <path d="M0,250 Q200,200 400,250 T800,250 L800,500 L0,500 Z" fill="${theme.secondary}"/>
          <path d="M0,300 Q200,250 400,300 T800,300 L800,500 L0,500 Z" fill="${theme.primary}" opacity="0.5"/>
        </g>
      `,
      circles: `
        <g opacity="0.2">
          ${Array.from({ length: 15 }, (_, i) => {
            const x = Math.random() * 800;
            const y = Math.random() * 500;
            const r = 20 + Math.random() * 60;
            return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${theme.secondary}" stroke-width="2"/>`;
          }).join('')}
        </g>
      `,
    };
    return patterns[pattern.id] || '';
  };

  const generateImage = async () => {
    if (!transaction) return;
    setIsGenerating(true);

    try {
      // Load Virality logo
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = viralityGhostLogo;
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

      // Load user avatar if available
      let avatarBase64 = '';
      if (userProfile?.avatar_url) {
        try {
          const avatarImg = new Image();
          avatarImg.crossOrigin = "anonymous";
          avatarImg.src = userProfile.avatar_url;
          await new Promise((resolve) => {
            avatarImg.onload = resolve;
            avatarImg.onerror = () => resolve(null);
          });
          const avatarCanvas = document.createElement('canvas');
          avatarCanvas.width = avatarImg.width || 100;
          avatarCanvas.height = avatarImg.height || 100;
          const avatarCtx = avatarCanvas.getContext('2d');
          if (avatarCtx && avatarImg.width > 0) {
            avatarCtx.drawImage(avatarImg, 0, 0);
            avatarBase64 = avatarCanvas.toDataURL('image/png');
          }
        } catch (e) {
          console.log('Failed to load avatar:', e);
        }
      }

      const amountColor = transaction.type === 'earning' || transaction.type === 'boost_earning' || transaction.type === 'transfer_received' || transaction.type === 'referral' 
        ? '#10b981' 
        : transaction.type === 'balance_correction' 
          ? '#f97316' 
          : '#ef4444';

      const amountSign = transaction.type === 'earning' || transaction.type === 'boost_earning' || transaction.type === 'transfer_received' || transaction.type === 'referral' ? '+' : '';

      const programName = transaction.campaign?.title || transaction.boost?.title || transaction.campaign?.brand_name || transaction.boost?.brand_name || 'Virality';

      const svg = `
        <svg width="800" height="500" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${selectedTheme.primary}"/>
              <stop offset="100%" style="stop-color:${selectedTheme.secondary}"/>
            </linearGradient>
            <clipPath id="avatarClip">
              <circle cx="60" cy="440" r="24"/>
            </clipPath>
          </defs>
          
          <style>
            text { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          </style>
          
          <!-- Main background with gradient -->
          <rect width="800" height="500" fill="url(#bgGradient)" rx="24"/>
          
          <!-- Pattern overlay -->
          ${generatePatternSvg(selectedTheme, selectedPattern)}
          
          <!-- Virality Badge at top -->
          ${showViralityLogo ? `
            <rect x="320" y="20" width="160" height="44" fill="rgba(255,255,255,0.2)" rx="22"/>
            <image href="${logoBase64}" x="335" y="27" width="30" height="30"/>
            <text x="372" y="50" font-size="18" font-weight="600" fill="#fff">Virality</text>
          ` : ''}
          
          <!-- White card -->
          <rect x="60" y="85" width="680" height="300" fill="#fff" rx="20"/>
          
          <!-- Card content -->
          <text x="90" y="130" font-size="16" fill="#666" font-weight="500">${programName}</text>
          
          <!-- Amount -->
          <text x="90" y="200" font-size="56" font-weight="700" fill="${amountColor}">${amountSign}$${Math.abs(transaction.amount).toFixed(2)}</text>
          
          <!-- Secondary info -->
          <text x="90" y="240" font-size="16" fill="#999">${format(transaction.date, 'MMMM dd, yyyy')}</text>
          
          <!-- Status -->
          ${transaction.status === 'completed' ? `
            <rect x="90" y="260" width="100" height="28" fill="#10b98120" rx="14"/>
            <text x="140" y="280" font-size="14" font-weight="600" fill="#10b981" text-anchor="middle">Completed</text>
          ` : transaction.status === 'pending' ? `
            <rect x="90" y="260" width="90" height="28" fill="#f59e0b20" rx="14"/>
            <text x="135" y="280" font-size="14" font-weight="600" fill="#f59e0b" text-anchor="middle">Pending</text>
          ` : ''}
          
          <!-- Decorative line in card -->
          <rect x="90" y="310" width="600" height="2" fill="#f0f0f0" rx="1"/>
          
          <!-- Date range at bottom of card -->
          <text x="90" y="360" font-size="14" fill="#999">${format(transaction.date, 'MMM dd')}</text>
          <text x="690" y="360" font-size="14" fill="#999" text-anchor="end">Today</text>
          
          <!-- User profile at bottom -->
          ${avatarBase64 ? `
            <image href="${avatarBase64}" x="36" y="416" width="48" height="48" clip-path="url(#avatarClip)"/>
          ` : `
            <circle cx="60" cy="440" r="24" fill="rgba(255,255,255,0.3)"/>
          `}
          ${userProfile?.username ? `
            <text x="96" y="446" font-size="16" font-weight="600" fill="#fff">@${userProfile.username}</text>
          ` : ''}
          
          <!-- Powered by text -->
          <text x="700" y="475" font-size="12" fill="rgba(255,255,255,0.6)" text-anchor="end">Powered by Virality</text>
        </svg>
      `;

      // Convert SVG to blob
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });

      // Create canvas to convert to PNG
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const imageDataUrl = canvas.toDataURL('image/png');
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
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
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
    const tweetText = encodeURIComponent(`Just earned $${Math.abs(transaction?.amount || 0).toFixed(2)} on @viralityhq! 💰`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank', 'width=550,height=420');
    toast({
      title: "Share on X",
      description: "Attach the downloaded image to your post!"
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl font-inter">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-[-0.5px]">Share your stats</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-[1fr,280px] gap-6">
          {/* Preview */}
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-border bg-muted/30">
              {isGenerating ? (
                <div className="w-full aspect-[8/5] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : generatedImageUrl ? (
                <img src={generatedImageUrl} alt="Transaction" className="w-full h-auto" />
              ) : (
                <div className="w-full aspect-[8/5] flex items-center justify-center text-muted-foreground">
                  Generating preview...
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 gap-2" 
                onClick={handleCopyImage}
                disabled={!generatedImageUrl || isGenerating}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2" 
                onClick={handleDownload}
                disabled={!generatedImageUrl || isGenerating}
              >
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
              <div className="grid grid-cols-2 gap-2">
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                      selectedTheme.id === theme.id 
                        ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div 
                      className="w-5 h-5 rounded-full" 
                      style={{ background: theme.gradient }}
                    />
                    <span className="text-sm font-medium">{theme.name}</span>
                    {selectedTheme.id === theme.id && (
                      <Check className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Pattern */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Pattern</Label>
              <div className="grid grid-cols-3 gap-2">
                {PATTERNS.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => setSelectedPattern(pattern)}
                    className={cn(
                      "aspect-square rounded-lg border transition-all flex items-center justify-center text-xs font-medium",
                      selectedPattern.id === pattern.id 
                        ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        : "border-border hover:border-primary/50 bg-muted/30"
                    )}
                    style={{ 
                      background: pattern.id !== 'none' ? selectedTheme.primary : undefined,
                      opacity: pattern.id !== 'none' ? 0.8 : 1
                    }}
                  >
                    {pattern.id === 'none' && (
                      <span className="text-muted-foreground">{pattern.name}</span>
                    )}
                    {selectedPattern.id === pattern.id && pattern.id !== 'none' && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Toggle options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-logo" className="text-sm font-medium">Show Virality logo</Label>
                <Switch 
                  id="show-logo" 
                  checked={showViralityLogo} 
                  onCheckedChange={setShowViralityLogo}
                />
              </div>
            </div>
            
            {/* Share button */}
            <Button 
              className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90"
              onClick={handleShareOnX}
              disabled={!generatedImageUrl || isGenerating}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
