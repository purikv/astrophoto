/**
 * Fullscreen Gallery Script
 * Keyboard navigation, swipe, zoom, pan — with proper listener cleanup and rAF-throttled transforms.
 */

interface GalleryItem {
  object: {
    id: string;
    name: string;
    type?: string;
    constellation?: string;
    distance_ly?: number;
  };
  preview: string;
}

class FullscreenGallery {
  private container: HTMLElement | null = null;
  private image: HTMLImageElement | null = null;
  private imageContainer: HTMLElement | null = null;
  private prevBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private closeBtn: HTMLElement | null = null;
  private zoomInBtn: HTMLElement | null = null;
  private zoomOutBtn: HTMLElement | null = null;
  private zoomResetBtn: HTMLElement | null = null;
  private counterCurrent: HTMLElement | null = null;
  private title: HTMLElement | null = null;
  private metaType: HTMLElement | null = null;
  private metaConstellation: HTMLElement | null = null;
  private metaDistance: HTMLElement | null = null;

  private items: GalleryItem[] = [];
  private currentIndex: number = 0;
  private base: string = '';

  private scale: number = 1;
  private readonly minScale: number = 1;
  private readonly maxScale: number = 4;
  private readonly zoomStep: number = 0.5;

  private isPanning: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private translateX: number = 0;
  private translateY: number = 0;

  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private initialDistance: number = 0;
  private lastScale: number = 1;

  private rafId: number | null = null;
  private previouslyFocused: HTMLElement | null = null;

  // Bound handlers — stable references for add/remove
  private readonly onKeyDown = (e: KeyboardEvent) => this.handleKeyboard(e);
  private readonly onMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
  private readonly onMouseUp = () => this.handleMouseUp();

  constructor(items: GalleryItem[], initialIndex: number, base: string) {
    this.items = items;
    this.currentIndex = initialIndex;
    this.base = base;
    this.init();
  }

  private init() {
    this.container = document.getElementById('fullscreen-gallery');
    if (!this.container) return;

    this.image = document.getElementById('fullscreen-image') as HTMLImageElement;
    this.imageContainer = this.container.querySelector('.fullscreen-image-container');
    this.prevBtn = this.container.querySelector('.fullscreen-prev');
    this.nextBtn = this.container.querySelector('.fullscreen-next');
    this.closeBtn = this.container.querySelector('.fullscreen-close');
    this.zoomInBtn = this.container.querySelector('.zoom-in');
    this.zoomOutBtn = this.container.querySelector('.zoom-out');
    this.zoomResetBtn = this.container.querySelector('.zoom-reset');
    this.counterCurrent = this.container.querySelector('.counter-current');
    this.title = this.container.querySelector('.fullscreen-title');
    this.metaType = this.container.querySelector('.meta-item.type');
    this.metaConstellation = this.container.querySelector('.meta-item.constellation');
    this.metaDistance = this.container.querySelector('.meta-item.distance');

    this.previouslyFocused = document.activeElement as HTMLElement;
    this.setupEventListeners();
    this.open();
  }

  private setupEventListeners() {
    this.prevBtn?.addEventListener('click', () => this.navigate(-1));
    this.nextBtn?.addEventListener('click', () => this.navigate(1));
    this.closeBtn?.addEventListener('click', () => this.close());

    this.zoomInBtn?.addEventListener('click', () => this.zoom(this.zoomStep));
    this.zoomOutBtn?.addEventListener('click', () => this.zoom(-this.zoomStep));
    this.zoomResetBtn?.addEventListener('click', () => this.resetZoom());

    document.addEventListener('keydown', this.onKeyDown);

    this.imageContainer?.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);

    this.imageContainer?.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.imageContainer?.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.imageContainer?.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    this.imageContainer?.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    this.container?.addEventListener('click', (e) => {
      if (e.target === this.container || e.target === this.imageContainer) {
        this.close();
      }
    });
  }

  private open() {
    this.container?.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.updateImage();
    this.preloadNeighbors();
    this.closeBtn?.focus();
  }

  public close() {
    this.container?.classList.remove('active');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.previouslyFocused?.focus?.();
  }

  private navigate(direction: number) {
    const newIndex = this.currentIndex + direction;
    if (newIndex < 0 || newIndex >= this.items.length) return;

    this.currentIndex = newIndex;
    this.resetZoom();
    this.updateImage();
    this.preloadNeighbors();
  }

  private updateImage() {
    const item = this.items[this.currentIndex];
    if (!item || !this.image) return;

    const imagePath = `${this.base}/${item.preview}`.replace(/\/+/g, '/');
    this.image.src = imagePath;
    this.image.alt = item.object.name;

    if (this.title) this.title.textContent = item.object.name;
    if (this.metaType) {
      this.metaType.textContent = item.object.type || '';
      this.metaType.style.display = item.object.type ? 'block' : 'none';
    }
    if (this.metaConstellation) {
      this.metaConstellation.textContent = item.object.constellation || '';
      this.metaConstellation.style.display = item.object.constellation ? 'block' : 'none';
    }
    if (this.metaDistance) {
      const distance = item.object.distance_ly;
      this.metaDistance.textContent = distance ? `${distance.toLocaleString('uk-UA')} св.р.` : '';
      this.metaDistance.style.display = distance ? 'block' : 'none';
    }

    if (this.counterCurrent) {
      this.counterCurrent.textContent = `${this.currentIndex + 1}`;
    }

    if (this.prevBtn) this.prevBtn.disabled = this.currentIndex === 0;
    if (this.nextBtn) this.nextBtn.disabled = this.currentIndex === this.items.length - 1;
  }

  private preloadNeighbors() {
    [-1, 1].forEach(offset => {
      const index = this.currentIndex + offset;
      if (index >= 0 && index < this.items.length) {
        const img = new Image();
        img.src = `${this.base}/${this.items[index].preview}`.replace(/\/+/g, '/');
      }
    });
  }

  private handleKeyboard(e: KeyboardEvent) {
    if (!this.container?.classList.contains('active')) return;

    switch (e.key) {
      case 'Escape': this.close(); break;
      case 'ArrowLeft': case 'a': case 'A': this.navigate(-1); break;
      case 'ArrowRight': case 'd': case 'D': this.navigate(1); break;
      case '+': case '=': this.zoom(this.zoomStep); break;
      case '-': case '_': this.zoom(-this.zoomStep); break;
      case '0': this.resetZoom(); break;
      case 'Home':
        this.currentIndex = 0;
        this.resetZoom();
        this.updateImage();
        this.preloadNeighbors();
        break;
      case 'End':
        this.currentIndex = this.items.length - 1;
        this.resetZoom();
        this.updateImage();
        this.preloadNeighbors();
        break;
      case 'Tab':
        this.trapFocus(e);
        break;
    }
  }

  private trapFocus(e: KeyboardEvent) {
    if (!this.container) return;
    const focusable = this.container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  private zoom(delta: number) {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));
    this.scheduleTransform();

    if (this.scale > this.minScale) {
      this.image?.classList.add('zoomed');
    } else {
      this.image?.classList.remove('zoomed');
      this.translateX = 0;
      this.translateY = 0;
    }
  }

  private resetZoom() {
    this.scale = this.minScale;
    this.translateX = 0;
    this.translateY = 0;
    this.scheduleTransform();
    this.image?.classList.remove('zoomed');
  }

  private scheduleTransform() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.image) return;
      this.image.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    });
  }

  private handleMouseDown(e: MouseEvent) {
    if (this.scale <= this.minScale) return;
    this.isPanning = true;
    this.startX = e.clientX - this.translateX;
    this.startY = e.clientY - this.translateY;
    this.imageContainer?.classList.add('dragging');
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isPanning) return;
    e.preventDefault();
    this.translateX = e.clientX - this.startX;
    this.translateY = e.clientY - this.startY;
    this.scheduleTransform();
  }

  private handleMouseUp() {
    this.isPanning = false;
    this.imageContainer?.classList.remove('dragging');
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      e.preventDefault();
      this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.lastScale = this.scale;
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = this.getDistance(e.touches[0], e.touches[1]);
      const scaleDelta = (distance / this.initialDistance) - 1;
      this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.lastScale + scaleDelta));
      this.scheduleTransform();

      if (this.scale > this.minScale) {
        this.image?.classList.add('zoomed');
      } else {
        this.image?.classList.remove('zoomed');
      }
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (e.changedTouches.length === 1 && e.touches.length === 0) {
      const deltaX = e.changedTouches[0].clientX - this.touchStartX;
      const deltaY = e.changedTouches[0].clientY - this.touchStartY;

      if (this.scale <= this.minScale && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        this.navigate(deltaX > 0 ? -1 : 1);
      }
    }
    if (e.touches.length < 2) this.initialDistance = 0;
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    this.zoom(e.deltaY > 0 ? -this.zoomStep : this.zoomStep);
  }

  private getDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export function openFullscreenGallery(items: GalleryItem[], initialIndex: number, base: string) {
  new FullscreenGallery(items, initialIndex, base);
}

export { FullscreenGallery };
