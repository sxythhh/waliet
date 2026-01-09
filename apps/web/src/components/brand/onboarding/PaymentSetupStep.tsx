import { Button } from "@/components/ui/button";
import { CreditCard, ArrowRight, ExternalLink, CheckCircle } from "lucide-react";

interface PaymentSetupStepProps {
  whopConnected: boolean;
  onNext: () => void;
  onSkip: () => void;
}

export function PaymentSetupStep({
  whopConnected,
  onNext,
  onSkip,
}: PaymentSetupStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <CreditCard className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Payment Setup</h2>
        <p className="text-muted-foreground">
          Connect your payment method to launch campaigns
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {whopConnected ? (
          <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                Payment Connected
              </p>
              <p className="text-sm text-muted-foreground">
                Your Whop account is connected and ready
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-muted/50 rounded-lg text-center space-y-4">
            <div className="space-y-2">
              <p className="font-medium">Connect Whop to get started</p>
              <p className="text-sm text-muted-foreground">
                You'll need to connect your Whop account to pay creators and manage subscriptions
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-left p-3 bg-background rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  1
                </div>
                <span>Pay creators for completed campaigns</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-left p-3 bg-background rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  2
                </div>
                <span>Manage your subscription plan</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-left p-3 bg-background rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  3
                </div>
                <span>Track all payments in one place</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              You can set this up later from your brand settings
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 max-w-md mx-auto">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onNext}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
