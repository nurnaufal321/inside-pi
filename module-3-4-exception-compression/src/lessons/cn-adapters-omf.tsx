import { lazy } from 'react';
import { Activity, Boxes, Braces, Cable, Container, Cpu, Globe, LayoutTemplate, RadioTower, Server, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Data flows right to left: OPC UA server (x 13, y −4) and MQTT broker (x 13, y 4) → adapter (x 3)
 * → PI Web API OMF endpoint (x −7) → PI AF (x −16, y 4: templates, elements) and Data Archive (x −16, y −4: PI points).
 */
export const OPCUA: [number, number] = [13, -4];
export const MQTT: [number, number] = [13, 4];
export const ADP: [number, number] = [3, 0];
export const WEBAPI: [number, number] = [-7, 0];
export const OMF_DA: [number, number] = [-16, -4];
export const OMF_AF: [number, number] = [-16, 4];
const H = 4;

export const OMF_PATHS = {
  fromOpc: [[OPCUA[0] - 2.4, OPCUA[1], H], [8, OPCUA[1], H], [8, -0.6, H], [ADP[0] + 2.4, -0.6, H]] as GridPt[],
  fromMqtt: [[MQTT[0] - 2.4, MQTT[1], H], [8.8, MQTT[1], H], [8.8, 0.6, H], [ADP[0] + 2.4, 0.6, H]] as GridPt[],
  omf: straight(ADP, WEBAPI, H, 2.4, 2.4),
  toAf: [[WEBAPI[0] - 2.4, 0.6, H], [-11.6, 0.6, H], [-11.6, OMF_AF[1], H], [OMF_AF[0] + 2.4, OMF_AF[1], H]] as GridPt[],
  toDa: [[WEBAPI[0] - 2.4, -0.6, H], [-11, -0.6, H], [-11, OMF_DA[1], H], [OMF_DA[0] + 1.9, OMF_DA[1], H]] as GridPt[],
};

export function OmfFloors() {
  return (
    <g>
      <Ent x={13} y={0}><Slab ax={2.8} ay={7.2} h={H} tint="grey" /></Ent>
      <Ent x={ADP[0]} y={ADP[1]}><Slab ax={3} ay={3} h={H} tint="orange" /></Ent>
      <Ent x={-11.5} y={0}><Slab ax={7.6} ay={7.2} h={H} /></Ent>
      <Ent x={13} y={7.2}><Pill text="devices" icon={Cpu} tone="dark" x={20} y={30} /></Ent>
      <Ent x={ADP[0]} y={3}><Pill text="edge · Windows or Linux" icon={Cable} tone="dark" x={-30} y={30} /></Ent>
      <Ent x={-11.5} y={7.2}><Pill text="PI Server (PI Web API, AF, Data Archive)" icon={Server} tone="dark" x={-60} y={30} /></Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const sending = step >= 3;
  return (
    <g>
      <OmfFloors />
      <Link pts={OMF_PATHS.fromOpc} show={step >= 1} />
      <Link pts={OMF_PATHS.fromMqtt} show={step >= 2} />
      <Link pts={OMF_PATHS.omf} show={step >= 1} />
      <Link pts={OMF_PATHS.toAf} show={step >= 3} />
      <Link pts={OMF_PATHS.toDa} show={step >= 4} kind={step === 7 ? 'bad' : 'solid'} />
      <Flow pts={OMF_PATHS.fromOpc} n={2} dur={1.4} kind="raw" show={step >= 1} />
      <Flow pts={OMF_PATHS.fromMqtt} n={2} dur={1.4} kind="raw" show={step >= 2} />
      <Flow pts={OMF_PATHS.omf} n={2} dur={1.6} kind={step === 3 ? 'violet' : step === 4 ? 'warn' : 'blue'} show={step >= 1} />
      <Flow pts={OMF_PATHS.toAf} n={1} dur={1.6} kind="violet" show={step === 3} />
      <Flow pts={OMF_PATHS.toDa} n={1} dur={1.6} kind={step === 4 ? 'warn' : 'ok'} show={step >= 4 && step !== 7} />

      <Ent x={OPCUA[0]} y={OPCUA[1]} z={H}>
        <Block label={['OPC UA', 'server']} icon={Cpu} tint="grey" />
        {step === 0 && <Pill text="new devices, edge hardware, Linux" icon={TriangleAlert} tone="warn" {...TOP} />}
      </Ent>
      <Ent x={MQTT[0]} y={MQTT[1]} z={H}>
        <Block label={['MQTT', 'broker']} icon={RadioTower} tint="grey" dim={step < 2} />
        {step === 2 && <Pill text="topic · valueField $.Value · dataType" icon={Braces} x={60} y={60} mono />}
      </Ent>
      <Ent x={ADP[0]} y={ADP[1]} z={H}>
        <Block label={['AVEVA', 'Adapter']} icon={Cable} tint="orange" glow={step === 1 || step === 2 || step === 6 ? 'var(--orange-side-b)' : undefined} />
        {step === 1 && <Pill text="devices → OMF endpoints" icon={Cable} {...TOP} />}
        {step === 6 && <Pill text="egress · health · buffering" icon={Activity} {...TOP} />}
      </Ent>
      <Ent x={WEBAPI[0]} y={WEBAPI[1]} z={H}>
        <Block label={['PI Web API', '/omf']} icon={Globe} tint="blue" glow={step >= 3 && step <= 5 ? 'var(--blue-side-b)' : undefined} />
        {step === 3 && <Pill text="1 · type message" icon={Braces} x={40} y={56} />}
        {step === 4 && <Pill text="2 · container message" icon={Container} x={40} y={56} />}
        {step === 5 && <Pill text="3 · data messages" icon={Braces} x={40} y={56} />}
        {step === 7 && <Pill text="names: container.property · no hierarchy choice" icon={TriangleAlert} tone="warn" x={40} y={56} />}
      </Ent>
      <Ent x={OMF_AF[0]} y={OMF_AF[1]} z={H}>
        <Block label="PI AF" icon={LayoutTemplate} tint="blue" size={1.6} h={30} dim={!sending} />
        {step === 3 && <Pill text="element template “DataType”" icon={LayoutTemplate} tone="good" x={-30} y={60} />}
        {step === 5 && <Pill text="static data → elements" icon={Boxes} x={-30} y={60} />}
      </Ent>
      <Ent x={OMF_DA[0]} y={OMF_DA[1]} z={H}>
        <Cylinder rx={24} h={36} tint="purple" dim={step < 4} />
        {step === 4 && <Pill text="PI point per value property" icon={Container} tone="good" x={-40} y={-76} />}
        {step === 5 && <Pill text="dynamic data → values" icon={Activity} x={-40} y={-76} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [180, 20, 1.15],
  [80, 0, 1.0],
  [130, 60, 1.1],
  [-90, -10, 1.05],
  [-110, -50, 1.05],
  [-130, -30, 1.0],
  [40, -30, 1.1],
  [-60, -50, 1.05],
  [0, 0, 0.82],
];

const lesson: Lesson = {
  id: 'cn-adapters-omf',
  chapter: 'connectors',
  title: 'Adapters & OMF',
  subtitle: 'Edge adapters speak OPC UA and MQTT on one side and OMF on the other — and OMF builds your PI points and templates.',
  minutes: 9,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'device data', color: 'var(--grey-side-b)' },
    { label: 'type message', color: 'var(--pkt-violet)' },
    { label: 'container message', color: 'var(--yellow-side-b)' },
    { label: 'data message', color: 'var(--pkt-ok)' },
  ],
  learn: [
    { text: 'What an AVEVA adapter does and where it runs', at: 1 },
    { text: 'How a data selection picks values out of MQTT messages', at: 2 },
    { text: 'What OMF type, container and data messages create', at: 5 },
    { text: 'What an adapter sends besides data', at: 6 },
    { text: 'How OMF through PI Web API names things', at: 7 },
  ],
  steps: [
    {
      short: 'Edge',
      title: 'New devices, at the edge',
      tag: 'problem',
      body: [
        'Newer equipment speaks OPC UA or publishes over MQTT, and often runs next to small edge hardware, sometimes on Linux. Classic Windows interfaces aren’t a natural fit.',
      ],
      metrics: [
        { label: 'Protocols', value: 'OPC UA · MQTT', icon: Cpu },
        { label: 'Platform', value: 'edge', icon: Cable },
      ],
    },
    {
      short: 'Adapter',
      title: 'Adapters collect and forward',
      tag: 'concept',
      body: [
        'An *AVEVA adapter* is a data-collection component that transfers time-series and event data from source devices to *OMF endpoints*: CONNECT data services, PI Servers or Edge Data Store.',
        'Adapters install on Windows or Linux and are configured through a REST API (stored as JSON) or the EdgeCmd command-line tool.',
      ],
      changed: [{ kind: 'add', text: 'OPC UA server → adapter → OMF' }],
      metrics: [
        { label: 'Out', value: 'OMF', icon: Braces },
        { label: 'Runs on', value: 'Windows / Linux', icon: Cable },
      ],
    },
    {
      short: 'Selection',
      title: 'A data selection says what to collect',
      tag: 'mechanism',
      body: [
        'For MQTT, each data selection item names a `topic`, a `valueField` — a JSONPath such as `$.Value` that pulls the value out of the payload — and a `dataType`.',
        'An optional `indexField` takes the timestamp from the payload; without it the adapter stamps the data itself.',
      ],
      changed: [{ kind: 'add', text: 'MQTT broker → adapter' }],
      metrics: [
        { label: 'topic', value: 'Site2/packaging', icon: RadioTower },
        { label: 'valueField', value: '$.Value', icon: Braces },
      ],
    },
    {
      short: 'Type',
      title: 'A type message describes the data',
      tag: 'mechanism',
      body: [
        'OMF starts by describing the shape of the data. A *type message* defines a dynamic type — here a timestamp index and a numeric value.',
        'Sent to PI Web API’s OMF endpoint, it creates an AF *element template* named after the type.',
      ],
      changed: [{ kind: 'add', text: 'Template “DataType” in PI AF' }],
      metrics: [
        { label: 'Message', value: 'type', icon: Braces },
        { label: 'Creates', value: 'element template', icon: LayoutTemplate, tone: 'good' },
      ],
    },
    {
      short: 'Container',
      title: 'A container message makes PI points',
      tag: 'mechanism',
      body: [
        'A *container message* defines a destination for data of a type — you must send the type first. To PI Web API a container is one or more PI points: one for a simple type, one per value property for a complex type.',
        'Deleting a container deletes all its PI points.',
      ],
      changed: [{ kind: 'add', text: 'PI point for the container' }],
      metrics: [
        { label: 'Message', value: 'container', icon: Container },
        { label: 'Creates', value: 'PI point(s)', icon: Server, tone: 'good' },
      ],
    },
    {
      short: 'Data',
      title: 'Data messages carry values',
      tag: 'mechanism',
      body: [
        '*Dynamic* data messages send time-series values to the PI points the containers created. *Static* data messages create AF elements from the templates.',
        'Type and container messages must come before data messages.',
      ],
      metrics: [
        { label: 'Dynamic', value: '→ PI points', icon: Activity },
        { label: 'Static', value: '→ elements', icon: Boxes },
      ],
    },
    {
      short: 'Operate',
      title: 'Egress, health and buffering',
      tag: 'mechanism',
      body: [
        'You configure one or more *egress endpoints* (such as PI Web API’s `/piwebapi/omf/`) with their security. Adapters can also send health and diagnostics data to a health endpoint, and buffer to protect against data loss.',
      ],
      metrics: [
        { label: 'Endpoint', value: '/piwebapi/omf/', icon: Globe },
        { label: 'Also', value: 'health · buffer', icon: Activity },
      ],
    },
    {
      short: 'Naming',
      title: 'OMF through PI Web API names things its way',
      tag: 'gotcha',
      body: [
        'Through PI Web API, OMF writes to a single PI AF database and Data Archive, and you can’t pick a place in the AF hierarchy or set a root element. Points are named `container` — or `container.property` for multi-property types.',
        'The older route through PI Data Collection Manager and PI Connector Relay behaves differently (prefixes, root elements, OMF 1.0 only).',
      ],
      callout: { kind: 'warn', text: 'Choose container IDs you are happy to see as PI point names — PI Web API can’t rename them later.' },
      metrics: [
        { label: 'Point name', value: 'container.property', icon: Server },
        { label: 'OMF', value: '1.0–1.2', icon: Braces },
      ],
    },
    {
      short: 'Recap',
      title: 'Adapter in, OMF out',
      tag: 'recap',
      body: [
        'Adapters collect from devices such as OPC UA servers and MQTT brokers, using data selections, and send OMF to endpoints like PI Web API.',
        'Type messages make templates, containers make PI points, data messages fill them — in that order.',
      ],
      metrics: [
        { label: 'Messages', value: 'type → container → data', icon: Braces },
      ],
    },
  ],
  docs: [
    { title: 'Principles of operation (Adapter for OPC UA)', url: 'https://docs.aveva.com/bundle/adapter-for-opc-ua/page/1228891.html', desc: 'What adapters do, where they run, how they are configured.' },
    { title: 'Data selection parameters (Adapter for MQTT)', url: 'https://docs.aveva.com/bundle/adapter-for-mqtt/page/1562601.html', desc: 'topic, valueField, dataType, indexField.' },
    { title: 'Step 2 - Define OMF type and send it in OMF Type message', url: 'https://docs.aveva.com/bundle/omf-with-pi-web-api/page/1017370.html', desc: 'A type message creates an AF element template.' },
    { title: 'Container messages', url: 'https://docs.aveva.com/bundle/omf-with-pi-web-api/page/1017392.html', desc: 'Containers create PI points; deleting removes them.' },
    { title: 'Data messages', url: 'https://docs.aveva.com/bundle/omf-with-pi-web-api/page/1017397.html', desc: 'Static and dynamic data messages, and message order.' },
    { title: 'Comparison of OMF PI Web API to OMF Relay', url: 'https://docs.aveva.com/bundle/omf-with-pi-web-api/page/1017360.html', desc: 'Naming, hierarchy and version differences.' },
  ],
  TryIt: lazy(() => import('../components/tryit/cn-adapters-omf')),
};

export default lesson;
