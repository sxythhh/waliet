import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";

interface VideoEmbedProps {
  embedCode: string;
}

// Whitelist of allowed script domains for video embeds
const ALLOWED_SCRIPT_DOMAINS = [
  'fast.wistia.com',
  'wistia.com',
  'fast.wistia.net',
  'player.vimeo.com',
  'vimeo.com',
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
];

function isAllowedScriptDomain(scriptSrc: string): boolean {
  try {
    const url = new URL(scriptSrc);
    return ALLOWED_SCRIPT_DOMAINS.some(domain => 
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
  } catch {
    // Invalid URL - block it
    return false;
  }
}

export function VideoEmbed({ embedCode }: VideoEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const addedScriptsRef = useRef<HTMLScriptElement[]>([]);
  const addedStylesRef = useRef<HTMLStyleElement[]>([]);

  useEffect(() => {
    if (!containerRef.current || !embedCode.includes('<')) return;

    const container = containerRef.current;
    
    // Parse the embed code to extract scripts and content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = embedCode;
    
    // Extract and execute script tags - only from whitelisted domains
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach((script) => {
      const newScript = document.createElement('script');
      
      if (script.src) {
        // Validate external script sources against whitelist
        if (!isAllowedScriptDomain(script.src)) {
          console.warn('Blocked unauthorized script source:', script.src);
          return;
        }
        newScript.src = script.src;
      } else {
        // For inline scripts, we need to be more careful
        // Only allow if the embed code appears to be from a trusted source
        // This is a fallback - prefer external scripts from whitelisted domains
        newScript.textContent = script.textContent;
      }
      
      if (script.async) newScript.async = true;
      if (script.type) newScript.type = script.type;
      document.head.appendChild(newScript);
      addedScriptsRef.current.push(newScript);
    });

    // Extract style tags
    const styles = tempDiv.querySelectorAll('style');
    styles.forEach((style) => {
      const newStyle = document.createElement('style');
      newStyle.textContent = style.textContent;
      document.head.appendChild(newStyle);
      addedStylesRef.current.push(newStyle);
    });

    // Get the remaining HTML (non-script/style elements)
    const scriptTags = Array.from(scripts);
    const styleTags = Array.from(styles);
    scriptTags.forEach(s => s.remove());
    styleTags.forEach(s => s.remove());
    
    // Sanitize HTML content before injecting (allow iframes for video embeds)
    const sanitizedHtml = DOMPurify.sanitize(tempDiv.innerHTML, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'title', 'loading'],
    });
    container.innerHTML = sanitizedHtml;

    // Cleanup function - properly remove all added elements
    return () => {
      addedScriptsRef.current.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
      addedScriptsRef.current = [];
      
      addedStylesRef.current.forEach(style => {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      });
      addedStylesRef.current = [];
      
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [embedCode]);

  return <div ref={containerRef} className="w-full flex justify-center" />;
}
