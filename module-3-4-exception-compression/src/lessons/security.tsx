import { lazy } from 'react';
import { Activity, Ban, Database, Eye, Globe, IdCard, KeyRound, Lock, Network, PenLine, Plug, ShieldCheck, Table2, Ticket, TriangleAlert, Users } from 'lucide-react';
import { Block, Crowd, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { textWidth, type GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

const LANE = [0, 8.5, 17];
const CLIENT_Y = 17;
const GATE_Y = 8.5;
const ID_Y = 0;
const P: [number, number] = [0, -9.5];
const D: [number, number] = [0, -18];
const WORLD: [number, number] = [-8.5, 0];
const Z = 10;
const SZ = 1.6;
const H = 38;
const PAD = 2;

const clientToGate = (i: number, pad: number): GridPt[] => [[LANE[i], CLIENT_Y - pad, 0], [LANE[i], GATE_Y + PAD, 0]];
const gateToId = (i: number): GridPt[] => [[LANE[i], GATE_Y - PAD, 0], [LANE[i], ID_Y + PAD, 0]];
const idToP: GridPt[][] = [
  [[0, -PAD, 0], [0, -6.8, 0], [0, -7.15, Z], [0, P[1] + PAD, Z]],
  [[LANE[1], -PAD, 0], [LANE[1], -8.8, 0], [2.7, -8.8, 0], [2.4, -8.8, Z], [PAD, -8.8, Z]],
  [[LANE[2], -PAD, 0], [LANE[2], -10.2, 0], [2.7, -10.2, 0], [2.4, -10.2, Z], [PAD, -10.2, Z]],
];
const toWorld: GridPt[] = [[-PAD, GATE_Y, 0], [WORLD[0], GATE_Y, 0], [WORLD[0], WORLD[1] + PAD, 0]];

const left = (text: string, icon = false) => ({ x: -(textWidth(text, 10.5) + 20 + (icon ? 15.5 : 0)) / 2 - 48, y: -16 });

function Scene({ step }: SceneProps) {
  const lane = step === 1 || step === 2 || step === 3 ? 0 : step === 4 ? 1 : step === 5 ? 2 : -1;
  const all = step === 0 || step >= 6;
  const on = (i: number) => all || lane === i;
  const passed = (i: number) => (i === 0 ? step >= 2 : i === 1 ? step >= 4 : step >= 5);
  const lockedDown = step >= 6;
  const kindFor = (i: number) => (lockedDown && i === 2 ? 'bad' : lockedDown && i === 1 ? 'muted' : 'solid');

  return (
    <g>
      <Ent x={0} y={-13.75}>
        <Slab ax={2.4} ay={6.6} h={Z} />
      </Ent>

      {[0, 1, 2].map(i => (
        <g key={i}>
          <Link pts={clientToGate(i, i === 0 ? 1.9 : i === 1 ? PAD : 1.4)} kind={step === 0 ? 'muted' : kindFor(i)} show={step === 0 || on(i) || passed(i)} />
          <Link pts={gateToId(i)} kind={kindFor(i)} show={passed(i) && step !== 0 && !(lockedDown && i === 2)} />
          <Link pts={idToP[i]} kind={kindFor(i)} show={passed(i) && step !== 0 && !(lockedDown && i === 2)} />
        </g>
      ))}
      <Link pts={toWorld} kind="muted" show={step === 3} />

      {[0, 1, 2].map(i => {
        const active = lane === i || (step === 9);
        const blocked = lockedDown && i === 2;
        const pkt = i === 0 ? 'blue' : i === 1 ? 'warn' : 'req';
        return (
          <g key={i}>
            <Flow pts={clientToGate(i, i === 0 ? 1.9 : i === 1 ? PAD : 1.4)} n={2} dur={1.8} kind={blocked ? 'bad' : pkt} show={active || (blocked && step === 6)} fade={blocked} />
            <Flow pts={gateToId(i)} n={1} dur={1.6} kind={pkt} show={active && passed(i) && !blocked} />
            <Flow pts={idToP[i]} n={1} dur={2.2} kind={pkt} show={active && passed(i) && !blocked} />
          </g>
        );
      })}
      <Flow pts={toWorld} n={1} dur={1.8} kind="blue" show={step === 3} />

      {/* clients */}
      <Ent x={LANE[0]} y={CLIENT_Y}>
        <Crowd cols={3} rows={2} />
        <Pill text="AD group: Operators" icon={Users} x={-100} y={34} />
      </Ent>
      <Ent x={LANE[1]} y={CLIENT_Y}>
        <Block label="PI Interface" icon={Plug} tint="orange" size={SZ} h={H} dim={!on(1)} />
        <Pill text="interface node" x={-56} y={40} mono />
      </Ent>
      <Ent x={LANE[2]} y={CLIENT_Y}>
        <Crowd cols={1} rows={1} />
        <Pill text="types a password" icon={KeyRound} x={-60} y={30} />
      </Ent>

      {/* gates */}
      <Ent x={LANE[0]} y={GATE_Y}>
        <Block label={['Windows', 'auth']} icon={ShieldCheck} tint="green" size={SZ} h={H} dim={!on(0)} glow={step === 1 ? 'var(--green-side-b)' : undefined} />
        {step === 1 && <Pill text="Kerberos ticket" icon={Ticket} tone="good" {...left("Kerberos ticket", true)} />}
      </Ent>
      <Ent x={LANE[1]} y={GATE_Y}>
        <Block label="PI trust" icon={Network} tint="yellow" size={SZ} h={H} dim={!on(1)} glow={step === 4 ? 'var(--yellow-side-b)' : undefined} />
        {step === 4 && <Pill text="app · IP · host" icon={Globe} tone="warn" {...left("app · IP · host", true)} />}
        {step === 6 && <Pill text="move to Windows" tone="warn" {...left("move to Windows")} />}
      </Ent>
      <Ent x={LANE[2]} y={GATE_Y}>
        <Block label={['Explicit', 'login']} icon={KeyRound} tint="rose" size={SZ} h={H} dim={!on(2)} glow={step === 5 || step === 6 ? 'var(--red)' : undefined} />
        {step === 5 && <Pill text="PI user + password" icon={TriangleAlert} tone="bad" {...left("PI user + password", true)} />}
        {step === 6 && <Pill text="disabled" icon={Ban} tone="bad" {...left("disabled", true)} />}
      </Ent>

      {/* identities */}
      <Ent x={LANE[0]} y={ID_Y}>
        <Block label="PIOperators" icon={IdCard} tint="blue" size={SZ} h={H} dim={!passed(0) || !on(0)} glow={step === 2 ? 'var(--blue-side-b)' : undefined} />
        {step === 2 && <Pill text="mapping: group → identity" icon={Users} {...left("mapping: group → identity", true)} />}
      </Ent>
      <Ent x={LANE[1]} y={ID_Y}>
        <Block label="PI identity" icon={IdCard} tint="blue" size={SZ} h={H} dim={!passed(1) || !on(1)} />
        {step === 4 && <Pill text="1 trust → 1 identity" {...left("1 trust → 1 identity")} />}
      </Ent>
      <Ent x={LANE[2]} y={ID_Y}>
        <Block label="piadmin" icon={IdCard} tint="rose" size={SZ} h={H} dim={!passed(2) || !on(2) || lockedDown} />
        {step === 5 && <Pill text="super-user: avoid" tone="bad" {...left("super-user: avoid")} />}
      </Ent>
      <Ent x={WORLD[0]} y={WORLD[1]} show={step === 3 || step === 9}>
        <Block label="PIWorld" icon={Globe} tint="grey" size={SZ} h={H} />
        {step === 3 && <Pill text="every authenticated user" tone="good" {...left("every authenticated user")} />}
      </Ent>

      {/* server */}
      <Ent x={P[0]} y={P[1]} z={Z}>
        <Block label="PI point" icon={Activity} tint="purple" size={SZ} h={H} glow={step === 7 ? 'var(--purple-side-b)' : undefined} />
        {step === 7 && (
          <>
            <Pill text="PtSecurity · attributes" icon={Lock} x={-150} y={-58} />
            <Pill text="DataSecurity · values" icon={Lock} tone="violet" x={-150} y={-28} />
          </>
        )}
      </Ent>
      <Ent x={D[0]} y={D[1]} z={Z}>
        <Block label={['Database', 'security']} icon={Table2} tint="grey" size={SZ} h={H} glow={step === 8 ? 'var(--grey-side-b)' : undefined} dim={step < 8 && step !== 0} />
        {step === 8 && (
          <>
            <Pill text="PIPOINT · create/delete points" icon={Database} x={-200} y={-84} fs={9.5} />
            <Pill text="PIARCADMIN · archives" icon={Database} x={-176} y={-56} fs={9.5} />
            <Pill text="PIDBSEC · piadmin/piadmins only" icon={Lock} tone="bad" x={-206} y={-28} fs={9.5} />
          </>
        )}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [10, 80, 0.82],
  [-175, 55, 1.3],
  [10, -20, 1.1],
  [-55, -40, 1.15],
  [10, 70, 0.9],
  [115, 105, 0.9],
  [25, 20, 0.78],
  [90, -95, 1.2],
  [205, -165, 1.25],
  [25, 20, 0.78],
];

const lesson: Lesson = {
  id: 'security',
  chapter: 'security',
  title: 'Who Gets In',
  subtitle: 'How Data Archive decides who is connecting, which PI identity they become, and what that identity may touch.',
  minutes: 11,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'Windows user', color: 'var(--pkt-blue)' },
    { label: 'trusted app', color: 'var(--yellow-side-b)' },
    { label: 'explicit login', color: 'var(--pkt-req)' },
    { label: 'refused', color: 'var(--pkt-bad)' },
  ],
  learn: [
    { text: 'The three ways to authenticate, most to least secure', at: 0 },
    { text: 'How Windows auth and mappings produce a PI identity', at: 2 },
    { text: 'What PIWorld grants every authenticated user', at: 3 },
    { text: 'What a PI trust matches on, and why it’s discouraged', at: 4 },
    { text: 'Why to disable explicit logins and avoid piadmin', at: 6 },
    { text: 'Point security vs data security, and database security tables', at: 8 },
  ],
  steps: [
    {
      short: 'Who?',
      title: 'Every connection must say who it is',
      tag: 'problem',
      body: [
        'Operators open displays, interfaces write data, an admin logs in to fix something. Data Archive first has to *authenticate* each connection, then decide what it may do.',
        'There are three ways in. From most to least secure: Windows authentication, PI trusts and explicit logins.',
      ],
      callout: { kind: 'idea', text: 'Authentication answers “who are you?”. Access permissions answer “what may you do?”. PI keeps them separate.' },
      metrics: [
        { label: 'Methods', value: '3', icon: KeyRound },
        { label: 'Recommended', value: 'Windows', icon: ShieldCheck, tone: 'good' },
      ],
    },
    {
      short: 'Windows',
      title: 'Windows authentication',
      tag: 'mechanism',
      body: [
        'Users log on to Windows as usual and are authenticated on Data Archive automatically. Nobody types a separate PI user name or password.',
        'In a domain this uses Kerberos, which relies on Service Principal Names (SPNs). They are registered automatically for the account that runs PI Network Manager when Data Archive is installed.',
      ],
      callout: { kind: 'tip', text: 'This is the most secure method on PI Server. Use it for people and, with PI API 2016 for Windows Integrated Security, for interfaces too.' },
      changed: [{ kind: 'add', text: 'Windows users authenticate with no PI password' }],
      metrics: [
        { label: 'Method', value: 'Windows', icon: ShieldCheck, tone: 'good' },
        { label: 'PI password', value: 'none', icon: KeyRound },
      ],
    },
    {
      short: 'Mapping',
      title: 'A mapping turns a group into a PI identity',
      tag: 'mechanism',
      body: [
        'A *PI mapping* links a Windows group (Active Directory or local) to a *PI identity*. Every user in that group is authenticated as that identity.',
        'Access permissions are granted to identities, so the operators here get whatever `PIOperators` is allowed to do.',
      ],
      callout: { kind: 'tip', text: 'Map identities, not PI users or groups: identities don’t imply managing user accounts on the server.' },
      changed: [
        { kind: 'add', text: 'Mapping: Operators → PIOperators' },
        { kind: 'add', text: 'PIOperators → PI point' },
      ],
      metrics: [
        { label: 'Windows group', value: 'Operators', icon: Users },
        { label: 'PI identity', value: 'PIOperators', icon: IdCard, tone: 'good' },
      ],
    },
    {
      short: 'PIWorld',
      title: 'Everyone also gets PIWorld',
      tag: 'concept',
      body: [
        '*PIWorld* is the “everyone” identity. All authenticated users get at least PIWorld’s privileges, which by default are read access to most databases and objects.',
        'You can rename PIWorld and change its permissions, but you can’t delete it, map it to an AD group or use it in a trust.',
      ],
      callout: { kind: 'warn', text: 'Whatever PIWorld can read, every authenticated user can read. Check it before tightening anything else.' },
      changed: [{ kind: 'add', text: 'PIWorld applies to every authenticated user' }],
      metrics: [
        { label: 'PIWorld', value: 'read most', icon: Eye },
        { label: 'Mappable', value: 'no', icon: Ban, tone: 'warn' },
      ],
    },
    {
      short: 'Trusts',
      title: 'PI trusts: matching on where you come from',
      tag: 'gotcha',
      body: [
        'A *PI trust* lets an application in without a password by matching its connection details: application name, IP address and netmask, and the fully qualified or short host name. Blank fields aren’t checked.',
        'Each trust points at one PI identity, group or user. Before Data Archive 2016 R2, trusts were the usual way to authenticate interfaces.',
      ],
      callout: { kind: 'warn', text: 'Trusts are not recommended. They break when the node’s host name or IP changes, and they fail entirely once PI API 2016 for Windows Integrated Security is installed.' },
      changed: [{ kind: 'add', text: 'Trust: app + IP + host → PI identity' }],
      metrics: [
        { label: 'Method', value: 'PI trust', icon: Network, tone: 'warn' },
        { label: 'Matches', value: 'app · IP · host', icon: Globe },
      ],
    },
    {
      short: 'Explicit',
      title: 'Explicit login: a PI user and password',
      tag: 'gotcha',
      body: [
        'An *explicit login* is a PI user account name and password typed at connect time. It is the least secure way to authenticate on Data Archive.',
        'The built-in `piadmin` user is a super-user with full read/write access to everything. Its permissions can’t be changed.',
      ],
      callout: { kind: 'warn', text: 'PI user accounts are not secure. Use Windows authentication wherever possible.' },
      changed: [{ kind: 'add', text: 'Explicit login as piadmin' }],
      metrics: [
        { label: 'Method', value: 'explicit', icon: KeyRound, tone: 'bad' },
        { label: 'Identity', value: 'piadmin', icon: IdCard, tone: 'bad' },
      ],
    },
    {
      short: 'Lock down',
      title: 'Lock it down',
      tag: 'fix',
      body: [
        'Once Windows authentication works, *disable explicit logins*: users can no longer get in by typing a user name and password. Mappings and trusts can still use piadmin.',
        'Do routine admin work through the `piadmins` group, mapped to your administrators’ AD group, rather than through piadmin. Plan to move interfaces off trusts too.',
      ],
      callout: { kind: 'tip', text: 'If you map piadmin at all, map it to a very small group of administrators.' },
      changed: [
        { kind: 'del', text: 'Explicit logins disabled' },
        { kind: 'mod', text: 'Trust lane: migrate to Windows auth' },
      ],
      metrics: [
        { label: 'Explicit login', value: 'refused', icon: Ban, tone: 'bad' },
        { label: 'Admin via', value: 'piadmins', icon: Users, tone: 'good' },
      ],
    },
    {
      short: 'Point',
      title: 'Point security vs data security',
      tag: 'mechanism',
      body: [
        'Each point has two access settings. *Point security* (`PtSecurity`) covers its attributes, such as Zero, Span and Descriptor. *Data security* (`DataSecurity`) covers its values, both snapshot and archive.',
        'To view a point’s data you need read access to `PIPOINT`, `DataSecurity` and `PtSecurity`. To edit its data you need read/write on `DataSecurity`.',
      ],
      callout: { kind: 'idea', text: 'Someone may be allowed to write a point’s values but not change how it is configured.' },
      changed: [{ kind: 'add', text: 'PtSecurity and DataSecurity on the point' }],
      metrics: [
        { label: 'View data', value: 'read ×3', icon: Eye },
        { label: 'Edit data', value: 'rw DataSecurity', icon: PenLine },
      ],
    },
    {
      short: 'Database',
      title: 'Database security guards admin tasks',
      tag: 'mechanism',
      body: [
        'Server-wide tasks are controlled by tables in *Database Security*: `PIPOINT` for creating and deleting points, `PIARCADMIN` for archive tasks such as shifts, `PIBACKUP`, `PIMAPPING`, `PITRUST`, `PITUNING` and more.',
        '`PIDBSEC` controls the database security table itself.',
      ],
      callout: { kind: 'warn', text: 'Custom accounts can be given write access to PIDBSEC, but only piadmin or piadmins can actually edit it.' },
      changed: [{ kind: 'add', text: 'Database security tables' }],
      metrics: [
        { label: 'Create points', value: 'PIPOINT', icon: Table2 },
        { label: 'Archives', value: 'PIARCADMIN', icon: Database },
      ],
    },
    {
      short: 'Recap',
      title: 'Who gets in, and as whom',
      tag: 'recap',
      body: [
        'Connection → authentication (Windows, trust or explicit) → PI identity → access permissions on points and server databases.',
        'Prefer Windows authentication with mappings to PI identities. Disable explicit logins, retire trusts, and use piadmins rather than piadmin.',
      ],
      callout: { kind: 'idea', text: 'If someone can see too much, check three places: their mapping, PIWorld, and the point’s PtSecurity/DataSecurity.' },
      metrics: [
        { label: 'Windows', value: 'preferred', icon: ShieldCheck, tone: 'good' },
        { label: 'Trusts', value: 'retire', icon: Network, tone: 'warn' },
        { label: 'Explicit', value: 'disabled', icon: Ban, tone: 'bad' },
      ],
    },
  ],
  docs: [
    { title: 'Manage authentication', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1019898.html', desc: 'Windows, trusts and explicit logins, most to least secure.' },
    { title: 'Authentication management with Windows security', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1022431.html', desc: 'PI identities and mappings to Windows groups.' },
    { title: 'Interface authentication with PI trusts', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1022433.html', desc: 'What a trust matches on, and why to avoid it.' },
    { title: 'Built-in PI identities, users, and groups', url: 'https://docs.aveva.com/bundle/pi-server-f-da-smt/page/1019090.html', desc: 'piadmin, piadmins and PIWorld.' },
    { title: 'PI point access permissions', url: 'https://docs.aveva.com/bundle/pi-server-f-da-smt/page/1020313.html', desc: 'PtSecurity vs DataSecurity, and what each task needs.' },
    { title: 'Access control for basic Data Archive admin tasks', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1022296.html', desc: 'Which database security table controls which task.' },
    { title: 'Manage service principal names', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1524226.html', desc: 'SPNs for Kerberos authentication.' },
  ],
  TryIt: lazy(() => import('../components/module8/Module8')),
};

export default lesson;
