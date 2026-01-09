import { Link, LinkProps } from 'react-router-dom';
import { forwardRef } from 'react';

interface InternalLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
  prefetch?: boolean;
}

/**
 * Enhanced internal link component for better SEO and UX
 * - Ensures proper internal linking structure
 * - Adds prefetch hints for faster navigation
 */
export const InternalLink = forwardRef<HTMLAnchorElement, InternalLinkProps>(
  ({ to, prefetch = false, children, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        to={to}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

InternalLink.displayName = 'InternalLink';

export default InternalLink;
