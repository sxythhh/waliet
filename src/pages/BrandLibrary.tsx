import { useParams } from "react-router-dom";

export default function BrandLibrary() {
  const { slug } = useParams();

  return (
    <div className="min-h-screen p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Library</h1>
        <div className="text-white/60">
          Library content for {slug}
        </div>
      </div>
    </div>
  );
}
