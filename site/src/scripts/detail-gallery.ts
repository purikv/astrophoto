/**
 * Detail Page Image Gallery
 * Handles multiple images per object with carousel navigation and fullscreen viewing
 */

interface FinalImage {
  path: string;
  preview: string;
  title?: string;
  plate_solved?: boolean;
}

class DetailGallery {
  private container: HTMLElement;
  private mainImage: HTMLImageElement;
  private thumbnailsContainer: HTMLElement | null = null;
  private counter: HTMLElement | null = null;
  private prevBtn: HTMLElement | null = null;
  private nextBtn: HTMLElement | null = null;
  private titleElement: HTMLElement | null = null;

  private images: FinalImage[] = [];
  private currentIndex: number = 0;
  private base: string = '';

  constructor(container: HTMLElement, images: FinalImage[], base: string) {
    this.container = container;
    this.images = images;
    this.base = base;

    const img = container.querySelector('.main-image') as HTMLImageElement;
    if (!img) return;
    this.mainImage = img;

    this.init();
  }

  private init() {
    if (this.images.length <= 1) {
      // Single image - just enable fullscreen click
      this.setupSingleImageViewer();
      return;
    }

    // Multiple images - create gallery UI
    this.createGalleryUI();
    this.setupEventListeners();
    this.updateDisplay();
  }

  private createGalleryUI() {
    // Add gallery class to container
    this.container.classList.add('has-gallery');

    // Create navigation controls
    const navHTML = `
      <div class="gallery-nav">
        <button class="gallery-btn gallery-prev" aria-label="Попереднє фото">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="gallery-counter">
          <span class="gallery-current">1</span>
          <span class="gallery-sep">/</span>
          <span class="gallery-total">${this.images.length}</span>
        </div>
        <button class="gallery-btn gallery-next" aria-label="Наступне фото">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    `;

    // Create thumbnails strip
    const thumbsHTML = `
      <div class="gallery-thumbnails">
        ${this.images.map((img, i) => `
          <button class="gallery-thumb ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Фото ${i + 1}">
            <img src="${this.base}/${img.preview}" alt="Мініатюра ${i + 1}" />
          </button>
        `).join('')}
      </div>
    `;

    // Create image title
    const titleHTML = `
      <div class="gallery-title">${this.images[0]?.title || ''}</div>
    `;

    // Insert controls
    this.container.insertAdjacentHTML('beforeend', navHTML);
    this.container.insertAdjacentHTML('beforeend', thumbsHTML);
    this.container.insertAdjacentHTML('beforeend', titleHTML);

    // Get references
    this.prevBtn = this.container.querySelector('.gallery-prev');
    this.nextBtn = this.container.querySelector('.gallery-next');
    this.counter = this.container.querySelector('.gallery-current');
    this.thumbnailsContainer = this.container.querySelector('.gallery-thumbnails');
    this.titleElement = this.container.querySelector('.gallery-title');

    // Inject styles
    this.injectStyles();
  }

  private injectStyles() {
    if (document.getElementById('detail-gallery-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'detail-gallery-styles';
    styles.textContent = `
      .image-container.has-gallery {
        position: relative;
      }

      .gallery-nav {
        position: absolute;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 1rem;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding: 0.5rem 1rem;
        border-radius: 100px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 10;
        opacity: 0;
        transform: translateX(-50%) translateY(10px);
        animation: fadeInUp 0.4s ease 0.3s forwards;
      }

      @keyframes fadeInUp {
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .gallery-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 50%;
        padding: 0;
      }

      .gallery-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }

      .gallery-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .gallery-counter {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 400;
        min-width: 50px;
        justify-content: center;
      }

      .gallery-sep {
        opacity: 0.5;
      }

      .gallery-thumbnails {
        position: absolute;
        bottom: 5rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 0.5rem;
        z-index: 10;
        opacity: 0;
        animation: fadeIn 0.4s ease 0.5s forwards;
      }

      @keyframes fadeIn {
        to {
          opacity: 1;
        }
      }

      .gallery-thumb {
        width: 60px;
        height: 45px;
        padding: 0;
        border: 2px solid transparent;
        border-radius: 6px;
        overflow: hidden;
        cursor: pointer;
        background: rgba(0, 0, 0, 0.5);
        transition: all 0.25s ease;
        opacity: 0.6;
      }

      .gallery-thumb:hover {
        opacity: 0.9;
        border-color: rgba(255, 255, 255, 0.3);
      }

      .gallery-thumb.active {
        opacity: 1;
        border-color: rgba(168, 85, 247, 0.8);
        box-shadow: 0 0 12px rgba(168, 85, 247, 0.4);
      }

      .gallery-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .gallery-title {
        position: absolute;
        top: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding: 0.5rem 1.25rem;
        border-radius: 100px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.9);
        z-index: 10;
        white-space: nowrap;
        opacity: 0;
        animation: fadeIn 0.4s ease 0.4s forwards;
      }

      .gallery-title:empty {
        display: none;
      }

      /* Zoom hint adjustment for gallery */
      .image-container.has-gallery .zoom-hint {
        bottom: 7rem;
      }

      /* Mobile adjustments */
      @media (max-width: 768px) {
        .gallery-nav {
          bottom: 1rem;
          padding: 0.4rem 0.75rem;
          gap: 0.75rem;
        }

        .gallery-btn {
          width: 32px;
          height: 32px;
        }

        .gallery-btn svg {
          width: 20px;
          height: 20px;
        }

        .gallery-counter {
          font-size: 0.8rem;
        }

        .gallery-thumbnails {
          bottom: 4rem;
          gap: 0.35rem;
        }

        .gallery-thumb {
          width: 48px;
          height: 36px;
        }

        .gallery-title {
          top: 1rem;
          font-size: 0.75rem;
          padding: 0.4rem 1rem;
        }

        .image-container.has-gallery .zoom-hint {
          bottom: 5.5rem;
        }
      }

      /* Image transition */
      .main-image.transitioning {
        opacity: 0.5;
        transition: opacity 0.15s ease;
      }
    `;
    document.head.appendChild(styles);
  }

  private setupEventListeners() {
    // Navigation buttons
    this.prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigate(-1);
    });

    this.nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigate(1);
    });

    // Thumbnail clicks
    this.thumbnailsContainer?.addEventListener('click', (e) => {
      const thumb = (e.target as HTMLElement).closest('.gallery-thumb') as HTMLElement;
      if (thumb) {
        e.stopPropagation();
        const index = parseInt(thumb.dataset.index || '0', 10);
        this.goToImage(index);
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Click on image for fullscreen
    this.container.addEventListener('click', (e) => {
      // Prevent fullscreen when clicking on controls
      if ((e.target as HTMLElement).closest('.gallery-nav, .gallery-thumbnails')) {
        return;
      }
      this.openFullscreen();
    });
  }

  private setupSingleImageViewer() {
    this.container.addEventListener('click', () => {
      this.openFullscreen();
    });
  }

  private handleKeyboard(e: KeyboardEvent) {
    // Only handle if no modal is open
    if (document.querySelector('.single-viewer.active, #fullscreen-gallery.active')) {
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
        this.navigate(-1);
        break;
      case 'ArrowRight':
        this.navigate(1);
        break;
    }
  }

  private navigate(direction: number) {
    const newIndex = this.currentIndex + direction;
    if (newIndex < 0 || newIndex >= this.images.length) return;
    this.goToImage(newIndex);
  }

  private goToImage(index: number) {
    if (index < 0 || index >= this.images.length || index === this.currentIndex) return;

    this.currentIndex = index;

    // Animate transition
    this.mainImage.classList.add('transitioning');

    setTimeout(() => {
      this.updateDisplay();
      this.mainImage.classList.remove('transitioning');
    }, 150);
  }

  private updateDisplay() {
    const current = this.images[this.currentIndex];
    if (!current) return;

    // Update main image - use 2000px version
    const previewPath = current.preview.replace('_800', '_2000');
    this.mainImage.src = `${this.base}/${previewPath}`;
    this.mainImage.dataset.full = `${this.base}/${previewPath}`;

    // Update counter
    if (this.counter) {
      this.counter.textContent = String(this.currentIndex + 1);
    }

    // Update title
    if (this.titleElement) {
      this.titleElement.textContent = current.title || '';
    }

    // Update navigation buttons
    if (this.prevBtn) {
      (this.prevBtn as HTMLButtonElement).disabled = this.currentIndex === 0;
    }
    if (this.nextBtn) {
      (this.nextBtn as HTMLButtonElement).disabled = this.currentIndex === this.images.length - 1;
    }

    // Update active thumbnail
    const thumbs = this.thumbnailsContainer?.querySelectorAll('.gallery-thumb');
    thumbs?.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === this.currentIndex);
    });

    // Preload adjacent images
    this.preloadNeighbors();
  }

  private preloadNeighbors() {
    [-1, 1].forEach(offset => {
      const index = this.currentIndex + offset;
      if (index >= 0 && index < this.images.length) {
        const img = new Image();
        const previewPath = this.images[index].preview.replace('_800', '_2000');
        img.src = `${this.base}/${previewPath}`;
      }
    });
  }

  private openFullscreen() {
    // Import and use the single image viewer for fullscreen
    import('./single-image-viewer').then(({ openSingleImageViewer }) => {
      const current = this.images[this.currentIndex];
      const previewPath = current.preview.replace('_800', '_2000');
      const imagePath = `${this.base}/${previewPath}`;
      const imageAlt = current.title || 'Астрофото';
      openSingleImageViewer(imagePath, imageAlt);
    });
  }
}

// Initialize gallery on page load
export function initDetailGallery() {
  const container = document.getElementById('image-container');
  if (!container) return;

  // Get gallery data from data attribute
  const galleryDataStr = container.dataset.gallery;
  if (!galleryDataStr) return;

  try {
    const images: FinalImage[] = JSON.parse(galleryDataStr);
    const base = document.querySelector('meta[name="base-url"]')?.getAttribute('content') || '';

    new DetailGallery(container, images, base);
  } catch (e) {
    console.error('Failed to initialize gallery:', e);
  }
}

// Auto-initialize
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDetailGallery);
  } else {
    initDetailGallery();
  }
}
