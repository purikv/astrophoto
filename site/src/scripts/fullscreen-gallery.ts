/**
 * Fullscreen Gallery Script
 * Handles keyboard navigation, swipe gestures, zoom, and pan
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
  private prevBtn: HTMLElement | null = null;
  private nextBtn: HTMLElement | null = null;
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

  // Zoom state
  private scale: number = 1;
  private minScale: number = 1;
  private maxScale: number = 4;
  private zoomStep: number = 0.5;

  // Pan state
  private isPanning: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private translateX: number = 0;
  private translateY: number = 0;

  // Touch state
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private initialDistance: number = 0;
  private lastScale: number = 1;

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

    this.setupEventListeners();
    this.open();
  }

  private setupEventListeners() {
    // Navigation buttons
    this.prevBtn?.addEventListener('click', () => this.navigate(-1));
    this.nextBtn?.addEventListener('click', () => this.navigate(1));
    this.closeBtn?.addEventListener('click', () => this.close());

    // Zoom buttons
    this.zoomInBtn?.addEventListener('click', () => this.zoom(this.zoomStep));
    this.zoomOutBtn?.addEventListener('click', () => this.zoom(-this.zoomStep));
    this.zoomResetBtn?.addEventListener('click', () => this.resetZoom());

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Mouse events for pan
    this.imageContainer?.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', () => this.handleMouseUp());

    // Touch events for swipe and pinch
    this.imageContainer?.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.imageContainer?.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.imageContainer?.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    // Mouse wheel zoom
    this.imageContainer?.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    // Click background to close
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
  }

  public close() {
    this.container?.classList.remove('active');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', (e) => this.handleKeyboard(e));
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

    // Update image
    const imagePath = `${this.base}/${item.preview}`.replace(/\/+/g, '/');
    this.image.src = imagePath;
    this.image.alt = item.object.name;

    // Update info
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

    // Update counter
    if (this.counterCurrent) {
      this.counterCurrent.textContent = String(this.currentIndex + 1);
    }

    // Update navigation buttons state
    if (this.prevBtn) {
      this.prevBtn.toggleAttribute('disabled', this.currentIndex === 0);
    }
    if (this.nextBtn) {
      this.nextBtn.toggleAttribute('disabled', this.currentIndex === this.items.length - 1);
    }
  }

  private preloadNeighbors() {
    // Preload previous and next images
    [-1, 1].forEach(offset => {
      const index = this.currentIndex + offset;
      if (index >= 0 && index < this.items.length) {
        const item = this.items[index];
        const img = new Image();
        img.src = `${this.base}/${item.preview}`.replace(/\/+/g, '/');
      }
    });
  }

  private handleKeyboard(e: KeyboardEvent) {
    if (!this.container?.classList.contains('active')) return;

    switch (e.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.navigate(-1);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.navigate(1);
        break;
      case '+':
      case '=':
        this.zoom(this.zoomStep);
        break;
      case '-':
      case '_':
        this.zoom(-this.zoomStep);
        break;
      case '0':
        this.resetZoom();
        break;
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
    }
  }

  private zoom(delta: number) {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));
    this.applyTransform();

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
    this.applyTransform();
    this.image?.classList.remove('zoomed');
  }

  private applyTransform() {
    if (!this.image) return;
    this.image.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  // Mouse pan
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
    this.applyTransform();
  }

  private handleMouseUp() {
    this.isPanning = false;
    this.imageContainer?.classList.remove('dragging');
  }

  // Touch gestures
  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      // Single touch - prepare for swipe
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Two touches - prepare for pinch zoom
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.initialDistance = this.getDistance(touch1, touch2);
      this.lastScale = this.scale;
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = this.getDistance(touch1, touch2);
      const scaleDelta = (distance / this.initialDistance) - 1;
      this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.lastScale + scaleDelta));
      this.applyTransform();

      if (this.scale > this.minScale) {
        this.image?.classList.add('zoomed');
      } else {
        this.image?.classList.remove('zoomed');
      }
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (e.changedTouches.length === 1 && e.touches.length === 0) {
      // Single touch ended - check for swipe
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - this.touchStartX;
      const deltaY = touchEndY - this.touchStartY;

      // Only swipe if not zoomed and horizontal swipe is dominant
      if (this.scale <= this.minScale && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          this.navigate(-1); // Swipe right = previous
        } else {
          this.navigate(1); // Swipe left = next
        }
      }
    }

    // Reset pinch state
    if (e.touches.length < 2) {
      this.initialDistance = 0;
    }
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
    this.zoom(delta);
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// Export for use in pages
export function openFullscreenGallery(items: GalleryItem[], initialIndex: number, base: string) {
  new FullscreenGallery(items, initialIndex, base);
}

export { FullscreenGallery };
