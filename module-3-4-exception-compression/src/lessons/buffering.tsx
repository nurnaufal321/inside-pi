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
  id: 'buffering',
  chapter: 'reliability',
  title: 'Buffering',
  subtitle: 'Work in progress.',
  minutes: 8,
  level: 'Beginner',
  viewBox: '-420 -250 840 500',
  Scene,
  learn: [],
  steps: [{ short: 'Intro', title: 'Buffering', tag: 'concept', body: ['Coming soon.'] }],
  docs: [],
  TryIt: lazy(() => import('../components/module6/Module6')),
};

export default lesson;
