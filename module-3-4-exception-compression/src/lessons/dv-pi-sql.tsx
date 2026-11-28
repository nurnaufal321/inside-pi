import { lazy } from 'react';
import { Cable, Columns3, Database, FileSpreadsheet, GitMerge, ListTree, Rows3, Server, Table, Terminal } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, IsoBox, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * A SQL client with a PI SQL Client driver (x −12) sends queries to PI SQL DAS (RTQP Engine) on the PI AF
 * server floor (x 2, y 1). SQL DAS reads PI Data Archive (x 13, y −3) and the AF SQL Server database
 * (x 13, y 5). Results travel −x back to the client and land in a result grid in front of it.
 */
export const CLI: [number, number] = [-12, 0];
export const DAS: [number, number] = [2, 1];
export const AFSVC: [number, number] = [2, -5];
export const SQ_DA: [number, number] = [13, -3];
export const SQ_SQL: [number, number] = [13, 5];
const H = 4;
export const GRID_Z = 4;

export const SQL_PATHS = {
  query: [[CLI[0] + 2.4, -0.6, H], [DAS[0] - 2.4, -0.6, H]] as GridPt[],
  toClient: [[DAS[0] - 2.4, 2, H], [CLI[0] + 2.4, 2, H]] as GridPt[],
  fromDa: [[SQ_DA[0] - 1.9, SQ_DA[1], H], [7, SQ_DA[1], H], [7, 0.4, H], [DAS[0] + 2.4, 0.4, H]] as GridPt[],
  fromSql: [[SQ_SQL[0] - 1.9, SQ_SQL[1], H], [7.8, SQ_SQL[1], H], [7.8, 1.8, H], [DAS[0] + 2.4, 1.8, H]] as GridPt[],
};

export function SqlFloors() {
  return (
    <g>
      <Ent x={13} y={1}><Slab ax={2.8} ay={6.4} h={H} /></Ent>
      <Ent x={2} y={-2}><Slab ax={3.2} ay={6} h={H} tint="blue" /></Ent>
      <Ent x={CLI[0]} y={CLI[1]}><Slab ax={3} ay={3} h={H} tint="grey" /></Ent>
      <Ent x={15.8} y={7.4}><Pill text="PI Data Archive · SQL Server" icon={Database} tone="dark" x={6} y={-4} /></Ent>
      <Ent x={5.2} y={-8}><Pill text="PI AF Server" icon={Server} tone="dark" x={8} y={-6} /></Ent>
      <Ent x={-15} y={1}><Pill text="SQL client + PI SQL driver" icon={Terminal} tone="dark" x={-150} y={-6} /></Ent>
    </g>
  );
}

/** A small result grid in front of the client: rows run down +y, columns across +x. */
export function ResultGrid({ rows, cols, tint = 'green' }: { rows: number; cols: number; tint?: 'green' | 'blue' | 'rose' }) {
  const out = [];
  for (let r = 0; r < Math.min(rows, 12); r++) {
    for (let c = 0; c < cols; c++) {
      out.push(
        <Ent key={`${r}-${c}`} x={-15.2 + c * 1.25} y={5.4 + r * 0.62} z={GRID_Z}>
          <IsoBox ax={0.55} ay={0.26} h={3} tint={c === 0 ? 'grey' : tint} r={1.5} shadow={false} />
        </Ent>,
      );
    }
  }
  return <g>{out}</g>;
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const grid = step === 4 ? { rows: 6, cols: 2 } : step === 5 ? { rows: 12, cols: 3 } : step === 6 ? { rows: 3, cols: 5 } : step === 7 ? { rows: 4, cols: 3 } : null;
  return (
    <g>
      <SqlFloors />
      <Link pts={SQL_PATHS.query} show={step >= 1} arrow={false} kind="muted" />
      <Link pts={SQL_PATHS.toClient} show={step >= 1} />
      <Link pts={SQL_PATHS.fromDa} show={step >= 2} />
      <Link pts={SQL_PATHS.fromSql} show={step >= 2} />
      <Flow pts={SQL_PATHS.query} n={1} dur={1.6} kind="req" show={step >= 1} />
      <Flow pts={SQL_PATHS.fromDa} n={2} dur={1.6} kind="ok" show={step >= 2} />
      <Flow pts={SQL_PATHS.fromSql} n={1} dur={1.8} kind="violet" show={step >= 2} />
      <Flow pts={SQL_PATHS.toClient} n={2} dur={1.4} kind="blue" show={step >= 1} />
      {grid && <ResultGrid rows={grid.rows} cols={grid.cols} tint={step === 6 ? 'blue' : 'green'} />}

      <Ent x={SQ_DA[0]} y={SQ_DA[1]} z={H}><Cylinder rx={22} h={32} tint="purple" label="PI" /></Ent>
      <Ent x={SQ_SQL[0]} y={SQ_SQL[1]} z={H}><Cylinder rx={22} h={32} tint="grey" label="SQL" /></Ent>
      <Ent x={AFSVC[0]} y={AFSVC[1]} z={H}><Block label="PI AF" icon={Server} tint="blue" size={1.4} h={26} /></Ent>
      <Ent x={DAS[0]} y={DAS[1]} z={H}>
        <Block label={['PI SQL DAS', 'RTQP']} icon={Database} tint="green" glow={step === 2 ? 'var(--green-side-b)' : step === 3 ? 'var(--amber)' : undefined} />
        {step === 2 && <Pill text="executes the queries · AF server only" icon={Database} x={14} y={66} />}
        {step === 3 && <Pill text="5464 · 5465 in · 5450 · 1433 out" icon={Cable} tone="warn" x={14} y={66} mono />}
      </Ent>
      <Ent x={CLI[0]} y={CLI[1]} z={H}>
        <Block label={['SQL', 'client']} icon={Terminal} tint="grey" />
        {step === 0 && <Pill text="the BI tool speaks SQL" icon={FileSpreadsheet} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="OLEDB · ODBC · JDBC" icon={Cable} {...TOP} />}
        {step === 4 && <Pill text="Master.Element.ElementHierarchy" icon={ListTree} {...TOP} mono />}
        {step === 5 && <Pill text="one row per attribute value" icon={Rows3} {...TOP} />}
        {step === 6 && <Pill text="one column per attribute" icon={Columns3} tone="good" {...TOP} />}
        {step === 7 && <Pill text="INNER REMOTE JOIN … ElementHierarchy" icon={GitMerge} {...TOP} mono />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-150, -40, 1.1],
  [-60, -30, 1.0],
  [60, -10, 1.05],
  [60, -10, 1.0],
  [-170, -20, 1.05],
  [-170, -20, 1.05],
  [-170, -20, 1.05],
  [-170, -20, 1.05],
  [-20, -10, 0.85],
];

const lesson: Lesson = {
  id: 'dv-pi-sql',
  chapter: 'developer-access',
  title: 'The PI SQL Family',
  subtitle: 'SQL drivers in front of the RTQP engine on your AF server — what they query, which ports they need, and how to get one column per attribute.',
  minutes: 8,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'queries', color: 'var(--pkt-req)' },
    { label: 'PI point data', color: 'var(--pkt-ok)' },
    { label: 'AF database', color: 'var(--pkt-violet)' },
    { label: 'result rows', color: 'var(--pkt-blue)' },
  ],
  learn: [
    { text: 'Which drivers make up PI SQL Client', at: 1 },
    { text: 'What PI SQL DAS (RTQP Engine) does and where it runs', at: 2 },
    { text: 'Which ports the query path needs', at: 3 },
    { text: 'Why data tables return rows, and how transposed functions return columns', at: 6 },
    { text: 'How a linked server joins SQL Server data to AF', at: 7 },
  ],
  steps: [
    {
      short: 'Problem',
      title: 'The reporting tool speaks SQL',
      tag: 'problem',
      body: [
        'SQL Server reports, BI tools and spreadsheets talk SQL through standard drivers — not REST, not .NET. They still want AF elements and PI values.',
      ],
      metrics: [
        { label: 'Client', value: 'SQL tools', icon: FileSpreadsheet },
        { label: 'Wants', value: 'AF + values', icon: Table },
      ],
    },
    {
      short: 'Drivers',
      title: 'PI SQL Client: standard drivers',
      tag: 'concept',
      body: [
        '*PI SQL Client* is a family of drivers — *OLEDB*, *ODBC* and *JDBC*. Each implements an industry-standard API and exposes PI System data to third-party clients and applications through SQL queries.',
      ],
      changed: [{ kind: 'add', text: 'Client driver → query path' }],
      metrics: [
        { label: 'Drivers', value: 'OLEDB · ODBC · JDBC', icon: Cable },
        { label: 'Language', value: 'SQL', icon: Terminal },
      ],
    },
    {
      short: 'RTQP',
      title: 'PI SQL DAS runs the query',
      tag: 'mechanism',
      body: [
        'The drivers don\'t execute queries themselves. *PI SQL Data Access Server (RTQP Engine)* — the Real-Time Query Processing engine — does, and it supports queries for PI AF server.',
        'It is a PI AF server component and can only be installed on a PI AF server. Install it before the client drivers.',
      ],
      changed: [{ kind: 'add', text: 'SQL DAS (RTQP) on the AF server' }],
      metrics: [
        { label: 'Executes', value: 'SQL DAS', icon: Database },
        { label: 'Runs on', value: 'PI AF server', icon: Server },
      ],
    },
    {
      short: 'Ports',
      title: 'Every hop needs its port',
      tag: 'gotcha',
      body: [
        'Clients reach PI AF on `5457` and SQL DAS on `5464` (HTTP/SOAP) and `5465` (net.tcp). SQL DAS in turn reaches PI Data Archive on `5450` and SQL Server on `1433`.',
        'A firewall that blocks any of these hops breaks the query path, even though each server looks healthy on its own.',
      ],
      callout: { kind: 'warn', text: 'Open 5464/5465 to the AF server for PI SQL clients, not just 5457.' },
      metrics: [
        { label: 'Client → DAS', value: '5464 · 5465', icon: Cable },
        { label: 'DAS → PI', value: '5450', icon: Database },
      ],
    },
    {
      short: 'Metadata',
      title: 'Query AF like tables',
      tag: 'mechanism',
      body: [
        'AF objects appear as tables: `SELECT Name FROM Master.Element.ElementHierarchy WHERE Path LIKE \'\\NuGreen\\Houston\\%\'` lists elements under a path; `Master.Element.Element WHERE Template = \'Boiler\'` finds every boiler.',
      ],
      metrics: [
        { label: 'Table', value: 'ElementHierarchy', icon: ListTree },
        { label: 'Filter', value: 'Path · Template', icon: Table },
      ],
    },
    {
      short: 'Rows',
      title: 'Data tables return rows',
      tag: 'mechanism',
      body: [
        'Built-in data tables such as *Snapshot* and *Archive* return attributes and their values in rows: three boilers with four attributes each is twelve rows.',
        'A report that wants one column per attribute would have to join the table to itself again and again.',
      ],
      metrics: [
        { label: 'Rows', value: '12', icon: Rows3 },
        { label: 'Shape', value: 'one row per value', icon: Table },
      ],
    },
    {
      short: 'Transposed',
      title: 'Transposed functions return columns',
      tag: 'mechanism',
      body: [
        'A *transposed table-valued function* (TVF) built from an AF element template returns one column per attribute — three boilers, three rows. Use it with `CROSS APPLY`, or use the derived *function table* where TVFs aren\'t allowed.',
        'Create them with the Transpose Function wizard in *PI SQL Commander Lite*, under the database\'s DataT node.',
      ],
      changed: [{ kind: 'mod', text: '12 rows × 3 → 3 rows × 5' }],
      metrics: [
        { label: 'Rows', value: '3', icon: Rows3, tone: 'good' },
        { label: 'Built from', value: 'element template', icon: Columns3 },
      ],
    },
    {
      short: 'Linked server',
      title: 'Join SQL Server data to AF',
      tag: 'mechanism',
      body: [
        'Through a SQL Server *linked server*, a heterogeneous query can join a local table to AF — for example `INNER REMOTE JOIN LINKED_SERVER.Master.Element.ElementHierarchy` on element names kept in a local table.',
      ],
      metrics: [
        { label: 'Join', value: 'local ⋈ AF', icon: GitMerge },
        { label: 'Via', value: 'linked server', icon: Cable },
      ],
    },
    {
      short: 'Recap',
      title: 'SQL in front, RTQP behind',
      tag: 'recap',
      body: [
        'PI SQL Client drivers speak the standard; PI SQL DAS (RTQP Engine) on the AF server runs the query against AF, PI Data Archive and SQL Server — open every hop\'s port.',
        'Data tables give rows; transposed functions give one column per attribute.',
      ],
      metrics: [
        { label: 'Engine', value: 'RTQP', icon: Database, tone: 'good' },
        { label: 'Reports', value: 'transposed', icon: Columns3, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Introduction to PI SQL Data Access Server (RTQP Engine)', url: 'https://docs.aveva.com/bundle/pi-sql-data-access-server-rtqp-engine/page/1016057.html', desc: 'What SQL DAS does and where it installs.' },
    { title: 'PI SQL Client ODBC', url: 'https://docs.aveva.com/bundle/pi-sql-client-odbc/page/1014381.html', desc: 'The ODBC driver and the PI SQL Client family.' },
    { title: 'Install PI SQL Client', url: 'https://docs.aveva.com/bundle/pi-sql-client-odbc/page/1014336.html', desc: 'Install PI SQL DAS before the client.' },
    { title: 'Using PI SQL Data Access Server (RTQP Engine)', url: 'https://docs.aveva.com/bundle/pi-server-f-topologies/page/1638826.html', desc: 'Sizing and the data flows with their ports.' },
    { title: 'SQL statements', url: 'https://docs.aveva.com/bundle/pi-sql-client-oledb/page/1014258.html', desc: 'Example queries against Master.Element tables.' },
    { title: 'Heterogenous queries', url: 'https://docs.aveva.com/bundle/pi-sql-client-oledb/page/1014257.html', desc: 'Joining SQL Server tables to AF through a linked server.' },
    { title: 'Transposition of data tables and TVFs', url: 'https://docs.aveva.com/bundle/pi-oledb-enterprise/page/1015823.html', desc: 'One column per attribute with transposed functions.' },
  ],
  TryIt: lazy(() => import('../components/tryit/dv-pi-sql')),
};

export default lesson;
