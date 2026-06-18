/**
 * Pure floor-coordinate math (Sprint 64 Phase 1). Kept separate from the
 * component so the placement canvas can stay a component-only module.
 */
import { CoordSystem } from '@/api/generated/models/CoordSystem';

export interface FloorPoint {
  x: number;
  y: number;
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Map a client-space click to floor coordinates. */
export function pixelToFloor(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  extentX: number,
  extentY: number,
  originAnchor: CoordSystem.origin_anchor,
): FloorPoint {
  const fracX = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
  const fracYTop = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
  const x = fracX * extentX;
  // NW origin: y grows downward in screen space. SW origin: y grows upward.
  const yTop = fracYTop * extentY;
  const y = originAnchor === CoordSystem.origin_anchor.SW_CORNER ? extentY - yTop : yTop;
  return { x: round(x), y: round(y) };
}

/** Project a floor point to SVG viewBox space (y-flip for SW origin). */
export function floorToSvg(
  p: FloorPoint,
  extentY: number,
  originAnchor: CoordSystem.origin_anchor,
): FloorPoint {
  return {
    x: p.x,
    y: originAnchor === CoordSystem.origin_anchor.SW_CORNER ? extentY - p.y : p.y,
  };
}

/** Interior grid-line offsets (~10 divisions). */
export function gridLines(extent: number): number[] {
  const raw = extent / 10;
  const step = raw > 0 ? raw : extent;
  const out: number[] = [];
  for (let v = step; v < extent; v += step) out.push(round(v));
  return out;
}
