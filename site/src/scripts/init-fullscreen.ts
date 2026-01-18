/**
 * Initialize fullscreen gallery on detail pages
 */

import { openFullscreenGallery } from './fullscreen-gallery';
import galleryData from '../data/gallery.json';

// Get base path from meta tag or use default
const getBasePath = (): string => {
  const metaBase = document.querySelector('meta[name="base-url"]');
  if (metaBase) {
    return metaBase.getAttribute('content') || '/astrophoto';
  }
  return '/astrophoto';
};

// Initialize on detail page
const imageContainer = document.getElementById('image-container');
if (imageContainer) {
  const base = getBasePath();
  const currentId = window.location.pathname.split('/').filter(Boolean).pop();
  const currentIndex = galleryData.findIndex((item: any) => item.object.id === currentId);

  if (currentIndex !== -1) {
    imageContainer.addEventListener('click', () => {
      openFullscreenGallery(galleryData, currentIndex, base);
    });
  }
}
