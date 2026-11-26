import { lazy } from 'react';
import { Block, Ent } from '../components/iso/primitives';
import type { Lesson } from './types';

function Scene() {
  return (
    <Ent x={0} y={0}>
      <Block label="Coming soon" tint="grey" />
    </Ent>
  );
}

const lesson: Lesson = {
  id: 'snapshot-queue',
  chapter: 'data-flow',
  title: 'Snapshot & Event Queue',
  subtitle: 'Work in progress.',
  minutes: 8,
  level: 'Beginner',
  viewBox: '-420 -250 840 500',
  Scene,
  learn: [],
  steps: [{ short: 'Intro', title: 'Snapshot & Event Queue', tag: 'concept', body: ['Coming soon.'] }],
  docs: [],
  TryIt: lazy(() => import('../components/module5/Module5')),
};

export default lesson;
