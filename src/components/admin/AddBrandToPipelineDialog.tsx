import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

interface Brand {
  id: string;
  name: string;
}

interface AddBrandToPipelineDialogProps {
  onSuccess: () => void;
}

export function AddBrandToPipelineDialog({ onSuccess }: AddBrandToPipelineDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchAvailableBrands();
    }
  }, [open]);

  const fetchAvailableBrands = async () => {
    try {
      // Get all brands
      const { data: allBrands, error: brandsError } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');

      if (brandsError) throw brandsError;

      // Get brands already in pipeline
      const { data: existingDeals, error: dealsError } = await supabase
        .from('sales_deals')
        .select('brand_id');

      if (dealsError) throw dealsError;

      const existingBrandIds = new Set(existingDeals?.map(d => d.brand_id) || []);
      const available = allBrands?.filter(b => !existingBrandIds.has(b.id)) || [];

      setAvailableBrands(available);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast.error('Failed to load brands');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrandId) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('sales_deals')
        .insert({
          brand_id: selectedBrandId,
          stage: 'lead',
        });

      if (error) throw error;

      toast.success('Brand added to pipeline');
      setOpen(false);
      setSelectedBrandId("");
      onSuccess();
    } catch (error) {
      console.error('Error adding brand:', error);
      toast.error('Failed to add brand to pipeline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Brand
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Brand to Pipeline</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Brand</Label>
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a brand..." />
              </SelectTrigger>
              <SelectContent>
                {availableBrands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableBrands.length === 0 && (
              <p className="text-sm text-muted-foreground">
                All brands are already in the pipeline
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedBrandId}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add to Pipeline
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
