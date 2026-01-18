/**
 * Single Image Fullscreen Viewer
 * Simple viewer for viewing one high-quality image in fullscreen
 */

class SingleImageViewer {
  private container: HTMLElement | null = null;
  private image: HTMLImageElement | null = null;
  private imageContainer: HTMLElement | null = null;
  private closeBtn: HTMLElement | null = null;
  private zoomInBtn: HTMLElement | null = null;
  private zoomOutBtn: HTMLElement | null = null;
  private zoomResetBtn: HTMLElement | null = null;

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
  private initialDistance: number = 0;
  private lastScale: number = 1;

  // Auto-hide controls
  private hideControlsTimer: number | null = null;
  private controlsVisible: boolean = true;

  constructor(private imageSrc: string, private imageAlt: string) {
    this.createViewer();
    this.init();
  }

  private createViewer() {
    // Create fullscreen container with premium styling
    const container = document.createElement('div');
    container.id = 'single-image-viewer';
    container.className = 'single-viewer';

    // Add styles
    this.injectStyles();

    container.innerHTML = `
      <div class="single-viewer-backdrop"></div>
      <div class="single-viewer-content">
        <div class="single-viewer-controls">
          <button class="viewer-btn close-btn" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="zoom-controls">
            <button class="viewer-btn zoom-out" aria-label="Zoom out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button class="viewer-btn zoom-reset" aria-label="Reset zoom">
              <span class="reset-text">1:1</span>
            </button>
            <button class="viewer-btn zoom-in" aria-label="Zoom in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="single-viewer-image-container">
          <div class="loading-spinner"></div>
          <img src="${this.imageSrc}" alt="${this.imageAlt}" class="single-viewer-image" />
        </div>
        <div class="viewer-hint">
          <span>Esc для закриття</span>
          <span>•</span>
          <span>Колесо миші для zoom</span>
          <span>•</span>
          <span>Тягніть для переміщення</span>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.container = container;
  }

  private injectStyles() {
    if (document.getElementById('single-viewer-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'single-viewer-styles';
    styles.textContent = `
      .single-viewer {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                    visibility 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .single-viewer.active {
        opacity: 1;
        visibility: visible;
      }

      .single-viewer-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.97);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
      }

      .single-viewer-content {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }

      @media (min-width: 768px) {
        .single-viewer-content {
          padding: 3rem;
        }
      }

      .single-viewer-controls {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        z-index: 10;
        opacity: 0;
        transform: translateY(-10px);
        animation: fadeInDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @media (min-width: 768px) {
        .single-viewer-controls {
          padding: 2rem 3rem;
        }
      }

      @keyframes fadeInDown {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .zoom-controls {
        display: flex;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding: 0.5rem;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .viewer-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        border-radius: 8px;
        padding: 0;
      }

      .viewer-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        transform: scale(1.05);
      }

      .viewer-btn:active {
        transform: scale(0.95);
      }

      .viewer-btn.close-btn {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
      }

      .viewer-btn.close-btn:hover {
        background: rgba(255, 59, 48, 0.2);
        border-color: rgba(255, 59, 48, 0.3);
      }

      .reset-text {
        font-size: 0.75rem;
        font-weight: 500;
        letter-spacing: 0.02em;
      }

      .single-viewer-image-container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        cursor: default;
      }

      .single-viewer-image-container.loaded {
        cursor: grab;
      }

      .single-viewer-image-container.zoomed {
        cursor: grab;
      }

      .single-viewer-image-container.dragging {
        cursor: grabbing;
      }

      .loading-spinner {
        position: absolute;
        width: 60px;
        height: 60px;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: rgba(168, 85, 247, 0.8);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        z-index: 1;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .loading-spinner.hidden {
        display: none;
      }

      .single-viewer-image {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        transform-origin: center center;
        opacity: 0;
        position: relative;
        z-index: 2;
      }

      .single-viewer-image.loaded {
        animation: zoomIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes zoomIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .single-viewer-image.zoomed {
        cursor: grab;
      }

      .viewer-hint {
        position: absolute;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: rgba(255, 255, 255, 0.4);
        font-size: 0.75rem;
        font-weight: 300;
        letter-spacing: 0.03em;
        pointer-events: none;
        opacity: 0;
        animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding: 0.75rem 1.5rem;
        border-radius: 100px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @media (max-width: 768px) {
        .viewer-hint {
          font-size: 0.65rem;
          padding: 0.65rem 1.25rem;
          gap: 0.5rem;
          bottom: 1.5rem;
        }

        .viewer-hint span:nth-child(5),
        .viewer-hint span:nth-child(6) {
          display: none;
        }
      }

      @keyframes fadeIn {
        to {
          opacity: 1;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .single-viewer,
        .single-viewer-controls,
        .single-viewer-image,
        .viewer-hint {
          animation: none;
          transition: none;
        }

        .single-viewer.active {
          opacity: 1;
        }

        .single-viewer-controls,
        .viewer-hint {
          opacity: 1;
          transform: none;
        }

        .single-viewer-image {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  private init() {
    if (!this.container) return;

    this.image = this.container.querySelector('.single-viewer-image');
    this.imageContainer = this.container.querySelector('.single-viewer-image-container');
    this.closeBtn = this.container.querySelector('.close-btn');
    this.zoomInBtn = this.container.querySelector('.zoom-in');
    this.zoomOutBtn = this.container.querySelector('.zoom-out');
    this.zoomResetBtn = this.container.querySelector('.zoom-reset');

    // Handle image loading
    if (this.image) {
      const spinner = this.container.querySelector('.loading-spinner');

      this.image.addEventListener('load', () => {
        this.image?.classList.add('loaded');
        this.imageContainer?.classList.add('loaded');
        if (spinner) spinner.classList.add('hidden');
      });

      this.image.addEventListener('error', () => {
        if (spinner) spinner.classList.add('hidden');
        console.error('Failed to load image:', this.imageSrc);
      });
    }

    this.setupEventListeners();
    this.open();
  }

  private setupEventListeners() {
    // Close button
    this.closeBtn?.addEventListener('click', () => this.close());

    // Zoom buttons
    this.zoomInBtn?.addEventListener('click', () => this.zoom(this.zoomStep));
    this.zoomOutBtn?.addEventListener('click', () => this.zoom(-this.zoomStep));
    this.zoomResetBtn?.addEventListener('click', () => this.resetZoom());

    // Keyboard
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Mouse events
    this.imageContainer?.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e);
      this.showControls();
      this.resetHideControlsTimer();
    });
    document.addEventListener('mouseup', () => this.handleMouseUp());

    // Touch events
    this.imageContainer?.addEventListener('touchstart', (e) => {
      this.handleTouchStart(e);
      this.showControls();
      this.resetHideControlsTimer();
    }, { passive: false });
    this.imageContainer?.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.imageContainer?.addEventListener('touchend', () => this.handleTouchEnd());

    // Mouse wheel - attach to container to work everywhere
    this.container?.addEventListener('wheel', (e) => {
      this.handleWheel(e);
      this.showControls();
      this.resetHideControlsTimer();
    }, { passive: false });

    // Click background to close
    this.container?.addEventListener('click', (e) => {
      if (e.target === this.container || e.target === this.imageContainer) {
        this.close();
      }
    });

    // Start auto-hide timer
    this.resetHideControlsTimer();
  }

  private open() {
    this.container?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  private close() {
    this.container?.classList.remove('active');
    document.body.style.overflow = '';

    // Remove after animation
    setTimeout(() => {
      this.container?.remove();
    }, 300);
  }

  private handleKeyboard(e: KeyboardEvent) {
    if (!this.container?.classList.contains('active')) return;

    switch (e.key) {
      case 'Escape':
        this.close();
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
    }
  }

  private zoom(delta: number) {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));
    this.applyTransform();

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
    this.scale = this.minScale;
    this.translateX = 0;
    this.translateY = 0;
    this.applyTransform();
    this.image?.classList.remove('zoomed');
    this.imageContainer?.classList.remove('zoomed');
  }

  private applyTransform() {
    if (!this.image) return;
    this.image.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  // Mouse pan
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
    this.applyTransform();
  }

  private handleMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
      this.imageContainer?.classList.remove('dragging');
    }
  }

  // Touch gestures
  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.initialDistance = this.getDistance(touch1, touch2);
      this.lastScale = this.scale;
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = this.getDistance(touch1, touch2);
      const scaleDelta = (distance / this.initialDistance) - 1;
      this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.lastScale + scaleDelta));
      this.applyTransform();

      if (this.scale > this.minScale) {
        this.image?.classList.add('zoomed');
        this.imageContainer?.classList.add('zoomed');
      } else {
        this.image?.classList.remove('zoomed');
        this.imageContainer?.classList.remove('zoomed');
      }
    }
  }

  private handleTouchEnd() {
    this.initialDistance = 0;
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

  private showControls() {
    if (this.controlsVisible) return;
    this.controlsVisible = true;
    const controls = this.container?.querySelector('.single-viewer-controls') as HTMLElement;
    const hint = this.container?.querySelector('.viewer-hint') as HTMLElement;
    if (controls) controls.style.opacity = '1';
    if (hint) hint.style.opacity = '1';
  }

  private hideControls() {
    if (!this.controlsVisible) return;
    this.controlsVisible = false;
    const controls = this.container?.querySelector('.single-viewer-controls') as HTMLElement;
    const hint = this.container?.querySelector('.viewer-hint') as HTMLElement;
    if (controls) controls.style.opacity = '0';
    if (hint) hint.style.opacity = '0';
  }

  private resetHideControlsTimer() {
    if (this.hideControlsTimer) {
      window.clearTimeout(this.hideControlsTimer);
    }
    this.hideControlsTimer = window.setTimeout(() => {
      this.hideControls();
    }, 3000);
  }
}

// Export function to open viewer
export function openSingleImageViewer(imageSrc: string, imageAlt: string) {
  new SingleImageViewer(imageSrc, imageAlt);
}
