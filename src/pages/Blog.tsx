export default function Blog() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <a href="/" className="flex items-center gap-2">
                <img alt="Virality" className="h-6 w-6" src="/lovable-uploads/10d106e1-70c4-4d3f-ac13-dc683efa23b9.png" />
                <span className="text-lg font-clash font-semibold text-white">VIRALITY</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Embedded Content */}
      <div className="flex-1 pt-14">
        <iframe 
          src="https://join.virality.gg/blog" 
          className="w-full h-full border-0" 
          title="Virality Blog" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        />
      </div>
    </div>
  );
}
