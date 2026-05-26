import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  downloadBlob,
  downloadCsv,
  downloadSvgAsPng,
  escapeCsvCell,
  svgToPngBlob,
  toCsv,
  type CsvColumn,
} from './chartExport';

describe('escapeCsvCell', () => {
  it('returns empty string for null/undefined', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('passes plain values through unquoted', () => {
    expect(escapeCsvCell('hello')).toBe('hello');
    expect(escapeCsvCell(42)).toBe('42');
    expect(escapeCsvCell(0)).toBe('0');
  });

  it('quotes and doubles internal quotes when the value contains , " or newline', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvCell('cr\rlf')).toBe('"cr\rlf"');
  });
});

describe('toCsv', () => {
  interface Row {
    id: number;
    name: string;
    note: string | null;
  }
  const columns: CsvColumn<Row>[] = [
    { header: 'id', accessor: (r) => r.id },
    { header: 'name', accessor: (r) => r.name },
    { header: 'note', accessor: (r) => r.note },
  ];

  it('emits header row then one row per record', () => {
    const csv = toCsv<Row>(
      [
        { id: 1, name: 'alpha', note: 'first' },
        { id: 2, name: 'beta', note: null },
      ],
      columns,
    );
    expect(csv).toBe('id,name,note\n1,alpha,first\n2,beta,');
  });

  it('escapes cells containing commas', () => {
    const csv = toCsv<Row>([{ id: 1, name: 'a,b', note: 'ok' }], columns);
    expect(csv).toBe('id,name,note\n1,"a,b",ok');
  });

  it('handles empty input by emitting just the header', () => {
    expect(toCsv<Row>([], columns)).toBe('id,name,note');
  });
});

describe('downloadBlob / downloadCsv', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL = vi.fn(() => 'blob:fake-url');
    revokeObjectURL = vi.fn();
    // jsdom doesn't implement these by default.
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    clickSpy.mockRestore();
  });

  it('creates an object URL, clicks an anchor, then revokes on next tick', () => {
    const blob = new Blob(['hi'], { type: 'text/plain' });
    downloadBlob(blob, 'hi.txt');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  it('downloadCsv wraps the string in a text/csv blob', () => {
    downloadCsv('out.csv', 'a,b\n1,2');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(blob.size).toBe('a,b\n1,2'.length);
  });
});

describe('svgToPngBlob / downloadSvgAsPng', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:svg-url');
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });

    // jsdom Image doesn't auto-fire onload — stub it.
    class StubImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';
      get src(): string {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        // Defer so callers can wire onload before it fires.
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal('Image', StubImage);

    // jsdom canvas.getContext returns null; stub a minimal 2D context + toBlob.
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      scale: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
    })) as unknown as HTMLCanvasElement['getContext'];
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
      cb(new Blob(['png-bytes'], { type: 'image/png' }));
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeSvg(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '100');
    Object.defineProperty(svg, 'getBoundingClientRect', {
      value: () => ({ width: 200, height: 100, top: 0, left: 0, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }),
    });
    document.body.appendChild(svg);
    return svg as SVGSVGElement;
  }

  it('rasterises an SVG to a PNG blob', async () => {
    const svg = makeSvg();
    const blob = await svgToPngBlob(svg, { pixelRatio: 2 });
    expect(blob.type).toBe('image/png');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    // SVG blob is revoked when the Image finishes loading.
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:svg-url');
  });

  it('downloadSvgAsPng triggers a second createObjectURL for the PNG blob', async () => {
    const svg = makeSvg();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await downloadSvgAsPng(svg, 'chart.png');
    // 1 for the source SVG, 1 for the resulting PNG.
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });
});
