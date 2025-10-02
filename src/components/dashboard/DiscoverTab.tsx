export function DiscoverTab() {
  return (
    <div className="h-[calc(100vh-16rem)] w-full">
      <iframe
        src="https://www.virality.cc/discover"
        className="w-full h-full border-0 rounded-lg"
        title="Discover Campaigns"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
