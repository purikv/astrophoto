/**
 * Gallery Filter & Sort Script
 * Filters/sorts gallery items in-place without cloning DOM nodes (preserves listeners).
 * Emits `gallery:changed` so LazyImage can re-observe.
 * Renders active-filter chips, live results count, and reset-all shortcut.
 * Keyboard: "/" focuses search, Esc blurs it.
 */

interface GalleryItemData {
  element: HTMLElement;
  id: string;
  name: string;
  type: string;
  constellation: string;
  distance_ly: number;
  description: string;
  date_utc: string;
}

interface FilterState {
  type: string;
  constellation: string;
  sortBy: string;
  searchQuery: string;
}

const DEFAULT_STATE: FilterState = {
  type: 'all',
  constellation: 'all',
  sortBy: 'date-desc',
  searchQuery: ''
};

class GalleryFilter {
  private allItems: GalleryItemData[] = [];
  private galleryContainer: HTMLElement | null = null;
  private emptyState: HTMLElement | null = null;
  private resultsBar: HTMLElement | null = null;
  private state: FilterState = { ...DEFAULT_STATE };

  constructor() {
    this.init();
  }

  private init() {
    this.galleryContainer = document.querySelector('.gallery');
    if (!this.galleryContainer) return;

    this.storeAllItems();
    this.buildResultsBar();
    this.setupTypeFilters();
    this.setupConstellationFilters();
    this.setupSortOptions();
    this.setupSearch();
    this.setupKeyboardShortcuts();
    this.readURLParams();
    this.applyFiltersAndSort({ scrollToTop: false });
  }

  private storeAllItems() {
    const cards = Array.from(this.galleryContainer?.querySelectorAll('.gallery-card') || []);
    this.allItems = cards.map(card => {
      const element = card as HTMLElement;
      const distanceRaw = element.dataset.objectDistance;
      const distance = distanceRaw ? Number(distanceRaw) : NaN;
      return {
        element,
        id: element.dataset.objectId || '',
        name: element.querySelector('.card-title')?.textContent || '',
        type: element.dataset.objectType || '',
        constellation: element.dataset.objectConstellation || '',
        distance_ly: Number.isFinite(distance) ? distance : 0,
        description: element.dataset.objectDescription || '',
        date_utc: element.dataset.sessionDate || ''
      };
    });
  }

  private buildResultsBar() {
    const controls = document.querySelector('.controls-container');
    if (!controls) return;

    const bar = document.createElement('div');
    bar.className = 'results-bar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.hidden = true;
    bar.innerHTML = `
      <span class="results-count"></span>
      <div class="active-chips"></div>
      <button type="button" class="results-reset" hidden>Скинути</button>
    `;
    controls.appendChild(bar);
    this.resultsBar = bar;

    bar.querySelector<HTMLButtonElement>('.results-reset')?.addEventListener('click', () => {
      this.resetFilters();
    });
    bar.querySelector<HTMLElement>('.active-chips')?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-chip]');
      if (!target) return;
      const kind = target.dataset.removeChip;
      if (kind === 'type') this.state.type = 'all';
      if (kind === 'constellation') this.state.constellation = 'all';
      if (kind === 'search') {
        this.state.searchQuery = '';
        const input = document.getElementById('search-input') as HTMLInputElement | null;
        if (input) input.value = '';
        const clear = document.getElementById('search-clear');
        if (clear) (clear as HTMLElement).style.display = 'none';
      }
      this.syncFilterButtons();
      this.updateURL();
      this.applyFiltersAndSort();
    });
  }

  private syncFilterButtons() {
    document.querySelectorAll('[data-type]').forEach(btn => {
      const t = (btn as HTMLElement).dataset.type || 'all';
      btn.classList.toggle('active', t === this.state.type);
    });
    document.querySelectorAll('[data-constellation]').forEach(btn => {
      const c = (btn as HTMLElement).dataset.constellation || 'all';
      btn.classList.toggle('active', c === this.state.constellation);
    });
    const sortSelect = document.getElementById('sort-select') as HTMLSelectElement | null;
    if (sortSelect) sortSelect.value = this.state.sortBy;
  }

  private setupTypeFilters() {
    const typeButtons = document.querySelectorAll<HTMLElement>('[data-type]');
    typeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        this.state.type = target.dataset.type || 'all';
        this.syncFilterButtons();
        this.updateURL();
        this.applyFiltersAndSort();
      });
    });
  }

  private setupConstellationFilters() {
    const constellationButtons = document.querySelectorAll<HTMLElement>('[data-constellation]');
    constellationButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        this.state.constellation = target.dataset.constellation || 'all';
        this.syncFilterButtons();
        this.updateURL();
        this.applyFiltersAndSort();
      });
    });
  }

  private setupSortOptions() {
    const sortSelect = document.getElementById('sort-select') as HTMLSelectElement | null;
    if (!sortSelect) return;

    sortSelect.addEventListener('change', (e) => {
      this.state.sortBy = (e.target as HTMLSelectElement).value;
      this.updateURL();
      this.applyFiltersAndSort();
    });
  }

  private setupSearch() {
    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
    const searchClear = document.getElementById('search-clear') as HTMLElement | null;
    if (!searchInput) return;

    let debounceTimer: number | null = null;
    searchInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      if (searchClear) searchClear.style.display = value ? 'flex' : 'none';

      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        this.state.searchQuery = value.toLowerCase();
        this.applyFiltersAndSort();
      }, 80);
    });

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        this.state.searchQuery = '';
        searchClear.style.display = 'none';
        searchInput.focus();
        this.applyFiltersAndSort();
      });
    }
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === '/' && !isTyping) {
        const input = document.getElementById('search-input') as HTMLInputElement | null;
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
        return;
      }

      if (e.key === 'Escape' && document.activeElement?.id === 'search-input') {
        const input = document.activeElement as HTMLInputElement;
        if (input.value) {
          input.value = '';
          this.state.searchQuery = '';
          const clear = document.getElementById('search-clear');
          if (clear) (clear as HTMLElement).style.display = 'none';
          this.applyFiltersAndSort();
        } else {
          input.blur();
        }
      }
    });
  }

  private filterItems(items: GalleryItemData[]): GalleryItemData[] {
    return items.filter(item => {
      if (this.state.type !== 'all' && item.type !== this.state.type) return false;
      if (this.state.constellation !== 'all' && item.constellation !== this.state.constellation) return false;

      if (this.state.searchQuery) {
        const hay = [item.name, item.type, item.constellation, item.description].join(' ').toLowerCase();
        if (!hay.includes(this.state.searchQuery)) return false;
      }
      return true;
    });
  }

  private sortItems(items: GalleryItemData[]): GalleryItemData[] {
    const sorted = [...items];
    switch (this.state.sortBy) {
      case 'date-desc': sorted.sort((a, b) => b.date_utc.localeCompare(a.date_utc)); break;
      case 'date-asc': sorted.sort((a, b) => a.date_utc.localeCompare(b.date_utc)); break;
      case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name, 'uk')); break;
      case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name, 'uk')); break;
      case 'distance-asc': sorted.sort((a, b) => a.distance_ly - b.distance_ly); break;
      case 'distance-desc': sorted.sort((a, b) => b.distance_ly - a.distance_ly); break;
    }
    return sorted;
  }

  private applyFiltersAndSort({ scrollToTop = true }: { scrollToTop?: boolean } = {}) {
    if (!this.galleryContainer) return;

    const filtered = this.filterItems(this.allItems);
    const sorted = this.sortItems(filtered);
    const visibleIds = new Set(sorted.map(i => i.id));

    // Hide non-matching
    this.allItems.forEach(item => {
      if (!visibleIds.has(item.id)) {
        item.element.classList.add('is-hidden');
        item.element.classList.remove('stagger-item');
      } else {
        item.element.classList.remove('is-hidden');
      }
    });

    // Reorder visible in-place (no clone)
    const fragment = document.createDocumentFragment();
    sorted.forEach((item, index) => {
      item.element.style.animationDelay = `${Math.min(index * 25, 240)}ms`;
      item.element.classList.add('stagger-item');
      fragment.appendChild(item.element);
    });
    this.galleryContainer.appendChild(fragment);

    this.renderResultsBar(sorted.length);
    this.updateEmptyState(sorted.length === 0);
    window.dispatchEvent(new CustomEvent('gallery:changed'));

    if (scrollToTop && this.hasActiveFilters() && this.galleryContainer.getBoundingClientRect().top < -40) {
      this.galleryContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private hasActiveFilters(): boolean {
    return this.state.type !== DEFAULT_STATE.type
      || this.state.constellation !== DEFAULT_STATE.constellation
      || this.state.searchQuery !== DEFAULT_STATE.searchQuery
      || this.state.sortBy !== DEFAULT_STATE.sortBy;
  }

  private renderResultsBar(visibleCount: number) {
    if (!this.resultsBar) return;
    const total = this.allItems.length;
    const hasFilters = this.hasActiveFilters();

    this.resultsBar.hidden = !hasFilters;
    if (!hasFilters) {
      this.resultsBar.querySelector('.active-chips')!.innerHTML = '';
      this.resultsBar.querySelector('.results-count')!.textContent = '';
      return;
    }

    const countEl = this.resultsBar.querySelector('.results-count')!;
    countEl.textContent = visibleCount === total
      ? `Знайдено ${visibleCount}`
      : `Показано ${visibleCount} з ${total}`;

    const chipsHtml: string[] = [];
    if (this.state.type !== 'all') {
      chipsHtml.push(this.chip('type', this.state.type));
    }
    if (this.state.constellation !== 'all') {
      chipsHtml.push(this.chip('constellation', this.state.constellation));
    }
    if (this.state.searchQuery) {
      chipsHtml.push(this.chip('search', `"${this.state.searchQuery}"`));
    }
    this.resultsBar.querySelector('.active-chips')!.innerHTML = chipsHtml.join('');

    const resetBtn = this.resultsBar.querySelector<HTMLButtonElement>('.results-reset')!;
    resetBtn.hidden = false;
  }

  private chip(kind: 'type' | 'constellation' | 'search', label: string): string {
    const safeLabel = label
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `<button type="button" class="active-chip" data-remove-chip="${kind}" aria-label="Прибрати фільтр ${safeLabel}">
      <span>${safeLabel}</span>
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;
  }

  private updateEmptyState(show: boolean) {
    if (!this.galleryContainer) return;

    if (!show) {
      this.emptyState?.remove();
      this.emptyState = null;
      return;
    }
    if (this.emptyState) return;

    const el = document.createElement('div');
    el.className = 'empty-state';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="empty-state-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <p>Нічого не знайдено</p>
        <button type="button" class="reset-button" data-reset-filters>Скинути фільтри</button>
      </div>
    `;
    el.querySelector<HTMLButtonElement>('[data-reset-filters]')?.addEventListener('click', () => this.resetFilters());
    this.galleryContainer.appendChild(el);
    this.emptyState = el;
  }

  private resetFilters() {
    this.state = { ...DEFAULT_STATE };

    this.syncFilterButtons();

    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
    if (searchInput) searchInput.value = '';
    const searchClear = document.getElementById('search-clear');
    if (searchClear) (searchClear as HTMLElement).style.display = 'none';

    this.updateURL();
    this.applyFiltersAndSort();
  }

  private updateURL() {
    const params = new URLSearchParams();
    if (this.state.type !== 'all') params.set('type', this.state.type);
    if (this.state.constellation !== 'all') params.set('constellation', this.state.constellation);
    if (this.state.sortBy !== 'date-desc') params.set('sort', this.state.sortBy);

    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newURL);
  }

  private readURLParams() {
    const params = new URLSearchParams(window.location.search);

    const type = params.get('type');
    if (type) this.state.type = type;

    const constellation = params.get('constellation');
    if (constellation) this.state.constellation = constellation;

    const sort = params.get('sort');
    if (sort) this.state.sortBy = sort;

    this.syncFilterButtons();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GalleryFilter());
} else {
  new GalleryFilter();
}

export { GalleryFilter };
