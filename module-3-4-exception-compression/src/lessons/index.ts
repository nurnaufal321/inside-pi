import type { Chapter, Lesson } from './types';
import tagAnatomy from './tag-anatomy';
import dataPipeline from './data-pipeline';
import exceptionCompression from './exception-compression';
import snapshotQueue from './snapshot-queue';
import buffering from './buffering';
import archiveLifecycle from './archive-lifecycle';
import security from './security';
import afElementsTemplates from './af-elements-templates';
import afAttributes from './af-attributes';
import afEventFrames from './af-event-frames';
import afSecurity from './af-security';
import anExpressions from './an-expressions';
import anRollupsSqc from './an-rollups-sqc';
import anEfGeneration from './an-ef-generation';
import anBackfill from './an-backfill';
import daCollectives from './da-collectives';
import daBackups from './da-backups';
import daTuning from './da-tuning';
import ifUniint from './if-uniint';
import ifFailover from './if-failover';
import ifPiToPi from './if-pi-to-pi';
import cnConnectors from './cn-connectors';
import cnAdaptersOmf from './cn-adapters-omf';
import viDisplays from './vi-displays';
import viDatalink from './vi-datalink';
import viMigration from './vi-migration';
import dvWebApi from './dv-web-api';

export const CHAPTERS: Chapter[] = [
  { id: 'foundations', title: 'Foundations', color: '#d5b07a' },
  { id: 'data-flow', title: 'Data Flow', color: '#3fa456' },
  { id: 'reliability', title: 'Reliability', color: '#2f86ce' },
  { id: 'security', title: 'Security', color: '#d9577a' },
  { id: 'asset-framework', title: 'Asset Framework', color: '#8a6fd1' },
  { id: 'af-analytics', title: 'AF Analytics', color: '#e08a3c' },
  { id: 'da-operations', title: 'Data Archive Operations', color: '#2aa39a' },
  { id: 'interfaces', title: 'PI Interfaces', color: '#c4683f' },
  { id: 'connectors', title: 'Connectors & Adapters', color: '#5b7fd6' },
  { id: 'visualization', title: 'Visualization', color: '#b3922c' },
  { id: 'developer-access', title: 'Developer Access', color: '#cf5fa8' },
];

export const LESSONS: Lesson[] = [
  tagAnatomy,
  dataPipeline,
  exceptionCompression,
  snapshotQueue,
  buffering,
  archiveLifecycle,
  security,
  afElementsTemplates,
  afAttributes,
  afEventFrames,
  afSecurity,
  anExpressions,
  anRollupsSqc,
  anEfGeneration,
  anBackfill,
  daCollectives,
  daBackups,
  daTuning,
  ifUniint,
  ifFailover,
  ifPiToPi,
  cnConnectors,
  cnAdaptersOmf,
  viDisplays,
  viDatalink,
  viMigration,
  dvWebApi,
];
