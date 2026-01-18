/**
 * Scroll Animations
 * Reveal elements on scroll with Intersection Observer
 */

interface AnimationConfig {
  threshold: number;
  rootMargin: string;
  animationClass: string;
}

const defaultConfig: AnimationConfig = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px',
  animationClass: 'animate-reveal'
};

class ScrollAnimations {
  private observer: IntersectionObserver | null = null;
  private config: AnimationConfig;

  constructor(config: Partial<AnimationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.init();
  }

  private init() {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return; // Don't animate if user prefers reduced motion
    }

    // Create Intersection Observer
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        threshold: this.config.threshold,
        rootMargin: this.config.rootMargin
      }
    );

    // Observe all elements with data-animate attribute
    this.observeElements();

    // Re-observe on dynamic content changes
    this.setupMutationObserver();
  }

  private observeElements() {
    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach((element) => {
      this.observer?.observe(element);
    });
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const element = entry.target as HTMLElement;
        const animationType = element.dataset.animate || 'fade-in';
        const delay = element.dataset.animateDelay || '0';

        // Apply animation with delay
        setTimeout(() => {
          element.classList.add(this.config.animationClass);
          element.classList.add(`animate-${animationType}`);
          element.style.opacity = '1';
          element.style.transform = 'none';
        }, parseInt(delay));

        // Unobserve after animation
        this.observer?.unobserve(element);
      }
    });
  }

  private setupMutationObserver() {
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.hasAttribute('data-animate')) {
            this.observer?.observe(node);
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  public destroy() {
    this.observer?.disconnect();
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ScrollAnimations());
} else {
  new ScrollAnimations();
}

export { ScrollAnimations };
