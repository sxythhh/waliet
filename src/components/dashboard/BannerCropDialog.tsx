import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";


interface BannerCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onApply: (cropData: { zoom: number; positionX: number; positionY: number }) => void;
}

export function BannerCropDialog({
  open,
  onOpenChange,
  imageUrl,
  onApply,
}: BannerCropDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 50, posY: 50 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    // Convert pixel movement to percentage (inverted for natural drag feel)
    const sensitivity = 0.2;
    const newX = Math.max(0, Math.min(100, dragStartRef.current.posX - deltaX * sensitivity));
    const newY = Math.max(0, Math.min(100, dragStartRef.current.posY - deltaY * sensitivity));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleApply = () => {
    onApply({ zoom, positionX: position.x, positionY: position.y });
    onOpenChange(false);
  };

  const handleCancel = () => {
    setZoom(1);
    setPosition({ x: 50, y: 50 });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Crop Cover Photo</DialogTitle>
          <DialogDescription className="text-muted-foreground pb-2">
            Adjust the position and zoom of your cover photo
          </DialogDescription>
        </DialogHeader>

        {/* Crop Area */}
        <div 
          ref={containerRef}
          className="relative w-full aspect-[3/1] bg-background rounded-lg overflow-hidden cursor-move select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Image */}
          <div
            className="absolute inset-0 transition-transform duration-75"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: `${100 * zoom}%`,
              backgroundPosition: `${position.x}% ${position.y}%`,
              backgroundRepeat: 'no-repeat',
            }}
          />
          
          {/* Grid Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Vertical lines */}
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
            {/* Horizontal lines */}
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
          </div>
        </div>

        {/* Zoom Control */}
        <div className="pt-2">
          <Slider
            value={[zoom]}
            onValueChange={([value]) => setZoom(value)}
            min={1}
            max={3}
            step={0.1}
            className="w-full [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-white"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={handleCancel}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="px-6 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
