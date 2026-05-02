/**
 * Showcase Gallery — full-screen carousel with high-quality images,
 * captions, zoom/pan/pinch and swipe navigation.
 */

interface ShowcaseItem {
  id: string;
  name: string;
  type?: string;
  constellation?: string;
  distance_ly?: number;
  description?: string;
  extended_description?: string;
  src: string;
}

class ShowcaseGallery {
  private items: ShowcaseItem[] = [];
  private currentIndex = 0;

  private root: HTMLElement | null = null;
  private image: HTMLImageElement | null = null;
  private imageContainer: HTMLElement | null = null;
  private spinner: HTMLElement | null = null;
  private prevBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;
  private zoomInBtn: HTMLButtonElement | null = null;
  private zoomOutBtn: HTMLButtonElement | null = null;
  private zoomResetBtn: HTMLButtonElement | null = null;
  private infoBtn: HTMLButtonElement | null = null;
  private title: HTMLElement | null = null;
  private metaType: HTMLElement | null = null;
  private metaConstellation: HTMLElement | null = null;
  private metaDistance: HTMLElement | null = null;
  private shortDesc: HTMLElement | null = null;
  private longDesc: HTMLElement | null = null;
  private counterCurrent: HTMLElement | null = null;
  private counterTotal: HTMLElement | null = null;

  private scale = 1;
  private readonly minScale = 1;
  private readonly maxScale = 6;
  private readonly zoomStep = 0.5;

  private isPanning = false;
  private startX = 0;
  private startY = 0;
  private translateX = 0;
  private translateY = 0;

  private touchStartX = 0;
  private touchStartY = 0;
  private initialDistance = 0;
  private lastScale = 1;

  private rafId: number | null = null;
  private hideControlsTimer: number | null = null;
  private controlsVisible = true;

  private readonly onKeyDown = (e: KeyboardEvent) => this.handleKeyboard(e);
  private readonly onMouseMove = (e: MouseEvent) => {
    this.handleMouseMove(e);
    this.bumpControls();
  };
  private readonly onMouseUp = () => this.handleMouseUp();
  private readonly onHashChange = () => this.syncFromHash();

  constructor(items: ShowcaseItem[], root: HTMLElement) {
    this.items = items;
    this.root = root;
    this.init();
  }

  private init() {
    if (!this.root || this.items.length === 0) return;

    this.image = this.root.querySelector('#showcase-image');
    this.imageContainer = this.root.querySelector('.showcase-image-container');
    this.spinner = this.root.querySelector('.showcase-spinner');
    this.prevBtn = this.root.querySelector('.showcase-prev');
    this.nextBtn = this.root.querySelector('.showcase-next');
    this.closeBtn = this.root.querySelector('.showcase-close');
    this.zoomInBtn = this.root.querySelector('.zoom-in');
    this.zoomOutBtn = this.root.querySelector('.zoom-out');
    this.zoomResetBtn = this.root.querySelector('.zoom-reset');
    this.infoBtn = this.root.querySelector('.showcase-info-btn');
    this.title = this.root.querySelector('.showcase-title');
    this.metaType = this.root.querySelector('.meta-type');
    this.metaConstellation = this.root.querySelector('.meta-constellation');
    this.metaDistance = this.root.querySelector('.meta-distance');
    this.shortDesc = this.root.querySelector('.showcase-short-desc');
    this.longDesc = this.root.querySelector('.showcase-long-desc');
    this.counterCurrent = this.root.querySelector('.counter-current');
    this.counterTotal = this.root.querySelector('.counter-total');

    if (this.counterTotal) this.counterTotal.textContent = String(this.items.length);

    this.syncFromHash();
    this.setupEventListeners();
    this.update();
    this.resetHideTimer();
  }

  private syncFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) {
      this.currentIndex = 0;
      return;
    }
    const idx = this.items.findIndex(i => i.id === hash);
    this.currentIndex = idx >= 0 ? idx : 0;
    this.resetZoomState();
    this.update();
  }

  private setupEventListeners() {
    this.prevBtn?.addEventListener('click', () => this.navigate(-1));
    this.nextBtn?.addEventListener('click', () => this.navigate(1));
    this.closeBtn?.addEventListener('click', () => this.exit());
    this.zoomInBtn?.addEventListener('click', () => this.zoom(this.zoomStep));
    this.zoomOutBtn?.addEventListener('click', () => this.zoom(-this.zoomStep));
    this.zoomResetBtn?.addEventListener('click', () => this.resetZoom());
    this.infoBtn?.addEventListener('click', () => this.toggleLongDesc());

    document.addEventListener('keydown', this.onKeyDown);

    this.imageContainer?.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);

    this.imageContainer?.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.imageContainer?.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.imageContainer?.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    this.imageContainer?.addEventListener('wheel', (e) => {
      this.handleWheel(e);
      this.bumpControls();
    }, { passive: false });

    this.image?.addEventListener('load', () => this.spinner?.classList.add('hidden'));
    this.image?.addEventListener('error', () => this.spinner?.classList.add('hidden'));

    window.addEventListener('hashchange', this.onHashChange);
  }

  private exit() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('hashchange', this.onHashChange);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.hideControlsTimer !== null) clearTimeout(this.hideControlsTimer);

    const base = document.querySelector('meta[name="base-url"]')?.getAttribute('content') ?? '/';
    window.location.href = base.endsWith('/') ? base : `${base}/`;
  }

  private navigate(direction: number) {
    const newIndex = this.currentIndex + direction;
    if (newIndex < 0 || newIndex >= this.items.length) return;
    this.currentIndex = newIndex;
    this.resetZoomState();
    this.update();
    this.bumpControls();
  }

  private update() {
    const item = this.items[this.currentIndex];
    if (!item || !this.image) return;

    this.spinner?.classList.remove('hidden');
    this.image.classList.remove('loaded');
    this.image.src = item.src;
    this.image.alt = item.name;
    this.image.addEventListener('load', () => this.image?.classList.add('loaded'), { once: true });

    if (this.title) this.title.textContent = item.name;

    this.setMeta(this.metaType, item.type);
    this.setMeta(this.metaConstellation, item.constellation);
    this.setMeta(this.metaDistance, item.distance_ly ? `${item.distance_ly.toLocaleString('uk-UA')} св.р.` : undefined);

    if (this.shortDesc) this.shortDesc.textContent = item.description ?? '';
    if (this.longDesc) {
      const parts = [item.description, item.extended_description].filter(Boolean);
      this.longDesc.textContent = parts.join('\n\n');
      this.longDesc.classList.remove('open');
    }
    this.infoBtn?.classList.remove('active');
    this.infoBtn?.setAttribute('aria-expanded', 'false');

    if (this.counterCurrent) this.counterCurrent.textContent = String(this.currentIndex + 1);
    if (this.prevBtn) this.prevBtn.disabled = this.currentIndex === 0;
    if (this.nextBtn) this.nextBtn.disabled = this.currentIndex === this.items.length - 1;

    const newHash = `#${item.id}`;
    if (window.location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }

    this.preloadNeighbors();
  }

  private setMeta(el: HTMLElement | null, value?: string) {
    if (!el) return;
    if (value) {
      el.textContent = value;
      el.style.display = '';
    } else {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  private preloadNeighbors() {
    [-1, 1].forEach(offset => {
      const idx = this.currentIndex + offset;
      const item = this.items[idx];
      if (item) {
        const img = new Image();
        img.src = item.src;
      }
    });
  }

  private toggleLongDesc() {
    if (!this.longDesc || !this.infoBtn) return;
    const isOpen = this.longDesc.classList.toggle('open');
    this.infoBtn.classList.toggle('active', isOpen);
    this.infoBtn.setAttribute('aria-expanded', String(isOpen));
  }

  private handleKeyboard(e: KeyboardEvent) {
    switch (e.key) {
      case 'Escape': this.exit(); break;
      case 'ArrowLeft': case 'a': case 'A': this.navigate(-1); break;
      case 'ArrowRight': case 'd': case 'D': this.navigate(1); break;
      case '+': case '=': this.zoom(this.zoomStep); break;
      case '-': case '_': this.zoom(-this.zoomStep); break;
      case '0': this.resetZoom(); break;
      case 'i': case 'I': this.toggleLongDesc(); break;
      case 'Home':
        if (this.currentIndex !== 0) {
          this.currentIndex = 0;
          this.resetZoomState();
          this.update();
        }
        break;
      case 'End':
        if (this.currentIndex !== this.items.length - 1) {
          this.currentIndex = this.items.length - 1;
          this.resetZoomState();
          this.update();
        }
        break;
    }
    this.bumpControls();
  }

  private zoom(delta: number) {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));
    this.scheduleTransform();
    if (this.scale > this.minScale) {
      this.image?.classList.add('zoomed');
      this.imageContainer?.classList.add('zoomed');
    } else {
      this.image?.classList.remove('zoomed');
      this.imageContainer?.classList.remove('zoomed');
      this.translateX = 0;
      this.translateY = 0;
    }
  }

  private resetZoom() {
    this.resetZoomState();
    this.scheduleTransform();
  }

  private resetZoomState() {
    this.scale = this.minScale;
    this.translateX = 0;
    this.translateY = 0;
    this.image?.classList.remove('zoomed');
    this.imageContainer?.classList.remove('zoomed');
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
    e.preventDefault();
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
    if (this.isPanning) {
      this.isPanning = false;
      this.imageContainer?.classList.remove('dragging');
    }
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      if (this.scale > this.minScale) {
        this.isPanning = true;
        this.startX = e.touches[0].clientX - this.translateX;
        this.startY = e.touches[0].clientY - this.translateY;
      }
    } else if (e.touches.length === 2) {
      e.preventDefault();
      this.isPanning = false;
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
        this.imageContainer?.classList.add('zoomed');
      } else {
        this.image?.classList.remove('zoomed');
        this.imageContainer?.classList.remove('zoomed');
      }
    } else if (e.touches.length === 1 && this.isPanning) {
      e.preventDefault();
      this.translateX = e.touches[0].clientX - this.startX;
      this.translateY = e.touches[0].clientY - this.startY;
      this.scheduleTransform();
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (e.changedTouches.length === 1 && e.touches.length === 0 && !this.isPanning && this.scale <= this.minScale) {
      const deltaX = e.changedTouches[0].clientX - this.touchStartX;
      const deltaY = e.changedTouches[0].clientY - this.touchStartY;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        this.navigate(deltaX > 0 ? -1 : 1);
      }
    }
    if (e.touches.length < 2) this.initialDistance = 0;
    if (e.touches.length === 0) this.isPanning = false;
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

  private bumpControls() {
    if (!this.controlsVisible) {
      this.controlsVisible = true;
      this.root?.classList.remove('controls-hidden');
    }
    this.resetHideTimer();
  }

  private resetHideTimer() {
    if (this.hideControlsTimer !== null) clearTimeout(this.hideControlsTimer);
    this.hideControlsTimer = window.setTimeout(() => {
      this.controlsVisible = false;
      this.root?.classList.add('controls-hidden');
    }, 3500);
  }
}

import galleryData from '../data/gallery.json';

const root = document.getElementById('showcase');
if (root) {
  const baseEl = document.querySelector('meta[name="base-url"]');
  const base = baseEl?.getAttribute('content') ?? '/astrophoto';

  const items: ShowcaseItem[] = (galleryData as any[])
    .filter(item => item?.preview)
    .map(item => ({
      id: item.object.id,
      name: item.object.name,
      type: item.object.type,
      constellation: item.object.constellation,
      distance_ly: item.object.distance_ly,
      description: item.object.description,
      extended_description: item.object.extended_description,
      src: `${base}/${item.preview.replace('_800', '_2000')}`.replace(/\/+/g, '/'),
    }));

  new ShowcaseGallery(items, root);
}
