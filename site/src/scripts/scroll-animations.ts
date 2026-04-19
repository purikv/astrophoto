/**
 * Scroll Animations — reveal elements via IntersectionObserver.
 * Disconnects observers on pagehide to prevent leaks across navigations.
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
  private mutationObserver: MutationObserver | null = null;
  private pendingTimers: Set<number> = new Set();
  private config: AnimationConfig;

  constructor(config: Partial<AnimationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.init();
  }

  private init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Show elements without animation so layout isn't stuck invisible.
      document.querySelectorAll<HTMLElement>('[data-animate]').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      { threshold: this.config.threshold, rootMargin: this.config.rootMargin }
    );

    this.observeElements();
    this.setupMutationObserver();
    window.addEventListener('pagehide', () => this.destroy(), { once: true });
  }

  private observeElements() {
    document.querySelectorAll('[data-animate]').forEach(el => this.observer?.observe(el));
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target as HTMLElement;
      const animationType = element.dataset.animate || 'fade-in';
      const delayRaw = element.dataset.animateDelay;
      const delay = delayRaw ? Number(delayRaw) : 0;
      const safeDelay = Number.isFinite(delay) && delay >= 0 ? delay : 0;

      const timerId = window.setTimeout(() => {
        this.pendingTimers.delete(timerId);
        element.classList.add(this.config.animationClass, `animate-${animationType}`);
        element.style.opacity = '1';
        element.style.transform = 'none';
      }, safeDelay);
      this.pendingTimers.add(timerId);

      this.observer?.unobserve(element);
    });
  }

  private setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement && node.hasAttribute('data-animate')) {
            this.observer?.observe(node);
          }
        });
      });
    });
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  public destroy() {
    this.observer?.disconnect();
    this.mutationObserver?.disconnect();
    this.pendingTimers.forEach(id => window.clearTimeout(id));
    this.pendingTimers.clear();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ScrollAnimations());
} else {
  new ScrollAnimations();
}

export { ScrollAnimations };
