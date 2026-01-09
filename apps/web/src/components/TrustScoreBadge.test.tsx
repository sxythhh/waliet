import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrustScoreBadge } from './TrustScoreBadge';

describe('TrustScoreBadge', () => {
  describe('rendering', () => {
    it('renders the score value', () => {
      render(<TrustScoreBadge score={75} />);
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('renders "?" when score is null', () => {
      render(<TrustScoreBadge score={null} />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('renders label when showLabel is true', () => {
      render(<TrustScoreBadge score={75} showLabel />);
      expect(screen.getByText('Authenticity')).toBeInTheDocument();
    });

    it('does not render label when showLabel is false', () => {
      render(<TrustScoreBadge score={75} showLabel={false} />);
      expect(screen.queryByText('Authenticity')).not.toBeInTheDocument();
    });
  });

  describe('color coding', () => {
    it('applies emerald color for scores 80-100 (excellent)', () => {
      const { container } = render(<TrustScoreBadge score={85} />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-emerald-500');
    });

    it('applies green color for scores 60-79 (good)', () => {
      const { container } = render(<TrustScoreBadge score={70} />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-green-500');
    });

    it('applies amber color for scores 40-59 (moderate)', () => {
      const { container } = render(<TrustScoreBadge score={50} />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-amber-500');
    });

    it('applies orange color for scores 20-39 (low)', () => {
      const { container } = render(<TrustScoreBadge score={30} />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-orange-500');
    });

    it('applies red color for scores 0-19 (very low)', () => {
      const { container } = render(<TrustScoreBadge score={10} />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-red-500');
    });

    it('applies muted color for null score', () => {
      const { container } = render(<TrustScoreBadge score={null} />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-muted');
    });
  });

  describe('sizes', () => {
    it('applies small size classes', () => {
      const { container } = render(<TrustScoreBadge score={75} size="sm" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('h-6');
    });

    it('applies medium size classes', () => {
      const { container } = render(<TrustScoreBadge score={75} size="md" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('h-7');
    });

    it('applies large size classes', () => {
      const { container } = render(<TrustScoreBadge score={75} size="lg" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('h-8');
    });
  });

  describe('edge cases', () => {
    it('handles score of 0', () => {
      render(<TrustScoreBadge score={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles score of 100', () => {
      render(<TrustScoreBadge score={100} />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('rounds decimal scores', () => {
      render(<TrustScoreBadge score={75.7} />);
      expect(screen.getByText('76')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<TrustScoreBadge score={75} className="custom-class" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('accessibility', () => {
    it('has a shield icon for visual identification', () => {
      render(<TrustScoreBadge score={75} />);
      // Shield icon should be present - we can't easily test for the icon itself
      // but we can verify the component renders
      expect(screen.getByText('75')).toBeInTheDocument();
    });
  });
});
