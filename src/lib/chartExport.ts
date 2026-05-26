/**
 * Chart export utilities — CSV + PNG.
 *
 * Sprint 57 C.2. Shared by the upcoming <TpLineChart> wrapper and any
 * page-level "Export CSV / PNG" buttons (e.g. TagReads' existing
 * Export CSV uses these).
 *
 * - CSV: RFC-4180-ish escaping (quote fields containing `,` `"` or newline,
 *   double internal quotes). No BOM — modern Excel handles UTF-8 fine.
 * - PNG: Rasterises an inline <svg> (Recharts) via a data-URL Image →
 *   <canvas>. Pure browser APIs, no extra deps. Respects `devicePixelRatio`
 *   so retina exports aren't blurry. Defaults to white background so dark
 *   text on a transparent canvas doesn't look broken in the saved file.
 */

export interface CsvColumn<T> {
  /** Header label written to row 0. */
  header: string;
  /** Pulls the cell value out of a row. Return `null`/`undefined` for blank. */
  accessor: (row: T) => unknown;
}

/** Quote a value for a CSV cell. Returns `''` for `null`/`undefined`. */
export function escapeCsvCell(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialise rows + columns to a CSV string. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCsvCell(c.accessor(row))).join(','));
  return [header, ...body].join('\n');
}

/** Trigger a browser download for an arbitrary Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.click();
  } finally {
    // Revoke on next tick so the click has a chance to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Download a CSV string as `<filename>.csv`. */
export function downloadCsv(filename: string, csv: string): void {
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

export interface PngExportOptions {
  /** Background fill before drawing the SVG. Default: `'#ffffff'`. Pass `null` for transparent. */
  background?: string | null;
  /** Pixel ratio multiplier. Default: `window.devicePixelRatio || 1`. */
  pixelRatio?: number;
}

/**
 * Convert an inline `<svg>` element (e.g. the SVG Recharts renders) to a PNG
 * blob. Resolves with the blob; callers can hand it to `downloadBlob`.
 *
 * Width/height come from the SVG's bounding client rect so the export
 * matches what the operator sees on screen.
 */
export function svgToPngBlob(svg: SVGSVGElement, options: PngExportOptions = {}): Promise<Blob> {
  const { background = '#ffffff', pixelRatio = window.devicePixelRatio || 1 } = options;

  // Clone so we can safely add xmlns + inline computed styles without mutating the DOM.
  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  const rect = svg.getBoundingClientRect();
  const width = rect.width || svg.clientWidth || 800;
  const height = rect.height || svg.clientHeight || 400;
  if (!clone.getAttribute('width')) clone.setAttribute('width', String(width));
  if (!clone.getAttribute('height')) clone.setAttribute('height', String(height));

  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * pixelRatio));
        canvas.height = Math.max(1, Math.round(height * pixelRatio));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('2D canvas context unavailable'));
          return;
        }
        ctx.scale(pixelRatio, pixelRatio);
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('canvas.toBlob returned null'));
        }, 'image/png');
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG into Image for PNG conversion'));
    };
    img.src = url;
  });
}

/** Convenience: rasterise an SVG and trigger a download. */
export async function downloadSvgAsPng(
  svg: SVGSVGElement,
  filename: string,
  options?: PngExportOptions,
): Promise<void> {
  const blob = await svgToPngBlob(svg, options);
  downloadBlob(blob, filename);
}
