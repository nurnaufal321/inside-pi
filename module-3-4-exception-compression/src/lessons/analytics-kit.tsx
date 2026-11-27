import { Cpu, Network, Server } from 'lucide-react';
import { Block, Cylinder, Ent, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';

/*
 * Shared layout for the AF Analytics chapter. Data flows right to left (−x):
 * input PI points (x 12, PI Data Archive) → PI Analysis Service (x 0) → output (x −12, PI Data Archive).
 * The AF Server, holding the element and its analysis configuration, sits in front (y 11) and feeds
 * the service along −y.
 */
export const IN_A: [number, number] = [12, -4];
export const IN_B: [number, number] = [12, 4];
export const SVC: [number, number] = [0, 0];
export const OUT: [number, number] = [-12, 0];
export const AFEL: [number, number] = [0, 11];
/** Height of the floors the nodes stand on. */
export const Z = 4;

export const AN_PATHS = {
  inA: [[IN_A[0] - 1.9, IN_A[1], Z], [6, IN_A[1], Z], [6, -0.8, Z], [2.4, -0.8, Z]] as GridPt[],
  inB: [[IN_B[0] - 1.9, IN_B[1], Z], [6, IN_B[1], Z], [6, 0.8, Z], [2.4, 0.8, Z]] as GridPt[],
  out: straight(SVC, OUT, Z, 2.4, 1.9),
  config: [[AFEL[0], AFEL[1] - 2.4, Z], [SVC[0], SVC[1] + 2.4, Z]] as GridPt[],
};

/** Floors and labels for the four systems. `show` hides a floor's label. */
export function AnalyticsFloors({ outLabel = true }: { outLabel?: boolean }) {
  return (
    <g>
      <Ent x={IN_A[0]} y={0}><Slab ax={2.8} ay={7.2} h={4} /></Ent>
      <Ent x={SVC[0]} y={SVC[1]}><Slab ax={3} ay={3} h={4} tint="orange" /></Ent>
      <Ent x={OUT[0]} y={OUT[1]}><Slab ax={2.8} ay={3} h={4} /></Ent>
      <Ent x={AFEL[0]} y={AFEL[1]}><Slab ax={3} ay={3} h={4} /></Ent>
      <Ent x={IN_A[0]} y={7.2}>
        <Pill text="PI Data Archive · inputs" icon={Server} tone="dark" x={40} y={30} />
      </Ent>
      {outLabel && (
        <Ent x={OUT[0]} y={3}>
          <Pill text="PI Data Archive · output" icon={Server} tone="dark" x={-40} y={30} />
        </Ent>
      )}
      <Ent x={AFEL[0]} y={AFEL[1] + 3}>
        <Pill text="PI AF Server" icon={Network} tone="dark" x={-50} y={30} />
      </Ent>
    </g>
  );
}

/** The PI Analysis Service block. */
export function Service({ glow, label = ['PI Analysis', 'Service'] }: { glow?: string; label?: string | string[] }) {
  return (
    <Ent x={SVC[0]} y={SVC[1]} z={Z}>
      <Block label={label} icon={Cpu} tint="orange" glow={glow} />
    </Ent>
  );
}

/** An input or output PI point cylinder with its tag name. */
export function Point({ at, tag, dim, glow, label }: { at: [number, number]; tag: string; dim?: boolean; glow?: string; label?: string }) {
  return (
    <Ent x={at[0]} y={at[1]} z={Z}>
      <Cylinder rx={24} h={36} tint="purple" dim={dim} glow={glow} label={label} />
      <Pill text={tag} x={44} y={14} mono />
    </Ent>
  );
}
