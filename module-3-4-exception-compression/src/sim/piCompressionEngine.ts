export interface PIEvent {
  time: number;
  value: number;
}

export type EventStatus =
  | 'raw'
  | 'exc-pass'
  | 'exc-discard'
  | 'exc-previous'
  | 'exc-max-force'
  | 'exc-min-block'
  | 'comp-archive'
  | 'comp-discard'
  | 'comp-max-force'
  | 'comp-bypass-off'
  | 'comp-bypass-ooo'
  | 'comp-step-archive'
  | 'comp-step-discard';

export interface AnnotatedEvent extends PIEvent {
  status: EventStatus;
  reason: string;
  excDevAtTime?: number;
  compDevAtTime?: number;
  slopeMin?: number;
  slopeMax?: number;
  slopeRef?: number;
}

export interface ExceptionState {
  lastReported: PIEvent | null;
  lastReportedTime: number;
  heldPrevious: PIEvent | null;
}

export interface CompressionState {
  lastArchived: PIEvent | null;
  currentSnapshot: PIEvent | null;
  slopeMin: number;
  slopeMax: number;
  lastArchivedTime: number;
}

export interface PIPointConfig {
  span: number;
  zero: number;
  excDev: number;
  excDevPercent: number;
  excMax: number;
  excMin: number;
  compDev: number;
  compDevPercent: number;
  compMax: number;
  compMin: number;
  step: 0 | 1;
  compressing: 0 | 1;
}

export function defaultConfig(): PIPointConfig {
  return {
    span: 100,
    zero: 0,
    excDev: 1.0,
    excDevPercent: 1.0,
    excMax: 600,
    excMin: 0,
    compDev: 2.0,
    compDevPercent: 2.0,
    compMax: 28800,
    compMin: 0,
    step: 0,
    compressing: 1,
  };
}

export function excDevFromPercent(span: number, pct: number): number {
  return (span * pct) / 100;
}

export function compDevFromPercent(span: number, pct: number): number {
  return (span * pct) / 100;
}

export function syncExcDev(cfg: PIPointConfig, changedField: 'dev' | 'pct'): PIPointConfig {
  if (changedField === 'pct') {
    return { ...cfg, excDev: excDevFromPercent(cfg.span, cfg.excDevPercent) };
  }
  const pct = cfg.span > 0 ? (cfg.excDev / cfg.span) * 100 : 0;
  return { ...cfg, excDevPercent: pct };
}

export function syncCompDev(cfg: PIPointConfig, changedField: 'dev' | 'pct'): PIPointConfig {
  if (changedField === 'pct') {
    return { ...cfg, compDev: compDevFromPercent(cfg.span, cfg.compDevPercent) };
  }
  const pct = cfg.span > 0 ? (cfg.compDev / cfg.span) * 100 : 0;
  return { ...cfg, compDevPercent: pct };
}

// --- Exception Reporting Engine ---
// Runs on the INTERFACE node. Uses simple deadband algorithm.
// When exceedance triggers, sends BOTH the new value AND the previous held value.

export function createExceptionState(): ExceptionState {
  return { lastReported: null, lastReportedTime: -Infinity, heldPrevious: null };
}

export function runExceptionTest(
  event: PIEvent,
  state: ExceptionState,
  cfg: PIPointConfig
): { results: AnnotatedEvent[]; newState: ExceptionState } {
  const excDev = cfg.excDev;

  if (!state.lastReported) {
    const reported: AnnotatedEvent = {
      ...event,
      status: 'exc-pass',
      reason: 'First event — always reported',
      excDevAtTime: excDev,
    };
    return {
      results: [reported],
      newState: {
        lastReported: event,
        lastReportedTime: event.time,
        heldPrevious: null,
      },
    };
  }

  const timeSinceLastReport = event.time - state.lastReportedTime;
  const deviation = Math.abs(event.value - state.lastReported.value);

  // ExcMin check: suppress if too soon
  if (cfg.excMin > 0 && timeSinceLastReport < cfg.excMin) {
    return {
      results: [{
        ...event,
        status: 'exc-min-block',
        reason: `Blocked: ${timeSinceLastReport.toFixed(1)}s < ExcMin (${cfg.excMin}s)`,
        excDevAtTime: excDev,
      }],
      newState: { ...state, heldPrevious: event },
    };
  }

  // ExcMax check: force report if too long
  if (cfg.excMax > 0 && timeSinceLastReport >= cfg.excMax) {
    const results: AnnotatedEvent[] = [];
    if (state.heldPrevious && state.heldPrevious.time !== event.time) {
      results.push({
        ...state.heldPrevious,
        status: 'exc-previous',
        reason: 'Previous value forwarded with ExcMax-forced event',
        excDevAtTime: excDev,
      });
    }
    results.push({
      ...event,
      status: 'exc-max-force',
      reason: `ExcMax timer expired (${timeSinceLastReport.toFixed(1)}s >= ${cfg.excMax}s)`,
      excDevAtTime: excDev,
    });
    return {
      results,
      newState: {
        lastReported: event,
        lastReportedTime: event.time,
        heldPrevious: null,
      },
    };
  }

  // Deadband check
  if (deviation > excDev) {
    const results: AnnotatedEvent[] = [];
    // Forward the previous held value along with the triggering value
    if (state.heldPrevious && state.heldPrevious.time !== event.time) {
      results.push({
        ...state.heldPrevious,
        status: 'exc-previous',
        reason: `Previous value forwarded (deviation was ${Math.abs(state.heldPrevious.value - state.lastReported!.value).toFixed(3)} ≤ ExcDev ${excDev.toFixed(3)})`,
        excDevAtTime: excDev,
      });
    }
    results.push({
      ...event,
      status: 'exc-pass',
      reason: `Deviation ${deviation.toFixed(3)} > ExcDev ${excDev.toFixed(3)}`,
      excDevAtTime: excDev,
    });
    return {
      results,
      newState: {
        lastReported: event,
        lastReportedTime: event.time,
        heldPrevious: null,
      },
    };
  }

  // Within deadband — discard but hold as potential "previous"
  return {
    results: [{
      ...event,
      status: 'exc-discard',
      reason: `Within deadband: deviation ${deviation.toFixed(3)} ≤ ExcDev ${excDev.toFixed(3)}`,
      excDevAtTime: excDev,
    }],
    newState: { ...state, heldPrevious: event },
  };
}


// --- Swinging-Door Compression Engine ---
// Runs on the DATA ARCHIVE server (pisnapss).

export function createCompressionState(): CompressionState {
  return {
    lastArchived: null,
    currentSnapshot: null,
    slopeMin: -Infinity,
    slopeMax: Infinity,
    lastArchivedTime: -Infinity,
  };
}

function calcSlopes(
  archived: PIEvent,
  snapshot: PIEvent,
  compDev: number
): { slopeMin: number; slopeMax: number } {
  const dt = snapshot.time - archived.time;
  if (dt <= 0) return { slopeMin: -Infinity, slopeMax: Infinity };
  return {
    slopeMax: (snapshot.value + compDev - archived.value) / dt,
    slopeMin: (snapshot.value - compDev - archived.value) / dt,
  };
}

export function runCompressionTest(
  event: PIEvent,
  state: CompressionState,
  cfg: PIPointConfig
): { results: AnnotatedEvent[]; newState: CompressionState } {
  const compDev = cfg.compDev;

  // First event ever — archive it
  if (!state.lastArchived) {
    const archived: AnnotatedEvent = {
      ...event,
      status: 'comp-archive',
      reason: 'First event — always archived',
      compDevAtTime: compDev,
    };
    return {
      results: [archived],
      newState: {
        lastArchived: event,
        currentSnapshot: null,
        slopeMin: -Infinity,
        slopeMax: Infinity,
        lastArchivedTime: event.time,
      },
    };
  }

  // Compression disabled — bypass straight to archive
  if (cfg.compressing === 0) {
    return {
      results: [{
        ...event,
        status: 'comp-bypass-off',
        reason: 'Compressing=OFF — all events bypass to archive',
        compDevAtTime: compDev,
      }],
      newState: {
        ...state,
        lastArchived: event,
        currentSnapshot: null,
        slopeMin: -Infinity,
        slopeMax: Infinity,
        lastArchivedTime: event.time,
      },
    };
  }

  // Out-of-order event — bypass compression
  if (state.currentSnapshot && event.time < state.currentSnapshot.time) {
    return {
      results: [{
        ...event,
        status: 'comp-bypass-ooo',
        reason: `OOO event (${event.time.toFixed(1)}s < snapshot ${state.currentSnapshot.time.toFixed(1)}s) — bypasses compression`,
        compDevAtTime: compDev,
      }],
      newState: state,
    };
  }

  // No snapshot yet — this event becomes the first snapshot
  if (!state.currentSnapshot) {
    const slopes = calcSlopes(state.lastArchived, event, compDev);
    return {
      results: [{
        ...event,
        status: 'comp-discard',
        reason: 'Becomes first snapshot after archive event',
        compDevAtTime: compDev,
        slopeMin: slopes.slopeMin,
        slopeMax: slopes.slopeMax,
      }],
      newState: {
        ...state,
        currentSnapshot: event,
        slopeMin: slopes.slopeMin,
        slopeMax: slopes.slopeMax,
      },
    };
  }

  // --- Step=1: simple deadband instead of swinging-door ---
  if (cfg.step === 1) {
    const diff = Math.abs(state.currentSnapshot.value - state.lastArchived!.value);
    const timeSinceArchive = event.time - state.lastArchivedTime;

    // CompMax check
    if (cfg.compMax > 0 && timeSinceArchive >= cfg.compMax) {
      const archived: AnnotatedEvent = {
        ...state.currentSnapshot,
        status: 'comp-max-force',
        reason: `CompMax expired (${timeSinceArchive.toFixed(1)}s >= ${cfg.compMax}s) — snapshot archived`,
        compDevAtTime: compDev,
      };
      return {
        results: [archived, {
          ...event,
          status: 'comp-step-discard',
          reason: 'New snapshot after CompMax-forced archive (Step=1)',
          compDevAtTime: compDev,
        }],
        newState: {
          lastArchived: state.currentSnapshot,
          currentSnapshot: event,
          slopeMin: -Infinity,
          slopeMax: Infinity,
          lastArchivedTime: state.currentSnapshot.time,
        },
      };
    }

    // CompMin check
    const timeSinceLastArchived = state.currentSnapshot.time - state.lastArchivedTime;
    if (cfg.compMin > 0 && timeSinceLastArchived < cfg.compMin) {
      return {
        results: [{
          ...event,
          status: 'comp-step-discard',
          reason: `Step=1: CompMin not met (${timeSinceLastArchived.toFixed(1)}s < ${cfg.compMin}s)`,
          compDevAtTime: compDev,
        }],
        newState: { ...state, currentSnapshot: event },
      };
    }

    if (diff > compDev) {
      const archived: AnnotatedEvent = {
        ...state.currentSnapshot,
        status: 'comp-step-archive',
        reason: `Step=1: |snapshot - lastArchive| = ${diff.toFixed(3)} > CompDev ${compDev.toFixed(3)}`,
        compDevAtTime: compDev,
      };
      return {
        results: [archived, {
          ...event,
          status: 'comp-step-discard',
          reason: 'New snapshot after Step=1 archive',
          compDevAtTime: compDev,
        }],
        newState: {
          lastArchived: state.currentSnapshot,
          currentSnapshot: event,
          slopeMin: -Infinity,
          slopeMax: Infinity,
          lastArchivedTime: state.currentSnapshot.time,
        },
      };
    }

    return {
      results: [{
        ...event,
        status: 'comp-step-discard',
        reason: `Step=1: |snapshot - lastArchive| = ${diff.toFixed(3)} ≤ CompDev ${compDev.toFixed(3)}`,
        compDevAtTime: compDev,
      }],
      newState: { ...state, currentSnapshot: event },
    };
  }

  // --- Step=0: Swinging-Door Compression ---
  const A = state.lastArchived!;
  const S = state.currentSnapshot;
  const N = event;

  const timeSinceArchive = N.time - state.lastArchivedTime;

  // CompMax check
  if (cfg.compMax > 0 && timeSinceArchive >= cfg.compMax) {
    const newSlopes = calcSlopes(S, N, compDev);
    const archived: AnnotatedEvent = {
      ...S,
      status: 'comp-max-force',
      reason: `CompMax expired (${timeSinceArchive.toFixed(1)}s >= ${cfg.compMax}s) — snapshot archived`,
      compDevAtTime: compDev,
      slopeMin: state.slopeMin,
      slopeMax: state.slopeMax,
    };
    return {
      results: [archived, {
        ...N,
        status: 'comp-discard',
        reason: 'New snapshot after CompMax-forced archive',
        compDevAtTime: compDev,
        slopeMin: newSlopes.slopeMin,
        slopeMax: newSlopes.slopeMax,
      }],
      newState: {
        lastArchived: S,
        currentSnapshot: N,
        slopeMin: newSlopes.slopeMin,
        slopeMax: newSlopes.slopeMax,
        lastArchivedTime: S.time,
      },
    };
  }

  // Calculate reference slope from A to N
  const dtAN = N.time - A.time;
  const slopeRef = dtAN > 0 ? (N.value - A.value) / dtAN : 0;

  // Check if reference slope is within the corridor
  if (slopeRef >= state.slopeMin && slopeRef <= state.slopeMax) {
    // Snapshot NOT needed — discard S, N becomes new snapshot
    // Recalculate slopes with narrowing-angle rule
    const newCalcSlopes = calcSlopes(A, N, compDev);
    const newSlopeMin = Math.max(state.slopeMin, newCalcSlopes.slopeMin);
    const newSlopeMax = Math.min(state.slopeMax, newCalcSlopes.slopeMax);

    // CompMin check
    const timeSinceLastArchived = S.time - state.lastArchivedTime;
    if (cfg.compMin > 0 && timeSinceLastArchived < cfg.compMin) {
      return {
        results: [{
          ...N,
          status: 'comp-discard',
          reason: `Slope ${slopeRef.toFixed(4)} within corridor [${state.slopeMin.toFixed(4)}, ${state.slopeMax.toFixed(4)}] — snapshot discarded`,
          compDevAtTime: compDev,
          slopeMin: newSlopeMin,
          slopeMax: newSlopeMax,
          slopeRef,
        }],
        newState: {
          ...state,
          currentSnapshot: N,
          slopeMin: newSlopeMin,
          slopeMax: newSlopeMax,
        },
      };
    }

    return {
      results: [{
        ...N,
        status: 'comp-discard',
        reason: `Slope ${slopeRef.toFixed(4)} within corridor [${state.slopeMin.toFixed(4)}, ${state.slopeMax.toFixed(4)}] — snapshot discarded`,
        compDevAtTime: compDev,
        slopeMin: newSlopeMin,
        slopeMax: newSlopeMax,
        slopeRef,
      }],
      newState: {
        ...state,
        currentSnapshot: N,
        slopeMin: newSlopeMin,
        slopeMax: newSlopeMax,
      },
    };
  }

  // Snapshot IS significant — archive S
  const newSlopes = calcSlopes(S, N, compDev);
  const archived: AnnotatedEvent = {
    ...S,
    status: 'comp-archive',
    reason: `Slope ${slopeRef.toFixed(4)} outside corridor [${state.slopeMin.toFixed(4)}, ${state.slopeMax.toFixed(4)}] — snapshot archived`,
    compDevAtTime: compDev,
    slopeMin: state.slopeMin,
    slopeMax: state.slopeMax,
    slopeRef,
  };

  return {
    results: [archived, {
      ...N,
      status: 'comp-discard',
      reason: 'New snapshot after compression archive',
      compDevAtTime: compDev,
      slopeMin: newSlopes.slopeMin,
      slopeMax: newSlopes.slopeMax,
    }],
    newState: {
      lastArchived: S,
      currentSnapshot: N,
      slopeMin: newSlopes.slopeMin,
      slopeMax: newSlopes.slopeMax,
      lastArchivedTime: S.time,
    },
  };
}


// --- Signal Generators ---
export type SignalPreset = 'steady' | 'noisy-flow' | 'valve-step' | 'ramp' | 'sine';

export function generateSignal(
  preset: SignalPreset,
  numPoints: number,
  scanInterval: number,
  cfg: PIPointConfig
): PIEvent[] {
  const events: PIEvent[] = [];
  const mid = cfg.zero + cfg.span / 2;
  const amp = cfg.span * 0.3;

  for (let i = 0; i < numPoints; i++) {
    const t = i * scanInterval;
    let v: number;

    switch (preset) {
      case 'steady':
        v = mid + (Math.random() - 0.5) * cfg.span * 0.005;
        break;
      case 'noisy-flow':
        v = mid + amp * Math.sin(t * 0.02) + (Math.random() - 0.5) * cfg.span * 0.08;
        break;
      case 'valve-step':
        if (t < numPoints * scanInterval * 0.3) v = mid - amp * 0.5;
        else if (t < numPoints * scanInterval * 0.35) v = mid - amp * 0.5 + (amp * (t - numPoints * scanInterval * 0.3)) / (numPoints * scanInterval * 0.05);
        else if (t < numPoints * scanInterval * 0.7) v = mid + amp * 0.5 + (Math.random() - 0.5) * cfg.span * 0.01;
        else v = mid + amp * 0.5 - (amp * (t - numPoints * scanInterval * 0.7)) / (numPoints * scanInterval * 0.05);
        v = Math.max(cfg.zero, Math.min(cfg.zero + cfg.span, v));
        break;
      case 'ramp':
        v = cfg.zero + (cfg.span * i) / numPoints;
        break;
      case 'sine':
        v = mid + amp * Math.sin(t * 0.05);
        break;
      default:
        v = mid;
    }

    events.push({ time: t, value: v });
  }

  return events;
}


// --- Full Pipeline Runner ---
export interface PipelineResult {
  rawEvents: PIEvent[];
  exceptionResults: AnnotatedEvent[];
  compressionResults: AnnotatedEvent[];
  archivedEvents: AnnotatedEvent[];
  stats: {
    rawCount: number;
    afterException: number;
    afterCompression: number;
    compressionRatio: number;
    excDiscarded: number;
    compDiscarded: number;
  };
}

export function runFullPipeline(
  rawEvents: PIEvent[],
  cfg: PIPointConfig
): PipelineResult {
  let excState = createExceptionState();
  let compState = createCompressionState();

  const exceptionResults: AnnotatedEvent[] = [];
  const compressionResults: AnnotatedEvent[] = [];
  const archivedEvents: AnnotatedEvent[] = [];

  const eventsPassingException: AnnotatedEvent[] = [];

  for (const event of rawEvents) {
    const excResult = runExceptionTest(event, excState, cfg);
    excState = excResult.newState;

    for (const r of excResult.results) {
      exceptionResults.push(r);
      if (r.status === 'exc-pass' || r.status === 'exc-previous' || r.status === 'exc-max-force') {
        eventsPassingException.push(r);
      }
    }
  }

  for (const event of eventsPassingException) {
    const compResult = runCompressionTest(
      { time: event.time, value: event.value },
      compState,
      cfg
    );
    compState = compResult.newState;

    for (const r of compResult.results) {
      compressionResults.push(r);
      if (
        r.status === 'comp-archive' ||
        r.status === 'comp-max-force' ||
        r.status === 'comp-bypass-off' ||
        r.status === 'comp-bypass-ooo' ||
        r.status === 'comp-step-archive'
      ) {
        archivedEvents.push(r);
      }
    }
  }

  const excDiscarded = exceptionResults.filter(
    e => e.status === 'exc-discard' || e.status === 'exc-min-block'
  ).length;

  const compDiscarded = compressionResults.filter(
    e => e.status === 'comp-discard' || e.status === 'comp-step-discard'
  ).length;

  return {
    rawEvents,
    exceptionResults,
    compressionResults,
    archivedEvents,
    stats: {
      rawCount: rawEvents.length,
      afterException: eventsPassingException.length,
      afterCompression: archivedEvents.length,
      compressionRatio: rawEvents.length > 0
        ? ((1 - archivedEvents.length / rawEvents.length) * 100)
        : 0,
      excDiscarded,
      compDiscarded,
    },
  };
}
