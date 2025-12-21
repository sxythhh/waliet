import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>App Installed!</CardTitle>
            <CardDescription>
              Virality is installed on your device. You can access it from your home screen.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Install Virality</CardTitle>
          <CardDescription>
            Get the full app experience on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
          ) : isIOS ? (
            <div className="text-center space-y-3 text-sm text-muted-foreground">
              <p>To install on iOS:</p>
              <ol className="text-left space-y-2 pl-4">
                <li>1. Tap the <strong>Share</strong> button in Safari</li>
                <li>2. Scroll down and tap <strong>Add to Home Screen</strong></li>
                <li>3. Tap <strong>Add</strong> to confirm</li>
              </ol>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <p>Open this page in Chrome or Safari to install the app.</p>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <h4 className="font-medium text-sm">Benefits of installing:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Works offline</li>
              <li>• Faster loading</li>
              <li>• Full-screen experience</li>
              <li>• Quick access from home screen</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
