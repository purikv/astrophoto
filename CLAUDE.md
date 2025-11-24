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
   - `tools/make-thumbs.mjs`: Generates thumbnails at 800px and 2000px widths
   - Output saved to `thumbnails/` directory (auto-generated, not in git)

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
# Generate thumbnails and gallery data locally (optional for development):
node tools/make-thumbs.mjs               # Generate thumbnails from images/
cd site
npm run dev                              # Start Astro dev server (runs generate-gallery-json first)
```

### Production Build
```bash
# Full build process (what GitHub Actions does):
npm ci || npm i                          # Install root dependencies (YAML parser, sharp for images)
node tools/make-thumbs.mjs               # Generate thumbnails from images/
cd site && npm ci || npm i               # Install site dependencies
npm run build                            # Build Astro site (runs generate-gallery-json + build)
```

**Note**: `thumbnails/` and `site/src/data/gallery.json` are auto-generated and excluded from git. GitHub Actions regenerates them on every deploy.

## Key File Locations

- Metadata: `data/objects/*.yml` and `data/sessions/*.yml`
- Images: `images/<object>/final/` (original TIFF/PNG/JPG files, tracked in git)
- Thumbnails: `thumbnails/` (auto-generated, 800px and 2000px widths, **not in git**)
- Generated gallery data: `site/src/data/gallery.json` (**auto-generated, not in git**)
- Astro pages: `site/src/pages/`
- Astro components: `site/src/components/`

## Development Workflow

### Adding New Astrophoto Content (Recommended Method)

Use the interactive CLI tool for easy content addition:

```bash
node tools/add-gallery-item.mjs
```

This interactive tool will guide you through:
- Creating new object definitions with all required metadata
- Setting up imaging session details (equipment, exposures, calibration)
- Validating input and preventing common mistakes
- Generating properly formatted YAML files

### Manual Method (Using Templates)

If you prefer to create files manually:

1. Copy templates from `data/templates/`:
   - `object-template.yml` → `data/objects/<object-id>.yml`
   - `session-template.yml` → `data/sessions/YYYY-MM-DD_<object-id>.yml`

2. Fill in all required fields following the template comments

### Standard Workflow (Both Methods)

1. Place final images in `images/<object>/final/`
2. Create metadata files (using CLI tool or templates)
3. (Optional) Verify locally with `cd site && npm run dev`
4. Commit YAML files and images: `git add data/ images/ && git commit -m "..."`
5. Push to main branch: `git push`

**GitHub Actions automatically:**
- Validates YAML files (`npm run validate`) - deployment fails if invalid
- Generates thumbnails (`npm run thumbs`)
- Generates gallery.json (`npm run generate`)
- Builds and deploys the site to GitHub Pages

**Local testing commands (optional):**
- `npm run validate` - Check YAML validity before committing
- `npm run thumbs` - Preview thumbnails locally
- `cd site && npm run dev` - Run development server

## Deployment

GitHub Actions workflow (`.github/workflows/build-and-deploy.yml`):
1. **Triggers** on push to main branch
2. **Checks out** repository (images are committed to git)
3. **Installs** Node.js dependencies (root + site)
4. **Validates** YAML files (`npm run validate`) - **fails build if invalid**
5. **Generates thumbnails** via `npm run thumbs` (using sharp library)
6. **Copies** `thumbnails/` and `images/` to `site/public/`
7. **Builds** Astro site (includes `npm run generate` for gallery.json)
8. **Deploys** `site/dist/` to GitHub Pages

The site is served from GitHub Pages at `https://purikv.github.io/astrophoto` (configured via `base` in `site/astro.config.mjs`).

**Important**:
- Thumbnails and gallery.json are generated fresh on every deployment - do not commit these to git
- YAML validation is enforced - invalid metadata will prevent deployment
- All generation steps are automated - no manual intervention needed
