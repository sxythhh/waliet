import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignatureCaptureProps {
  onSignatureChange: (signature: string | null, name: string) => void;
  defaultName?: string;
  disabled?: boolean;
}

export function SignatureCapture({
  onSignatureChange,
  defaultName = '',
  disabled = false
}: SignatureCaptureProps) {
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [typedName, setTypedName] = useState(defaultName);
  const [certified, setCertified] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
    onSignatureChange(null, '');
  };

  const handleCertifiedChange = (checked: boolean) => {
    setCertified(checked);

    if (checked) {
      if (mode === 'type' && typedName.trim()) {
        onSignatureChange(typedName.trim(), typedName.trim());
      } else if (mode === 'draw' && hasDrawnSignature) {
        const canvas = canvasRef.current;
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          onSignatureChange(dataUrl, typedName.trim() || 'Drawn Signature');
        }
      }
    } else {
      onSignatureChange(null, '');
    }
  };

  const handleNameChange = (name: string) => {
    setTypedName(name);
    if (certified && mode === 'type' && name.trim()) {
      onSignatureChange(name.trim(), name.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('type')}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
            mode === 'type' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Type
        </button>
        <button
          type="button"
          onClick={() => setMode('draw')}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
            mode === 'draw' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Draw
        </button>
      </div>

      {/* Type Mode */}
      {mode === 'type' && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Full legal name</Label>
            <Input
              placeholder="Type your name"
              value={typedName}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={disabled}
              className="h-10 mt-2"
            />
          </div>

          {typedName && (
            <div className="p-4 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <p
                className="text-xl text-foreground"
                style={{
                  fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
                  fontStyle: 'italic'
                }}
              >
                {typedName}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Draw Mode */}
      {mode === 'draw' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Sign below</Label>
            {hasDrawnSignature && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearCanvas}
                className="h-8 text-xs text-muted-foreground"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="border border-border rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-28 cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Print your name</Label>
            <Input
              placeholder="Your full legal name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              disabled={disabled}
              className="h-10 mt-2"
            />
          </div>
        </div>
      )}

      {/* Certification */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-start gap-3">
          <Checkbox
            id="certify"
            checked={certified}
            onCheckedChange={handleCertifiedChange}
            disabled={
              disabled ||
              (mode === 'type' && !typedName.trim()) ||
              (mode === 'draw' && (!hasDrawnSignature || !typedName.trim()))
            }
            className="mt-0.5"
          />
          <Label htmlFor="certify" className="text-sm leading-relaxed cursor-pointer">
            <span className="font-medium">Under penalties of perjury, I certify that:</span>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground text-xs">
              <li>The number shown on this form is my correct taxpayer identification number</li>
              <li>I am not subject to backup withholding</li>
              <li>The information provided on this form is true, correct, and complete</li>
            </ol>
          </Label>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Date: {currentDate}</span>
          {certified && (
            <span className="text-foreground font-medium">
              Signed electronically
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
