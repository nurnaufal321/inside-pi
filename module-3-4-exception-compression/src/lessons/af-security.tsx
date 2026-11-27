import { lazy } from 'react';
import { Ban, CircleCheck, Database, GitMerge, KeyRound, ListChecks, LockKeyhole, Network, ShieldCheck, UserCog, UserRound, Users } from 'lucide-react';
import { Block, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Tint } from '../components/iso/Defs';
import type { Lesson, SceneProps } from './types';

/*
 * Access flows right to left: Windows groups (x 20) → mappings → AF identities (x 10) → element T-101 (x 0).
 * Alice, another user, sits in front of T-101 and reaches it along −y.
 */
type Row = 'eng' | 'ops' | 'world' | 'admin';
export const SEC_ROWS: { key: Row; group: string; identity: string; y: number; tint: Tint; perms: string }[] = [
  { key: 'eng', group: 'Engineering Team', identity: 'Engineers', y: 9, tint: 'blue', perms: 'r w rd wd' },
  { key: 'ops', group: 'Operators', identity: 'Operators', y: 3, tint: 'green', perms: 'r rd wd' },
  { key: 'world', group: 'Everyone', identity: 'World', y: -3, tint: 'grey', perms: 'r rd' },
  { key: 'admin', group: 'PI Admins', identity: 'Administrators', y: -9, tint: 'purple', perms: 'all' },
];
export const GX = 20;
export const IX = 10;
export const OBJ: [number, number] = [0, 0];
export const ALICE: [number, number] = [0, 11];

const mapping = (y: number): GridPt[] => straight([GX, y], [IX, y], 0, 1.9, 1.9);
const grant = (y: number): GridPt[] => [[IX - 1.9, y, 0], [4.2, y, 0], [4.2, 0.4 * Math.sign(y), 0], [2.4, 0.4 * Math.sign(y), 0]];
export const SEC_PATHS = {
  mapping: Object.fromEntries(SEC_ROWS.map(r => [r.key, mapping(r.y)])) as Record<Row, GridPt[]>,
  grant: Object.fromEntries(SEC_ROWS.map(r => [r.key, grant(r.y)])) as Record<Row, GridPt[]>,
  alice: [[ALICE[0], ALICE[1] - 1.9, 0], [ALICE[0], OBJ[1] + 2.4, 0]] as GridPt[],
};

export function SecFloors() {
  return (
    <g>
      <Ent x={GX} y={0}><Slab ax={2.8} ay={12} h={4} /></Ent>
      <Ent x={5} y={0}><Slab ax={7.8} ay={12} h={4} /></Ent>
      <Ent x={GX} y={12}>
        <Pill text="Windows · Active Directory" icon={Users} tone="dark" x={30} y={26} />
      </Ent>
      <Ent x={5} y={-12}>
        <Pill text="PI AF Server" icon={Network} tone="dark" x={30} y={-30} />
      </Ent>
    </g>
  );
}

const TOP = { x: -46, y: -100 };

function Scene({ step }: SceneProps) {
  const rowsOn = (k: Row) => (step <= 1 ? k === 'eng' : step === 4 ? k === 'eng' || k === 'ops' : step >= 5 && step <= 7 ? k !== 'admin' : true);
  const glowRow = (k: Row) => (step === 1 && k === 'eng') || (step === 2) || (step === 4 && (k === 'eng' || k === 'ops'));

  return (
    <g>
      <SecFloors />
      {SEC_ROWS.map(r => (
        <g key={r.key}>
          <Link pts={SEC_PATHS.mapping[r.key]} show={step >= 1 && rowsOn(r.key)} />
          <Link pts={SEC_PATHS.grant[r.key]} show={step >= 1 && rowsOn(r.key)} kind={step === 4 && r.key === 'ops' ? 'bad' : 'solid'} />
          <Flow pts={SEC_PATHS.mapping[r.key]} n={1} dur={1.6} kind="blue" show={glowRow(r.key)} />
          <Flow pts={SEC_PATHS.grant[r.key]} n={1} dur={1.8} kind={step === 4 && r.key === 'ops' ? 'bad' : 'ok'} show={glowRow(r.key)} />
        </g>
      ))}
      <Link pts={SEC_PATHS.alice} show={step >= 7} kind={step === 8 ? 'bad' : 'solid'} />

      {SEC_ROWS.map(r => (
        <g key={`n${r.key}`}>
          <Ent x={GX} y={r.y}>
            <Block label={r.group.split(' ')} icon={Users} tint="grey" size={1.6} h={30} dim={step >= 1 && !rowsOn(r.key)} />
          </Ent>
          <Ent x={IX} y={r.y}>
            <Block label={r.identity} icon={KeyRound} tint={r.tint} size={1.6} h={30} dim={step >= 1 && !rowsOn(r.key)} glow={glowRow(r.key) ? `var(--${r.tint}-side-b)` : undefined} />
            {(step === 2 || step === 3) && <Pill text={r.perms} x={44} y={30} mono />}
          </Ent>
        </g>
      ))}

      <Ent x={OBJ[0]} y={OBJ[1]}>
        <Block label="T-101" icon={Database} tint="yellow" glow={step === 5 || step === 6 ? 'var(--yellow-side-b)' : step === 8 ? 'var(--red)' : undefined} />
        {step === 0 && <Pill text="who may change this?" icon={ShieldCheck} tone="warn" {...TOP} />}
        {step === 3 && <Pill text="Read · Write · Read Data · Write Data …" icon={ListChecks} {...TOP} />}
        {step === 4 && <Pill text="allowed ∪  −  denied ∪" icon={Ban} tone="bad" {...TOP} />}
        {step === 5 && <Pill text="needs read/write on the database too" icon={Database} {...TOP} />}
        {step === 6 && <Pill text="children: update modified identities" icon={GitMerge} {...TOP} />}
        {step === 7 && <Pill text="checked out by Alice" icon={LockKeyhole} tone="warn" {...TOP} />}
        {step === 8 && <Pill text="locked by user Alice" icon={LockKeyhole} tone="bad" {...TOP} />}
        <Pill text="element" x={14} y={50} mono />
      </Ent>

      <Ent x={ALICE[0]} y={ALICE[1]} show={step >= 7}>
        <Block label="Alice" icon={UserRound} tint="orange" size={1.6} h={30} />
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [0, -40, 1.25],
  [90, 60, 1.05],
  [140, 50, 0.95],
  [70, 20, 1.0],
  [80, 60, 1.05],
  [0, -40, 1.2],
  [60, 20, 1.0],
  [-60, 0, 1.15],
  [-60, 0, 1.15],
  [130, 50, 0.8],
];

const lesson: Lesson = {
  id: 'af-security',
  chapter: 'asset-framework',
  title: 'AF Security & Check-in',
  subtitle: 'Who may read, write or administer each AF object — and why your edit waits until you check it in.',
  minutes: 10,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'mapping', color: 'var(--pkt-blue)' },
    { label: 'granted', color: 'var(--pkt-ok)' },
    { label: 'denied', color: 'var(--pkt-bad)' },
  ],
  learn: [
    { text: 'What PI AF identities and mappings are', at: 1 },
    { text: 'What the built-in identities can do', at: 2 },
    { text: 'The difference between Read/Write and Read Data/Write Data', at: 3 },
    { text: 'How permissions combine across identities', at: 4 },
    { text: 'How child objects inherit permissions', at: 6 },
    { text: 'How check-out, check-in and undo check-out work', at: 8 },
  ],
  steps: [
    {
      short: 'Who',
      title: 'Who may change this tank?',
      tag: 'problem',
      body: [
        'Element T-101 holds the tank’s configuration and its live data. Operators should read its values and maybe enter some; engineers should change its configuration; almost nobody should change its security.',
        'PI AF answers this with *identities*, *mappings* and per-object *permissions*.',
      ],
      metrics: [
        { label: 'Object', value: 'T-101', icon: Database },
        { label: 'Users', value: 'many', icon: Users },
      ],
    },
    {
      short: 'Identities',
      title: 'Identities hold permissions; mappings assign them',
      tag: 'concept',
      body: [
        'A PI AF *identity* represents a set of access permissions on the AF server. A *mapping* points a Windows user or group (or an identity provider role) at an identity.',
        'Since PI AF Server 2015 you can’t grant a Windows user or group access directly: you map them to an identity that has the access. Members of a mapped group get the identity’s permissions automatically.',
      ],
      changed: [{ kind: 'add', text: 'Engineering Team → Engineers → T-101' }],
      metrics: [
        { label: 'Mapping', value: 'group → identity', icon: GitMerge },
        { label: 'Identity', value: 'Engineers', icon: KeyRound },
      ],
    },
    {
      short: 'Built-in',
      title: 'The built-in identities',
      tag: 'concept',
      body: [
        '*Administrators* has every permission everywhere. *Engineers* has the same except Admin, and can’t delete databases. *World* can read every collection and object, and is mapped to the Windows Everyone group by default.',
        'Add your own identities, such as Operators, to narrow access for each job.',
      ],
      callout: { kind: 'tip', text: 'Give users the identities with the minimum permissions their work needs, and keep Administrators to a few people.' },
      changed: [{ kind: 'add', text: 'Operators, World, Administrators' }],
      metrics: [
        { label: 'Identities', value: '4', icon: KeyRound },
        { label: 'World', value: 'read all', icon: Users },
      ],
    },
    {
      short: 'Rights',
      title: 'Configuration rights versus data rights',
      tag: 'mechanism',
      body: [
        '*Read* (`r`) and *Write* (`w`) cover the object itself and its configuration values. *Read Data* (`rd`) and *Write Data* (`wd`) cover the non-configuration values of its attributes.',
        'Others include *Delete* (`d`), *Execute* (`x`, queue analysis backfills), *Annotate* (`an`) and *Admin* (`a`, change security or force an undo check-out).',
      ],
      callout: { kind: 'idea', text: 'Operators with r rd wd can read and enter data on T-101 without being able to change how it is configured.' },
      metrics: [
        { label: 'Engineers', value: 'r w rd wd', icon: KeyRound },
        { label: 'Operators', value: 'r rd wd', icon: KeyRound },
      ],
    },
    {
      short: 'Combine',
      title: 'Allowed adds up, denied wins',
      tag: 'mechanism',
      body: [
        'A user mapped to several identities gets the *union* of everything they allow, minus the *union* of everything they deny.',
        'If Bob is in both Engineering Team and Operators, and Operators denies Write Data on T-101, Bob can’t write data there — even though Engineers allows it.',
      ],
      changed: [{ kind: 'mod', text: 'Operators: Deny wd' }],
      metrics: [
        { label: 'Engineers', value: 'allow wd', icon: CircleCheck, tone: 'good' },
        { label: 'Operators', value: 'deny wd', icon: Ban, tone: 'bad' },
        { label: 'Bob', value: 'no wd', icon: UserRound, tone: 'bad' },
      ],
    },
    {
      short: 'Database',
      title: 'The database is a gate too',
      tag: 'gotcha',
      body: [
        'A user must have *read* permission on a PI AF database to read any object in it, and *write* permission on the database to write to any object in it.',
        'Permissions on T-101 alone are not enough if the database above it says no.',
      ],
      metrics: [
        { label: 'T-101', value: 'w', icon: Database },
        { label: 'Database', value: 'needs w', icon: Database, tone: 'warn' },
      ],
    },
    {
      short: 'Inherit',
      title: 'Children inherit from parents',
      tag: 'mechanism',
      body: [
        'A new object starts with its parent’s permissions. When you change a parent, the *Child Permission* setting decides what happens below: *Update child permissions for modified identities* (the default on AF Server 2.6 and later) or *Replace child permissions for all identities*.',
        'Composition references keep parent and child permissions identical; weak references inherit nothing.',
      ],
      callout: { kind: 'warn', text: 'Replace child permissions for all identities can overwrite custom permissions set lower in the hierarchy.' },
      metrics: [
        { label: 'Default', value: 'update modified', icon: GitMerge },
        { label: 'Weak refs', value: 'no inherit', icon: Ban },
      ],
    },
    {
      short: 'Check out',
      title: 'Every change checks the object out',
      tag: 'mechanism',
      body: [
        'Whenever you change or create an object, PI System Explorer checks it out from the database. A red check mark shows unsaved changes; *Check In* saves them, and *Undo Check Out* throws them away.',
        'Here Alice has started editing T-101, so it is checked out to her.',
      ],
      changed: [{ kind: 'add', text: 'T-101 checked out by Alice' }],
      metrics: [
        { label: 'T-101', value: 'checked out', icon: LockKeyhole, tone: 'warn' },
        { label: 'By', value: 'Alice', icon: UserRound },
      ],
    },
    {
      short: 'Locked',
      title: 'Locked by another user',
      tag: 'gotcha',
      body: [
        'While T-101 is checked out to Alice, anyone else who tries to change it gets an error that it is *locked by user* Alice.',
        'If Alice has gone home, a user with *Admin* permission on the object can open Undo Check Out, choose *Show All Users*, and undo her check-out.',
      ],
      callout: { kind: 'tip', text: 'Check in often — an unchecked-in edit blocks everyone else from that object.' },
      changed: [{ kind: 'mod', text: 'Bob’s edit refused: locked by Alice' }],
      metrics: [
        { label: 'Bob', value: 'blocked', icon: LockKeyhole, tone: 'bad' },
        { label: 'Fix', value: 'Admin undo', icon: UserCog },
      ],
    },
    {
      short: 'Recap',
      title: 'Groups, identities, permissions, check-in',
      tag: 'recap',
      body: [
        'Windows groups map to AF identities; identities hold permissions on objects; a user gets the union of allowed minus the union of denied, gated by the database.',
        'Edits check objects out until you check them in, and only Admin can undo someone else’s check-out.',
      ],
      callout: { kind: 'idea', text: 'Use the Effective Access tab to see what a given user can actually do.' },
      metrics: [
        { label: 'Mappings', value: '4', icon: GitMerge },
        { label: 'Identities', value: '4', icon: KeyRound },
      ],
    },
  ],
  docs: [
    { title: 'Learn about PI AF identities and mappings', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1020037.html', desc: 'Identities, mappings, multiple identities and database permissions.' },
    { title: 'List of PI Asset Framework (AF) identities', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1019424.html', desc: 'Administrators, Engineers, World and the rest.' },
    { title: 'List of access permissions', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1020021.html', desc: 'Read, Write, Read Data, Write Data, Admin and others.' },
    { title: 'Understand permission inheritance of element objects', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1020015.html', desc: 'Child Permission settings and reference types.' },
    { title: 'Learn how to check-in database changes', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021683.html', desc: 'Check out, check in, undo check out and locks.' },
    { title: 'Configure security for a single PI AF database', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021749.html', desc: 'Database permissions and the Effective Access tab.' },
  ],
  TryIt: lazy(() => import('../components/tryit/af-security')),
};

export default lesson;
