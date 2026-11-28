import { lazy } from 'react';
import { Braces, Globe, IdCard, KeyRound, Laptop, Layers, MapPin, Radio, Repeat, Send, Server, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Data Archive (x 13, y −3) and PI AF (x 13, y 4) answer PI Web API (x 2), which answers the client app
 * (x −10). Responses travel −x with arrows; requests travel +x on their own lane without arrowheads.
 */
export const WA_DA: [number, number] = [13, -3];
export const WA_AF: [number, number] = [13, 4];
export const API: [number, number] = [2, 0];
export const CLIENT: [number, number] = [-10, 0];
const H = 4;

export const WA_PATHS = {
  fromDa: [[WA_DA[0] - 1.9, WA_DA[1], H], [8, WA_DA[1], H], [8, -0.6, H], [API[0] + 2.4, -0.6, H]] as GridPt[],
  fromAf: [[WA_AF[0] - 2.4, WA_AF[1], H], [8.8, WA_AF[1], H], [8.8, 0.6, H], [API[0] + 2.4, 0.6, H]] as GridPt[],
  toClient: [[API[0] - 2.4, 0.8, H], [CLIENT[0] + 2.4, 0.8, H]] as GridPt[],
  request: [[CLIENT[0] + 2.4, -0.8, H], [API[0] - 2.4, -0.8, H]] as GridPt[],
};

export function WebApiFloors() {
  return (
    <g>
      <Ent x={13} y={0.5}><Slab ax={2.8} ay={6.7} h={H} /></Ent>
      <Ent x={API[0]} y={API[1]}><Slab ax={3} ay={3} h={H} tint="purple" /></Ent>
      <Ent x={CLIENT[0]} y={CLIENT[1]}><Slab ax={3} ay={3} h={H} tint="grey" /></Ent>
      <Ent x={15.8} y={-6.2}><Pill text="PI Data Archive · PI AF Server" icon={Server} tone="dark" x={8} y={-6} /></Ent>
      <Ent x={API[0]} y={3}><Pill text="PI Web API server" icon={Globe} tone="dark" x={-30} y={30} /></Ent>
      <Ent x={CLIENT[0]} y={3}><Pill text="client app (any platform)" icon={Laptop} tone="dark" x={-40} y={30} /></Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };
const BELOW = { x: -8, y: -104 };

function Scene({ step }: SceneProps) {
  const busy = step === 4 || step === 6;
  return (
    <g>
      <WebApiFloors />
      <Link pts={WA_PATHS.fromDa} show={step >= 1} />
      <Link pts={WA_PATHS.fromAf} show={step >= 1} />
      <Link pts={WA_PATHS.toClient} show={step >= 1} />
      <Link pts={WA_PATHS.request} show={step >= 1} arrow={false} kind="muted" />
      <Flow pts={WA_PATHS.request} n={busy ? 6 : step === 5 ? 1 : 2} dur={busy ? 0.9 : 1.6} kind={step === 6 ? 'warn' : 'req'} show={step >= 1 && step !== 7} />
      <Flow pts={WA_PATHS.fromDa} n={2} dur={1.6} kind="ok" show={step >= 1} />
      <Flow pts={WA_PATHS.fromAf} n={1} dur={1.8} kind="violet" show={step >= 1} />
      <Flow pts={WA_PATHS.toClient} n={step === 7 ? 3 : 2} dur={1.4} kind="blue" show={step >= 1} />

      <Ent x={WA_DA[0]} y={WA_DA[1]} z={H}><Cylinder rx={24} h={36} tint="purple" label="PI" /></Ent>
      <Ent x={WA_AF[0]} y={WA_AF[1]} z={H}><Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} /></Ent>
      <Ent x={API[0]} y={API[1]} z={H}>
        <Block label={['PI', 'Web API']} icon={Globe} tint="purple" glow={step >= 1 && step <= 3 ? 'var(--purple-side-b)' : step === 8 ? 'var(--amber)' : undefined} />
        {step === 1 && <Pill text="REST over HTTPS" icon={Globe} {...BELOW} />}
        {step === 2 && <Pill text="/streams/{webId}/recorded" icon={IdCard} {...BELOW} mono />}
        {step === 3 && <Pill text="Full · IDOnly · PathOnly" icon={MapPin} {...BELOW} />}
        {step === 5 && <Pill text="POST /batch · ParentIds" icon={Layers} {...BELOW} mono />}
        {step === 7 && <Pill text="wss://…/streams/{webId}/channel" icon={Radio} {...BELOW} mono />}
        {step === 8 && <Pill text="Kerberos · Basic · Bearer · Anonymous" icon={KeyRound} {...BELOW} />}
      </Ent>
      <Ent x={CLIENT[0]} y={CLIENT[1]} z={H}>
        <Block label={['Client', 'app']} icon={Laptop} tint="grey" glow={busy ? 'var(--amber)' : undefined} />
        {step === 0 && <Pill text="a web app needs PI data" icon={Laptop} tone="warn" {...TOP} />}
        {step === 4 && <Pill text="1 request per item: 10 round trips" icon={Repeat} tone="warn" {...TOP} />}
        {step === 6 && <Pill text="polling every few seconds" icon={TriangleAlert} tone="warn" {...TOP} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-80, -30, 1.1],
  [10, -30, 1.0],
  [40, -40, 1.1],
  [40, -40, 1.1],
  [-60, -30, 1.1],
  [0, -30, 1.05],
  [-60, -30, 1.1],
  [0, -30, 1.05],
  [40, -40, 1.1],
  [10, 0, 0.88],
];

const lesson: Lesson = {
  id: 'dv-web-api',
  chapter: 'developer-access',
  title: 'PI Web API: WebIDs, Batch & Channels',
  subtitle: 'The REST door into the PI System — how resources are addressed, how to cut round trips, and how to stop polling.',
  minutes: 9,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'requests', color: 'var(--pkt-req)' },
    { label: 'PI point data', color: 'var(--pkt-ok)' },
    { label: 'AF data', color: 'var(--pkt-violet)' },
    { label: 'responses', color: 'var(--pkt-blue)' },
  ],
  learn: [
    { text: 'What PI Web API gives a client', at: 1 },
    { text: 'What a WebID is and which type to keep', at: 3 },
    { text: 'How batch cuts round trips, with ParentIds', at: 5 },
    { text: 'How channels replace polling', at: 7 },
    { text: 'Which authentication methods exist, and the Kerberos catch', at: 8 },
  ],
  steps: [
    {
      short: 'Problem',
      title: 'An app needs PI data over the web',
      tag: 'problem',
      body: [
        'A dashboard, a mobile app or a Python script wants PI point values and AF attributes — on any platform, without installing a Windows SDK.',
      ],
      metrics: [
        { label: 'Client', value: 'any platform', icon: Laptop },
        { label: 'Needs', value: 'points + AF', icon: Server },
      ],
    },
    {
      short: 'PI Web API',
      title: 'A RESTful service in front of PI',
      tag: 'concept',
      body: [
        '*PI Web API* is a RESTful service that gives programmatic access to the Data Archive and PI AF server. Clients send HTTPS requests and get JSON back.',
        'The installer offers *Core Services* — the resources for reading and writing your PI System — and, optionally, *OMF Services* for ingress.',
      ],
      changed: [{ kind: 'add', text: 'PI Web API between client and servers' }],
      metrics: [
        { label: 'Style', value: 'REST · JSON', icon: Braces },
        { label: 'Services', value: 'Core · OMF', icon: Layers },
      ],
    },
    {
      short: 'WebIDs',
      title: 'Every resource has a WebID',
      tag: 'mechanism',
      body: [
        'Resources are addressed by *WebIDs*: persistent, URL-safe identifiers that encode the GUIDs and/or paths of PI System objects. They appear in links and inside JSON responses.',
        'Treat them as opaque. Because they are persistent, clients can cache URLs that contain them — even across newer PI Web API versions.',
      ],
      metrics: [
        { label: 'Encodes', value: 'GUIDs · paths', icon: IdCard },
        { label: 'Cache', value: 'safe', icon: ShieldCheck, tone: 'good' },
      ],
    },
    {
      short: 'WebID types',
      title: 'Choose what the WebID remembers',
      tag: 'mechanism',
      body: [
        'WebID 2.0 adds types. *Full* (the default) encodes everything and is the most resistant to items being moved, renamed or deleted. *IDOnly* is shorter and follows the item when it moves — but is invalid once the item is deleted.',
        '*PathOnly* always points at a location in the AF hierarchy, whatever item sits there now. *LocalIDOnly* and *DefaultIDOnly* drop the server part, so they are not unique and don\'t work behind load balancers.',
      ],
      callout: { kind: 'warn', text: 'A cached PathOnly WebID can quietly start returning a different item.' },
      metrics: [
        { label: 'Default', value: 'Full', icon: IdCard },
        { label: 'Follows moves', value: 'IDOnly', icon: MapPin },
      ],
    },
    {
      short: 'Round trips',
      title: 'One request per item adds up',
      tag: 'problem',
      body: [
        'Fetch ten values one at a time and the client pays ten HTTP round trips — ten lots of latency, ten lots of headers.',
      ],
      metrics: [
        { label: 'Items', value: '10', icon: Repeat },
        { label: 'Round trips', value: '10', icon: TriangleAlert, tone: 'warn' },
      ],
    },
    {
      short: 'Batch',
      title: 'Batch: many requests in one POST',
      tag: 'mechanism',
      body: [
        'A *batch* request is one POST whose body is a dictionary: IDs as keys, request objects (method, resource, optional content) as values. The response uses the same keys, each with its own status, headers and body.',
        '*ParentIds* make a request wait for others, and its resource can be a JSONPath into a parent\'s response — look up two points, then read both values, in one trip.',
      ],
      changed: [{ kind: 'mod', text: '10 round trips → 1' }],
      metrics: [
        { label: 'Round trips', value: '1', icon: Send, tone: 'good' },
        { label: 'Ordering', value: 'ParentIds', icon: Layers },
      ],
    },
    {
      short: 'Polling',
      title: 'Polling for new values is wasteful',
      tag: 'problem',
      body: [
        'To stay live, a client can ask again and again. Most of those requests come back with nothing new — but each still costs a request and its headers.',
      ],
      metrics: [
        { label: 'Requests', value: 'constant', icon: Repeat, tone: 'warn' },
        { label: 'New data', value: 'rarely', icon: TriangleAlert },
      ],
    },
    {
      short: 'Channels',
      title: 'Channels push changes over a WebSocket',
      tag: 'mechanism',
      body: [
        'A *channel* is a WebSocket connection that streams value changes for a stream or stream set. The server checks the update queue every `ChannelPollingInterval` (default 1000 ms) and sends only what changed.',
        '`includeInitialValues=true` sends current values first; `heartbeatRate` sends empty messages so you know the link is alive. Changes arrive in the order PI received them, not necessarily chronologically.',
      ],
      changed: [{ kind: 'mod', text: 'Polling → one open channel' }],
      metrics: [
        { label: 'Protocol', value: 'WebSocket', icon: Radio },
        { label: 'Server check', value: '1000 ms', icon: Repeat },
      ],
    },
    {
      short: 'Security',
      title: 'Who is asking?',
      tag: 'gotcha',
      body: [
        '`AuthenticationMethods` can list *Kerberos* (the only one on by default), *Basic*, *Bearer* (OpenID Connect via AVEVA Identity Manager) and *Anonymous*. Bearer and Kerberos are mutually exclusive.',
        'Kerberos needs Active Directory delegation and correct SPNs for the PI Web API account, or the hop on to the Data Archive and AF fails. Anonymous runs every request as the service account — if you must use it, turn on read-only mode.',
      ],
      callout: { kind: 'warn', text: 'Kerberos without delegation is the classic PI Web API failure.' },
      metrics: [
        { label: 'Default', value: 'Kerberos', icon: KeyRound },
        { label: 'Anonymous', value: 'read-only', icon: ShieldCheck, tone: 'warn' },
      ],
    },
    {
      short: 'Recap',
      title: 'Address well, batch, subscribe',
      tag: 'recap',
      body: [
        'PI Web API is REST in front of the Data Archive and AF. Address resources by WebID and pick the type that matches how you cache it.',
        'Batch related requests into one POST, open a channel instead of polling, and get Kerberos delegation right.',
      ],
      metrics: [
        { label: 'Round trips', value: '1 batch', icon: Send, tone: 'good' },
        { label: 'Live data', value: 'channel', icon: Radio, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Install PI Web API', url: 'https://docs.aveva.com/bundle/pi-web-api/page/1023078.html', desc: 'What PI Web API is, Core Services and OMF Services.' },
    { title: 'WebID', url: 'https://docs.aveva.com/bundle/pi-web-api/page/1023105.html', desc: 'Persistent, URL-safe identifiers and WebID 2.0.' },
    { title: 'WebID Type', url: 'https://docs.aveva.com/bundle/pi-web-api-reference/page/help/topics/webid-type.html', desc: 'Full, IDOnly, PathOnly, LocalIDOnly and DefaultIDOnly.' },
    { title: 'Batch support', url: 'https://docs.aveva.com/bundle/pi-web-api/page/1023110.html', desc: 'Batch requests, ParentIds, JSONPath and request templates.' },
    { title: 'Channels', url: 'https://docs.aveva.com/bundle/pi-web-api/page/1023111.html', desc: 'WebSocket channels, polling interval and heartbeats.' },
    { title: 'Authentication methods', url: 'https://docs.aveva.com/bundle/pi-web-api/page/1023024.html', desc: 'Kerberos, Basic, Bearer and Anonymous.' },
  ],
  TryIt: lazy(() => import('../components/tryit/dv-web-api')),
};

export default lesson;
