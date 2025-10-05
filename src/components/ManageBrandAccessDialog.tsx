import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Unlock, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Course {
  id: string;
  title: string;
  description: string | null;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface BrandAccess {
  brand_id: string;
  course_id: string;
  has_access: boolean;
}

interface ManageBrandAccessDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ManageBrandAccessDialog({ open: controlledOpen, onOpenChange }: ManageBrandAccessDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandAccess, setBrandAccess] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("order_index", { ascending: true });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Fetch brands (only DWY brands)
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("id, name, slug")
        .eq("slug", "dwy")
        .order("name", { ascending: true });

      if (brandsError) throw brandsError;
      setBrands(brandsData || []);

      // Fetch existing access records
      const { data: accessData, error: accessError } = await supabase
        .from("brand_course_access")
        .select("*");

      if (accessError) throw accessError;

      // Build access map: brandId -> courseId -> hasAccess
      const accessMap: Record<string, Record<string, boolean>> = {};
      brandsData?.forEach(brand => {
        accessMap[brand.id] = {};
        coursesData?.forEach(course => {
          // Default to true (unlocked) if no explicit record exists
          const accessRecord = accessData?.find(
            a => a.brand_id === brand.id && a.course_id === course.id
          );
          accessMap[brand.id][course.id] = accessRecord?.has_access ?? true;
        });
      });

      setBrandAccess(accessMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load brand access data");
    } finally {
      setLoading(false);
    }
  };

  const toggleAccess = async (brandId: string, courseId: string, currentAccess: boolean) => {
    try {
      const newAccess = !currentAccess;

      // Check if record exists
      const { data: existing } = await supabase
        .from("brand_course_access")
        .select("id")
        .eq("brand_id", brandId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("brand_course_access")
          .update({ has_access: newAccess })
          .eq("brand_id", brandId)
          .eq("course_id", courseId);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("brand_course_access")
          .insert({ brand_id: brandId, course_id: courseId, has_access: newAccess });

        if (error) throw error;
      }

      // Update local state
      setBrandAccess(prev => ({
        ...prev,
        [brandId]: {
          ...prev[brandId],
          [courseId]: newAccess
        }
      }));

      toast.success(newAccess ? "Course unlocked" : "Course locked");
    } catch (error) {
      console.error("Error updating access:", error);
      toast.error("Failed to update access");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/10 bg-[#191919] hover:bg-white/5">
          <Shield className="h-4 w-4 mr-2" />
          Manage Brand Access
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#202020] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Manage Brand Course Access</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-white/60 text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-6">
            {courses.map(course => (
              <Card key={course.id} className="bg-[#191919] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">{course.title}</CardTitle>
                  {course.description && (
                    <p className="text-white/60 text-sm">{course.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {brands.map(brand => {
                    const hasAccess = brandAccess[brand.id]?.[course.id] ?? true;
                    return (
                      <div
                        key={brand.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#202020] border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          {hasAccess ? (
                            <Unlock className="h-4 w-4 text-green-500" />
                          ) : (
                            <Lock className="h-4 w-4 text-red-500" />
                          )}
                          <Label className="text-white font-medium cursor-pointer">
                            {brand.name}
                          </Label>
                        </div>
                        <Switch
                          checked={hasAccess}
                          onCheckedChange={() => toggleAccess(brand.id, course.id, hasAccess)}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
