# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an astrophotography gallery repository that manages final images, metadata, and deploys a static website to GitHub Pages. The project is bilingual (Ukrainian/English) with Ukrainian as the primary language for UI text.

## Architecture

### Data-Driven Build Pipeline

1. **Source Data**: YAML metadata files define astronomical objects and imaging sessions
   - `data/objects/*.yml`: Object definitions (M31, M42, etc.) with scientific metadata
   - `data/sessions/*.yml`: Imaging session details (equipment, settings, calibration frames)

2. **Build-Time Generation**:
   - `tools/generate-gallery-json.mjs`: Reads YAML files and merges object + session data into `site/src/data/gallery.json`
   - This JSON file is imported by Astro pages at build time

3. **Image Processing**:
   - Final images stored in `images/<object>/final/` (TIFF/PNG/JPG)
   - `tools/make_thumbs.py`: Generates thumbnails at 800px and 2000px widths
   - Output saved to `thumbnails/` directory

4. **Static Site**:
   - Astro-based static site in `site/` directory
   - Base path configured as `/astrophoto` for GitHub Pages subdirectory deployment
   - Gallery data consumed from generated JSON file

### YAML Schema Structure

Session files reference object files via `object_id`:
- Session YAML: Contains `object_id: m31` + imaging/processing details
- Object YAML: Contains `id: m31` + astronomical metadata
- Generator merges these on `id`/`object_id` match

Session YAML includes:
- Equipment details (camera, telescope, mount, filters)
- Sub-exposure settings (band, ISO, exposure time, count)
- Calibration frames (bias, darks, flats)
- Processing software chain
- Finals array with `path` and `preview` for images

## Build Commands

All commands must be run from the repository root unless otherwise specified:

### Development
```bash
cd site
npm run dev              # Start Astro dev server (runs generate-gallery-json first via build script)
```

### Production Build
```bash
# Full build process (what GitHub Actions does):
python -m pip install pillow              # Install image processing library
python tools/make_thumbs.py               # Generate thumbnails from images/
npm ci || npm i                           # Install root dependencies (YAML parser)
cd site && npm ci || npm i                # Install site dependencies
npm run generate                          # Generate gallery.json from YAML metadata
npm run build                             # Build Astro site (also runs generate step)
```

### Python Environment
No virtual environment is used. The only Python dependency is Pillow (PIL).

## Key File Locations

- Metadata: `data/objects/*.yml` and `data/sessions/*.yml`
- Images: `images/<object>/final/` (original TIFF/PNG/JPG files)
- Thumbnails: `thumbnails/` (generated, 800px and 2000px widths)
- Generated gallery data: `site/src/data/gallery.json`
- Astro pages: `site/src/pages/`
- Astro components: `site/src/components/`

## Development Workflow

When adding new astrophoto content:
1. Place final images in `images/<object>/final/`
2. Create/update object YAML in `data/objects/` with astronomical metadata
3. Create session YAML in `data/sessions/` with imaging session details
4. Run `python tools/make_thumbs.py` to generate preview thumbnails
5. Verify with `cd site && npm run dev`
6. Push to main branch - GitHub Actions handles build and deployment

## Deployment

GitHub Actions workflow (`.github/workflows/build-and-deploy.yml`):
- Triggers on push to main branch
- Checks out repository with Git LFS
- Generates thumbnails via Python script
- Runs build process (generate JSON + Astro build)
- Copies `thumbnails/` and `images/` to `site/public/`
- Deploys `site/dist/` to GitHub Pages

The site is served from GitHub Pages at `https://purikv.github.io/astrophoto` (configured via `base` in `site/astro.config.mjs`).

## Git LFS

Large files (TIFF/FITS/RAW) are tracked with Git LFS. When cloning or pulling, ensure LFS files are downloaded with `git lfs pull`.
