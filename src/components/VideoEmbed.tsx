import { useEffect, useRef } from "react";

interface VideoEmbedProps {
  embedCode: string;
}

export function VideoEmbed({ embedCode }: VideoEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !embedCode.includes('<')) return;

    const container = containerRef.current;
    
    // Parse the embed code to extract scripts and content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = embedCode;
    
    // Extract and execute script tags
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach((script) => {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }
      if (script.async) newScript.async = true;
      if (script.type) newScript.type = script.type;
      document.head.appendChild(newScript);
    });

    // Extract style tags
    const styles = tempDiv.querySelectorAll('style');
    styles.forEach((style) => {
      const newStyle = document.createElement('style');
      newStyle.textContent = style.textContent;
      document.head.appendChild(newStyle);
    });

    // Get the remaining HTML (non-script/style elements)
    const scriptTags = Array.from(scripts);
    const styleTags = Array.from(styles);
    scriptTags.forEach(s => s.remove());
    styleTags.forEach(s => s.remove());
    
    container.innerHTML = tempDiv.innerHTML;

    // Cleanup function
    return () => {
      // Remove added scripts and styles on unmount
      scripts.forEach((script) => {
        const addedScripts = document.head.querySelectorAll(`script[src="${script.src}"]`);
        addedScripts.forEach(s => s.remove());
      });
    };
  }, [embedCode]);

  return <div ref={containerRef} className="w-full flex justify-center" />;
}
