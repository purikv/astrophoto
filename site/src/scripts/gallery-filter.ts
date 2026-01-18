/**
 * Gallery Filter & Sort Script
 * Handles filtering, sorting, and searching of gallery items
 */

interface GalleryItem {
  object: {
    id: string;
    name: string;
    type: string;
    constellation: string;
    distance_ly?: number;
    description?: string;
    aliases?: string[];
  };
  session: {
    date_utc: string;
  };
  preview: string;
}

interface FilterState {
  type: string;
  constellation: string;
  sortBy: string;
  searchQuery: string;
}

class GalleryFilter {
  private allItems: GalleryItem[] = [];
  private galleryContainer: HTMLElement | null = null;
  private state: FilterState = {
    type: 'all',
    constellation: 'all',
    sortBy: 'date-desc',
    searchQuery: ''
  };

  constructor() {
    this.init();
  }

  private init() {
    this.galleryContainer = document.querySelector('.gallery');
    if (!this.galleryContainer) return;

    // Store all gallery items
    this.storeAllItems();

    // Setup event listeners
    this.setupTypeFilters();
    this.setupConstellationFilters();
    this.setupSortOptions();
    this.setupSearch();

    // Read URL parameters
    this.readURLParams();

    // Initial filter/sort
    this.applyFiltersAndSort();
  }

  private storeAllItems() {
    const cards = Array.from(this.galleryContainer?.querySelectorAll('.gallery-card') || []);
    this.allItems = cards.map(card => {
      const element = card as HTMLElement;
      return {
        element,
        object: {
          id: element.dataset.objectId || '',
          name: element.querySelector('.card-title')?.textContent || '',
          type: element.dataset.objectType || '',
          constellation: element.dataset.objectConstellation || '',
          distance_ly: parseFloat(element.dataset.objectDistance || '0'),
          description: element.dataset.objectDescription || ''
        },
        session: {
          date_utc: element.dataset.sessionDate || ''
        }
      } as any;
    });
  }

  private setupTypeFilters() {
    const typeButtons = document.querySelectorAll('[data-type]');
    typeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const type = target.dataset.type || 'all';

        // Update active state
        typeButtons.forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');

        // Update state and filter
        this.state.type = type;
        this.updateURL();
        this.applyFiltersAndSort();
      });
    });
  }

  private setupConstellationFilters() {
    const constellationButtons = document.querySelectorAll('[data-constellation]');
    constellationButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const constellation = target.dataset.constellation || 'all';

        // Update active state
        constellationButtons.forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');

        // Update state and filter
        this.state.constellation = constellation;
        this.updateURL();
        this.applyFiltersAndSort();
      });
    });
  }

  private setupSortOptions() {
    const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
    if (!sortSelect) return;

    sortSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.state.sortBy = target.value;
      this.updateURL();
      this.applyFiltersAndSort();
    });
  }

  private setupSearch() {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchClear = document.getElementById('search-clear') as HTMLElement;
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.state.searchQuery = target.value.toLowerCase();

      // Show/hide clear button
      if (searchClear) {
        searchClear.style.display = this.state.searchQuery ? 'flex' : 'none';
      }

      this.applyFiltersAndSort();
    });

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        this.state.searchQuery = '';
        searchClear.style.display = 'none';
        this.applyFiltersAndSort();
      });
    }
  }

  private filterItems(items: any[]): any[] {
    return items.filter(item => {
      // Type filter
      if (this.state.type !== 'all' && item.object.type !== this.state.type) {
        return false;
      }

      // Constellation filter
      if (this.state.constellation !== 'all' && item.object.constellation !== this.state.constellation) {
        return false;
      }

      // Search filter
      if (this.state.searchQuery) {
        const searchableText = [
          item.object.name,
          item.object.type,
          item.object.constellation,
          item.object.description
        ].join(' ').toLowerCase();

        if (!searchableText.includes(this.state.searchQuery)) {
          return false;
        }
      }

      return true;
    });
  }

  private sortItems(items: any[]): any[] {
    const sorted = [...items];

    switch (this.state.sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => b.session.date_utc.localeCompare(a.session.date_utc));
        break;
      case 'date-asc':
        sorted.sort((a, b) => a.session.date_utc.localeCompare(b.session.date_utc));
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.object.name.localeCompare(b.object.name, 'uk'));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.object.name.localeCompare(a.object.name, 'uk'));
        break;
      case 'distance-asc':
        sorted.sort((a, b) => (a.object.distance_ly || 0) - (b.object.distance_ly || 0));
        break;
      case 'distance-desc':
        sorted.sort((a, b) => (b.object.distance_ly || 0) - (a.object.distance_ly || 0));
        break;
    }

    return sorted;
  }

  private applyFiltersAndSort() {
    if (!this.galleryContainer) return;

    // Filter and sort
    let filtered = this.filterItems(this.allItems);
    let sorted = this.sortItems(filtered);

    // Clear container
    this.galleryContainer.innerHTML = '';

    // Add items back with stagger animation
    sorted.forEach((item, index) => {
      const element = item.element.cloneNode(true) as HTMLElement;
      element.style.animationDelay = `${Math.min(index * 30, 270)}ms`;
      element.classList.add('stagger-item');
      this.galleryContainer?.appendChild(element);
    });

    // Show empty state if no results
    if (sorted.length === 0) {
      this.showEmptyState();
    }

    // Re-initialize lazy loading for cloned images
    if (typeof (window as any).reinitLazyLoading === 'function') {
      (window as any).reinitLazyLoading();
    }
  }

  private showEmptyState() {
    if (!this.galleryContainer) return;

    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <p>Нічого не знайдено</p>
        <button onclick="window.location.reload()" class="reset-button">Скинути фільтри</button>
      </div>
    `;
    this.galleryContainer.appendChild(emptyState);
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
    if (type) {
      this.state.type = type;
      const button = document.querySelector(`[data-type="${type}"]`);
      if (button) {
        document.querySelectorAll('[data-type]').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
      }
    }

    const constellation = params.get('constellation');
    if (constellation) {
      this.state.constellation = constellation;
      const button = document.querySelector(`[data-constellation="${constellation}"]`);
      if (button) {
        document.querySelectorAll('[data-constellation]').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
      }
    }

    const sort = params.get('sort');
    if (sort) {
      this.state.sortBy = sort;
      const select = document.getElementById('sort-select') as HTMLSelectElement;
      if (select) select.value = sort;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GalleryFilter());
} else {
  new GalleryFilter();
}

export { GalleryFilter };
