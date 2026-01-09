import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, PenTool, RotateCcw, Check, FileText, DollarSign, Calendar, Video } from "lucide-react";
import { format } from "date-fns";

interface Contract {
  id: string;
  title: string;
  creator_email: string;
  boost_id: string | null;
  boost_title?: string | null;
  monthly_rate: number;
  videos_per_month: number;
  start_date: string;
  end_date: string | null;
  custom_terms: string | null;
  status: string;
}

interface SignContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onSuccess?: () => void;
}

export function SignContractDialog({
  open,
  onOpenChange,
  contract,
  onSuccess
}: SignContractDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (open && canvasRef.current) {
      initCanvas();
    }
    // Reset states when dialog opens
    if (open) {
      setHasSignature(false);
      setAgreedToTerms(false);
    }
  }, [open]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Set drawing styles
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!contract || !hasSignature || !agreedToTerms) return;

    setSaving(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");

      // Convert signature to data URL
      const signatureDataUrl = canvas.toDataURL("image/png");

      // Upload signature to storage
      const signatureBlob = await fetch(signatureDataUrl).then(r => r.blob());
      const fileName = `signatures/${contract.id}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(fileName, signatureBlob, {
          contentType: "image/png",
          upsert: true
        });

      // Get public URL if upload succeeded, otherwise store data URL
      let signatureUrl = signatureDataUrl;
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("contracts")
          .getPublicUrl(fileName);
        signatureUrl = publicUrl;
      }

      // Update contract status
      const { error: updateError } = await supabase
        .from("creator_contracts")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          signature_url: signatureUrl
        })
        .eq("id", contract.id);

      if (updateError) throw updateError;

      toast.success("Contract signed successfully!");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error signing contract:", error);
      toast.error(error.message || "Failed to sign contract");
    } finally {
      setSaving(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 font-inter tracking-[-0.5px]">
            <FileText className="h-5 w-5 text-primary" />
            Sign Contract
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.5px]">
            Review the terms below and sign to accept
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 py-4">
            {/* Contract Summary */}
            <div className="p-4 bg-muted/30 rounded-xl space-y-3">
              <h3 className="font-semibold text-sm font-inter tracking-[-0.5px]">
                {contract.title}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <DollarSign className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Rate</p>
                    <p className="font-medium">${contract.monthly_rate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Video className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Videos/Month</p>
                    <p className="font-medium">{contract.videos_per_month}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Start Date</p>
                    <p className="font-medium">
                      {format(new Date(contract.start_date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="font-medium">
                      {contract.end_date
                        ? format(new Date(contract.end_date), "MMM d, yyyy")
                        : "Ongoing"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            {contract.custom_terms && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Terms & Conditions</Label>
                <div className="p-4 bg-muted/20 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                  {contract.custom_terms}
                </div>
              </div>
            )}

            {/* Signature Pad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Your Signature</Label>
                {hasSignature && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSignature}
                    className="h-7 text-xs gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
              <div className="border-2 border-dashed border-muted rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-[120px] cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              {!hasSignature && (
                <p className="text-xs text-muted-foreground text-center">
                  Draw your signature above using your mouse or touch
                </p>
              )}
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
              <Checkbox
                id="agree-terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                className="mt-0.5"
              />
              <Label
                htmlFor="agree-terms"
                className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
              >
                I have read and agree to the terms of this contract. I understand that
                this electronic signature is legally binding.
              </Label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-inter tracking-[-0.5px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={saving || !hasSignature || !agreedToTerms}
            className="font-inter tracking-[-0.5px] gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4" />
                Sign Contract
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
