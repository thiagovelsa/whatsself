import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  threshold?: number; // Scroll threshold in pixels (default: 500)
}

export default function ScrollToTop({ threshold = 500 }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-brand-border/60 bg-brand-surfaceElevated/90 text-brand-primary shadow-lg backdrop-blur transition-all hover:border-brand-primary/60 hover:bg-brand-primary/10 hover:scale-110"
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

