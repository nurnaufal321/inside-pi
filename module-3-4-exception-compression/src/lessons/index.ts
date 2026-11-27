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

export const CHAPTERS: Chapter[] = [
  { id: 'foundations', title: 'Foundations', color: '#d5b07a' },
  { id: 'data-flow', title: 'Data Flow', color: '#3fa456' },
  { id: 'reliability', title: 'Reliability', color: '#2f86ce' },
  { id: 'security', title: 'Security', color: '#d9577a' },
  { id: 'asset-framework', title: 'Asset Framework', color: '#8a6fd1' },
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
];
