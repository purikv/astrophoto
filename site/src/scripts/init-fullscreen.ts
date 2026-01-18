/**
 * Initialize single image viewer on detail pages
 * Opens high-quality full-screen image viewer
 */

import { openSingleImageViewer } from './single-image-viewer';
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
  const currentItem = galleryData.find((item: any) => item.object.id === currentId);

  if (currentItem) {
    // Use final image for maximum quality
    // If final exists, use it; otherwise fall back to high-quality preview
    const imagePath = currentItem.final
      ? `${base}/${currentItem.final}`
      : (currentItem.preview ? `${base}/${currentItem.preview.replace('_800', '_2000')}` : '');
    const imageAlt = currentItem.object?.name || currentItem.title;

    if (imagePath) {
      // Add click handler
      imageContainer.addEventListener('click', () => {
        openSingleImageViewer(imagePath, imageAlt);
      });

      // Add hover effect to indicate it's clickable
      imageContainer.style.cursor = 'zoom-in';
    }
  }
}
