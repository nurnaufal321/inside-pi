import { lazy } from 'react';
import { Activity, Boxes, Database, EyeOff, Fan, GitBranch, LayoutTemplate, Layers, Lock, Plus, Puzzle, RefreshCw, Variable } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill } from '../components/iso/primitives';
import { straight, viaY } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Columns: PI points (x −12) · elements (x 0) · library (x 12, base at 22).
 * A 3×3 iso grid needs wider spacing than a single row: 12 between columns, 9 between rows.
 */
const BT: [number, number] = [22, 0];
const PT: [number, number] = [12, 0];
const E: [number, number][] = [[0, 9], [0, 0], [0, -9]];
const T: [number, number][] = [[-12, 9], [-12, 0], [-12, -9]];
const NAMES = ['P-101', 'P-102', 'P-103'];

const btToPt: GridPt[] = straight(BT, PT);
const ptToE: GridPt[][] = [viaY(PT, E[0]), straight(PT, E[1]), viaY(PT, E[2])];
const eToT: GridPt[][] = E.map((e, i) => straight(e, T[i], 0, 2.4, 1.9));
const tToE: GridPt[][] = eToT.map(p => [...p].reverse());

const TOP = { x: -46, y: -100 };
const BOTTOM = { x: 14, y: 50 };

/** Layout shared with the Try it simulation. */
export const AF_LAYOUT = { BT, PT, E, T, NAMES, TOP, BOTTOM, paths: { btToPt, ptToE, eToT, tToE } };

function Scene({ step }: SceneProps) {
  const created = step >= 3;
  const refs = step >= 4;
  const locked = step >= 5;
  const propagate = step === 6;
  const base = step >= 7;
  const ext = step >= 8;

  return (
    <g>
      <Link pts={btToPt} show={base} />
      {ptToE.map((p, i) => <Link key={`c${i}`} pts={p} show={created} kind={propagate ? 'solid' : created && step > 3 ? 'muted' : 'solid'} />)}
      {eToT.map((p, i) => <Link key={`r${i}`} pts={p} show={refs} kind={locked ? 'solid' : 'muted'} />)}

      <Flow pts={btToPt} n={2} dur={1.8} kind="blue" show={step === 7} />
      {ptToE.map((p, i) => <Flow key={`f${i}`} pts={p} n={2} dur={1.8} kind="blue" show={step === 3 || propagate} delay={i * 0.2} />)}
      {tToE.map((p, i) => <Flow key={`v${i}`} pts={p} n={2} dur={1.6} kind="ok" show={locked} delay={i * 0.3} />)}

      {T.map((t, i) => (
        <Ent key={NAMES[i]} x={t[0]} y={t[1]}>
          <Cylinder rx={26} h={40} tint="purple" dim={!refs} icon={i === 2 ? Database : undefined} glow={step === 4 || step === 5 ? 'var(--purple-side-b)' : undefined} />
          <Pill text={`${NAMES[i]}.Flow`} x={14} y={42} mono />
        </Ent>
      ))}
      {refs && (
        <Ent x={T[2][0]} y={T[2][1]}>
          <Pill text="PI Data Archive" tone="dark" x={-50} y={-86} />
        </Ent>
      )}

      {E.map((e, i) => (
        <Ent key={NAMES[i]} x={e[0]} y={e[1]}>
          <Block label={NAMES[i]} icon={Fan} tint={created || step === 0 ? 'green' : 'grey'} dim={step > 0 && step < 3} glow={step === 0 || propagate || (ext && i === 2) ? 'var(--green-side-b)' : undefined} />
          {step === 0 && i === 0 && <Pill text="Flow · Pressure · Speed — by hand" icon={Activity} tone="warn" {...TOP} />}
          {step === 3 && i === 0 && <Pill text="parent-child" icon={GitBranch} {...TOP} />}
          {step === 5 && i === 0 && <Pill text="locked in" icon={Lock} tone="good" {...TOP} />}
          {propagate && i === 0 && <Pill text="+ Vibration" icon={Plus} tone="good" {...TOP} />}
          {ext && i === 2 && <Pill text="+ Seal Temp (extension)" icon={Puzzle} tone="violet" {...TOP} />}
          {i === 0 && <Pill text="elements" {...BOTTOM} mono />}
        </Ent>
      ))}

      <Ent x={PT[0]} y={PT[1]}>
        <Block label="Pump" icon={LayoutTemplate} tint="blue" dim={step === 0} glow={step >= 1 && step <= 2 ? 'var(--blue-side-b)' : propagate ? 'var(--blue-side-b)' : undefined} />
        {step === 2 && <Pill text="Flow · Pressure · Speed" icon={Layers} {...TOP} />}
        {step === 4 && <Pill text="\\%Server%\%Element%.%Attribute%" icon={Variable} x={14} y={78} mono />}
        {propagate && <Pill text="edit once" icon={RefreshCw} tone="good" {...TOP} />}
        <Pill text={base ? 'derived template' : 'element template'} {...BOTTOM} mono />
      </Ent>

      <Ent x={BT[0]} y={BT[1]} show={base}>
        <Block label={['Rotating', 'Equipment']} icon={Boxes} tint="grey" glow={step === 7 ? 'var(--grey-side-b)' : undefined} />
        {step === 7 && <Pill text="base template only" icon={EyeOff} tone="dark" x={10} y={-92} />}
        <Pill text="base template" {...BOTTOM} mono />
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [0, -45, 1.05],
  [168, 40, 1.3],
  [150, 40, 1.25],
  [60, -10, 1.0],
  [20, -40, 0.95],
  [-110, -70, 1.05],
  [60, -10, 1.0],
  [230, 80, 1.2],
  [126, -105, 1.3],
  [10, -10, 0.85],
];

const lesson: Lesson = {
  id: 'af-elements-templates',
  chapter: 'asset-framework',
  title: 'Elements & Templates',
  subtitle: 'Model one pump, build a hundred — and see how a template reaches every element and its PI points.',
  minutes: 10,
  level: 'Beginner',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'template → element', color: 'var(--pkt-blue)' },
    { label: 'PI point value', color: 'var(--pkt-ok)' },
  ],
  learn: [
    { text: 'What an element and an element template are', at: 1 },
    { text: 'How attribute templates become attributes', at: 2 },
    { text: 'How substitution parameters pick each element’s PI point', at: 4 },
    { text: 'Why Create or Update Data Reference locks a reference in', at: 5 },
    { text: 'How base, derived and BTO templates fit together', at: 7 },
    { text: 'When to allow extensions', at: 8 },
  ],
  steps: [
    {
      short: 'Many pumps',
      title: 'Three pumps, nine attributes, by hand',
      tag: 'problem',
      body: [
        'Each pump on the plant needs the same data: a flow, a discharge pressure, a speed. Built one element at a time, that is nine attributes to configure — and to keep consistent forever.',
        'At three pumps it is tedious. At three hundred it is how a model drifts out of shape.',
      ],
      callout: { kind: 'idea', text: 'In PI AF an *element* represents a piece of equipment. The question is how to build many alike.' },
      metrics: [
        { label: 'Elements', value: '3', icon: Fan },
        { label: 'Attributes', value: '9 by hand', icon: Activity, tone: 'warn' },
      ],
    },
    {
      short: 'Template',
      title: 'An element template models the asset type',
      tag: 'concept',
      body: [
        'An *element template* is a model of an asset type, such as a pump or a tank. Equipment of the same type shares one implementation, which makes displays, notifications, calculations and analytics much simpler.',
        'You define the type once in the *Library*; elements are then created from it.',
      ],
      callout: { kind: 'tip', text: 'AVEVA’s advice: base elements on templates in almost every case, and start by modelling a single asset type.' },
      changed: [{ kind: 'add', text: 'Pump element template in the Library' }],
      metrics: [
        { label: 'Templates', value: '1', icon: LayoutTemplate },
        { label: 'Elements', value: '3', icon: Fan },
      ],
    },
    {
      short: 'Attributes',
      title: 'Attribute templates become attributes',
      tag: 'mechanism',
      body: [
        'Just as an element template represents a type of asset, an *attribute template* represents a type of data configuration. Pump gets three: `Flow`, `Pressure`, `Speed`.',
        'Every element created from Pump gets one attribute per attribute template, inheriting all its properties. You still give each attribute a value.',
      ],
      changed: [{ kind: 'add', text: '3 attribute templates on Pump' }],
      metrics: [
        { label: 'Attribute templates', value: '3', icon: Layers },
        { label: 'Configured', value: 'once', icon: LayoutTemplate, tone: 'good' },
      ],
    },
    {
      short: 'Create',
      title: 'Create elements from the template',
      tag: 'mechanism',
      body: [
        'In the Elements browser: *New Element*, choose the template, and choose a reference type — the default is *parent-child*.',
        'Because the element is based on a template, most fields on its General tab are read-only, and you can’t add attributes unless the template allows extensions. Check in to save.',
      ],
      callout: { kind: 'tip', text: 'Templates can restrict which parent and child reference types their elements may use.' },
      changed: [
        { kind: 'add', text: 'P-101, P-102, P-103 created from Pump' },
        { kind: 'mod', text: 'Attributes 9 by hand → 9 from 3 templates' },
      ],
      metrics: [
        { label: 'Elements', value: '3', icon: Fan, tone: 'good' },
        { label: 'Attributes', value: '9', icon: Layers },
        { label: 'Hand-built', value: '0', icon: Activity, tone: 'good' },
      ],
    },
    {
      short: 'Substitution',
      title: 'One pattern, a different PI point per element',
      tag: 'mechanism',
      body: [
        'The `Flow` attribute template uses a *PI point data reference*. Its configuration string holds *substitution parameters*: `\\\\%Server%\\%Element%.%Attribute%`.',
        '`%Server%` is the default Data Archive, `%Element%` the name of the element holding the attribute, `%Attribute%` the attribute’s own name. So P-101 resolves to `P-101.Flow`, P-102 to `P-102.Flow`.',
      ],
      callout: { kind: 'idea', text: 'Substitution parameters are why one template can serve every pump: the template holds the rule, each element supplies its name.' },
      changed: [{ kind: 'add', text: 'Data reference pattern on the Flow template' }],
      metrics: [
        { label: 'Pattern', value: '1', icon: Variable },
        { label: 'Resolves to', value: '3 points', icon: Database },
      ],
    },
    {
      short: 'Lock-in',
      title: 'Nothing resolves until you ask',
      tag: 'gotcha',
      body: [
        'PI AF does *not* create the PI point data references automatically when it creates the attributes. Right-click the element and choose *Create or Update Data Reference*.',
        'That replaces every substitution parameter with its value at that moment and *locks in* the reference. From then on, changes to the attribute template no longer affect it.',
      ],
      callout: { kind: 'warn', text: 'Change the tag pattern later and locked-in attributes keep their old points until you run Create or Update Data Reference again — or use *Reset to Template*.' },
      changed: [
        { kind: 'mod', text: 'References locked in: 0 → 3' },
        { kind: 'add', text: 'Values flowing from PI points' },
      ],
      metrics: [
        { label: 'Locked in', value: '3 / 3', icon: Lock, tone: 'good' },
        { label: 'Template edits', value: 'ignored', icon: LayoutTemplate, tone: 'warn' },
      ],
    },
    {
      short: 'Propagate',
      title: 'Edit the template, every element follows',
      tag: 'mechanism',
      body: [
        'Add a `Vibration` attribute template to Pump and all three elements get a `Vibration` attribute. When you change an element template, the change propagates to every element derived from it.',
        'A single template modification can alter hundreds of elements — that is the point, and also the risk.',
      ],
      callout: { kind: 'warn', text: 'Deleting an element template deletes any notification or analysis templates that target it.' },
      changed: [{ kind: 'add', text: 'Vibration on Pump → on P-101, P-102, P-103' }],
      metrics: [
        { label: 'Edits', value: '1', icon: RefreshCw },
        { label: 'Elements changed', value: '3', icon: Fan, tone: 'good' },
        { label: 'Attributes', value: '12', icon: Layers },
      ],
    },
    {
      short: 'Base & derived',
      title: 'Base templates for families of assets',
      tag: 'concept',
      body: [
        'When asset types share most attributes, put the shared ones in a *base template* and derive from it. The derived template inherits every attribute, port and analysis of its base; elements built from it get both sets.',
        'Mark the base *Base Template Only* (BTO) and nobody can create an element from it directly. To override an inherited attribute, add an attribute template with exactly the same name in the derived template; set it to *Excluded* to hide it.',
      ],
      callout: { kind: 'tip', text: 'Arrange the Library by template inheritance to see the base → derived tree.' },
      changed: [{ kind: 'add', text: 'Rotating Equipment (BTO) → Pump' }],
      metrics: [
        { label: 'Base', value: 'BTO', icon: Boxes },
        { label: 'Derived', value: 'Pump', icon: LayoutTemplate },
        { label: 'Direct elements', value: 'blocked', icon: EyeOff, tone: 'warn' },
      ],
    },
    {
      short: 'Extensions',
      title: 'A one-off attribute without a new template',
      tag: 'fix',
      body: [
        'P-103 has a seal temperature probe the others don’t. If the template has *Allow Extensions* checked, an element can carry attributes and ports the template doesn’t define.',
        'Without it, the element’s attribute list is exactly the template’s. Categories, analyses and notifications are not affected by the setting.',
      ],
      callout: { kind: 'tip', text: 'Turn extensions off later and no new ones can be added — but existing extended attributes remain.' },
      changed: [{ kind: 'add', text: 'Seal Temp extension on P-103' }],
      metrics: [
        { label: 'Allow Extensions', value: 'on', icon: Puzzle, tone: 'good' },
        { label: 'P-103 attributes', value: '5', icon: Layers },
      ],
    },
    {
      short: 'Recap',
      title: 'One model, many assets',
      tag: 'recap',
      body: [
        'Base template → derived template → elements → PI points. Attribute templates define the data once; substitution parameters give each element its own points; Create or Update Data Reference resolves and locks them in.',
        'Template edits propagate to elements; locked-in references don’t move until you update or reset them.',
      ],
      callout: { kind: 'idea', text: 'When an element shows the “wrong” point, check whether its reference was locked in before the template changed.' },
      metrics: [
        { label: 'Templates', value: '2', icon: LayoutTemplate },
        { label: 'Elements', value: '3', icon: Fan },
        { label: 'PI points', value: '3', icon: Database, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Element templates', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022495.html', desc: 'What a template defines, propagation, extensions, reference types.' },
    { title: 'Learn about attribute templates', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022264.html', desc: 'One attribute per attribute template on every element.' },
    { title: 'Create elements based on a template', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022497.html', desc: 'New Element, choosing a template and reference type.' },
    { title: 'List of PI AF substitution parameters', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022031.html', desc: '%Element%, %..\\Element%, %Attribute%, %Server% and the rest.' },
    { title: 'Attribute-value updates from PI point data references', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021652.html', desc: 'Create or Update Data Reference, lock-in and Reset to Template.' },
    { title: 'Base and derived templates', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021662.html', desc: 'Inheritance, BTO, overriding and excluding attributes.' },
    { title: 'Learn about extensions', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1018887.html', desc: 'Allow Extensions, and what happens when you turn it off.' },
    { title: 'Adopt a template strategy', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022651.html', desc: 'When to use base templates versus extensions.' },
  ],
  TryIt: lazy(() => import('../components/tryit/af-elements-templates')),
};

export default lesson;
