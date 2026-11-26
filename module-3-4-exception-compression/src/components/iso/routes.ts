import type { GridPt } from './iso';

type XY = [number, number];

/** Leave `a` along the x axis, turn once, arrive at `b` along the y axis. */
export function viaX(a: XY, b: XY, z = 0, padA = 2.4, padB = 2.4): GridPt[] {
  const sx = Math.sign(b[0] - a[0]) || 1;
  const sy = Math.sign(b[1] - a[1]) || -1;
  return [
    [a[0] + sx * padA, a[1], z],
    [b[0], a[1], z],
    [b[0], b[1] - sy * padB, z],
  ];
}

/** Leave `a` along the y axis, turn once, arrive at `b` along the x axis. */
export function viaY(a: XY, b: XY, z = 0, padA = 2.4, padB = 2.4): GridPt[] {
  const sx = Math.sign(b[0] - a[0]) || 1;
  const sy = Math.sign(b[1] - a[1]) || -1;
  return [
    [a[0], a[1] + sy * padA, z],
    [a[0], b[1], z],
    [b[0] - sx * padB, b[1], z],
  ];
}

/** Straight run along one axis between two points that share x or y. */
export function straight(a: XY, b: XY, z = 0, padA = 2.4, padB = 2.4): GridPt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return [
    [a[0] + ux * padA, a[1] + uy * padA, z],
    [b[0] - ux * padB, b[1] - uy * padB, z],
  ];
}
