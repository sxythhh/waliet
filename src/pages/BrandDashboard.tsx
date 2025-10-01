import { useParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

// Mock brand data - in real app, this would come from API
const getBrandData = (slug: string) => {
  const brands: Record<string, any> = {
    "parallel-labs": {
      name: "Parallel",
      logo: "https://via.placeholder.com/80",
      budget: 5000,
      spent: 0,
    },
    "techcorp": {
      name: "TechCorp",
      logo: "https://via.placeholder.com/80",
      budget: 10000,
      spent: 2500,
    },
    "designstudio": {
      name: "DesignStudio",
      logo: "https://via.placeholder.com/80",
      budget: 7500,
      spent: 1000,
    },
  };
  
  return brands[slug] || brands["parallel-labs"];
};

export default function BrandDashboard() {
  const { slug } = useParams();
  const brand = getBrandData(slug || "parallel-labs");
  const percentSpent = (brand.spent / brand.budget) * 100;

  return (
    <div className="min-h-screen p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-20 w-20 rounded-xl bg-white/5 flex items-center justify-center">
            <div className="h-16 w-16 rounded-lg bg-white/10" />
          </div>
          <h1 className="text-4xl font-bold text-white">{brand.name}</h1>
        </div>

        {/* Brand Card */}
        <div className="bg-[#202020] rounded-2xl p-6 max-w-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-xl bg-white/5 flex items-center justify-center relative">
              <div className="h-12 w-12 rounded-lg bg-white/10" />
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-white">{brand.name}</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">${brand.budget.toLocaleString()}</span>
              <span className="text-sm text-white/50">{percentSpent.toFixed(0)}%</span>
            </div>
            <Progress value={percentSpent} className="h-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
