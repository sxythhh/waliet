import { useParams } from "react-router-dom";

export default function BrandAccount() {
  const { slug } = useParams();

  return (
    <div className="min-h-screen p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Account Settings</h1>
        <div className="text-white/60">
          Account settings for {slug}
        </div>
      </div>
    </div>
  );
}
