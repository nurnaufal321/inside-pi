# Inside PI — curriculum roadmap

The goal is to cover the whole AVEVA PI System, with every lesson in the same interactive isometric format. Each chapter is researched with the PI docs MCP (`search_pi_docs` → `get_page`, scoped to the bundles listed below) before any lesson is built. See `.claude/skills/inside-pi-lesson/SKILL.md` for the build pipeline.

Status: ✅ shipped · 🛠 in progress · ⏳ planned

Lesson titles for planned chapters are a draft. Chapter mode in the skill rewrites them from the docs before building.

## 01. Foundations ✅
| Lesson | id | Status |
|---|---|---|
| Anatomy of a PI Point | `tag-anatomy` | ✅ |
| How a Value Travels | `data-pipeline` | ✅ |

Module spec: [`AVEVA_PI_Data_Archive_Interactive_Curriculum.md`](AVEVA_PI_Data_Archive_Interactive_Curriculum.md) (modules 1–2)

## 02. Data Flow ✅
| Lesson | id | Status |
|---|---|---|
| Exception & Compression | `exception-compression` | ✅ |
| Snapshot & Event Queue | `snapshot-queue` | ✅ |

## 03. Reliability ✅
| Lesson | id | Status |
|---|---|---|
| Buffering | `buffering` | ✅ |
| Archive Lifecycle | `archive-lifecycle` | ✅ |

## 04. Security ✅
| Lesson | id | Status |
|---|---|---|
| Who Gets In | `security` | ✅ |

---

## 05. Asset Framework 🛠 (2 of 4)
Bundles: `pi-server-f-af-pse`, `af-sdk-getting-started`
Module spec: [`05-asset-framework.md`](05-asset-framework.md)

| Lesson | id | Status |
|---|---|---|
| Elements & Templates | `af-elements-templates` | ✅ |
| Attributes & Data References | `af-attributes` | ✅ |
| Event Frames | `af-event-frames` | ⏳ |
| AF Security & Check-in | `af-security` | ⏳ |

## 06. AF Analytics ⏳
Bundles: `pi-server-f-af-analytics`

Lessons (draft): Expressions & Scheduling · Rollups & SQC · Event Frame Generation · Backfill & Recalculation

## 07. Data Archive Operations ⏳
Bundles: `pi-server-s-buf-ha`, `pi-server-f-da-smt`, `pi-server-s-da-reference`, `pi-server-s-da-admin`

Lessons (draft): Collectives & HA · Backups & Archive Health · Tuning Parameters & SMT

## 08. Interfaces ⏳
Bundles: `overview-of-pi-interfaces`, `pi-universal-interface-uniint-framework`, `pi-interface-configuration-utility-icu`, `pi-to-pi-interface`

Lessons (draft): UniInt & Scan Classes · Configuring with ICU · Interface Failover · PI to PI

Long tail, covered as links from these lessons rather than as separate lessons: OPC DA/HDA, RDBMS, UFL, Modbus, DNP3, SNMP, Perfmon, Ping, TCP Response, simulator interfaces, and the batch interfaces (ABB 800xA, AVEVA Batch Management, DeltaV, Syncade, FactoryTalk, PharmaSuite, SIMATIC, PAS-X).

## 09. Connectors & Adapters ⏳
Bundles: `overview-of-pi-connectors`, `pi-connector-administration`, `adapter-for-opc-ua`, `adapter-for-mqtt`, `adapter-for-modbus-tcp`, `omf-with-pi-web-api`

Lessons (draft): Connector Architecture (Relay, Data Collection Manager) · Adapters & OMF · OPC UA and MQTT End to End

Long tail, linked: the connectors for BACnet, CygNet, EtherNet/IP, FANUC FOCAS, HART-IP, IEC 60870-5-104, IEC 61850, MQTT Sparkplug, OPC UA Gen 1/2, Ping, SIMATIC PCS 7, UFL and Wonderware Historian; the adapters for BACnet, DNP3, RDBMS and Structured Data Files.

## 10. Visualization ⏳
Bundles: `pi-vision`, `pi-vision-api-reference`, `pi-datalink`, `pi-processbook-to-pi-vision-migration-utility`, `pi-manual-logger`, `rtreports`

Lessons (draft): PI Vision Displays & Symbols · Search & Ad Hoc Trends · PI DataLink · ProcessBook Migration · Manual Logger & RtReports

## 11. Developer Access ⏳
Bundles: `pi-web-api`, `pi-web-api-reference`, `af-sdk`, `pi-sql-client-odbc`, `pi-sql-client-oledb`, `pi-sql-client-jdbc`, `pi-oledb-enterprise`, `pi-sql-commander-lite`

Lessons (draft): PI Web API: Controllers & Streams · Batch & Channels · AF SDK Object Model · The PI SQL Family

## 12. Architecture & Integration ⏳
Bundles: `pi-server-f-topologies`, `pi-server-f-install`, `pi-server-f-builder`, `pi-cloud-connect`, `pi-integrator-for-business-analytics`, `pi-integrator-for-esri-arcgis`, `pi-opc-ua-server`, `pi-system-connector-3`, `pi-to-connect-agent`, `pi-event-frames-generator`, `pi-autopointsync`

Lessons (draft): Topologies & Install Order · Bulk Edits with PI Builder · Cloud Connect & PI to CONNECT · Integrators · PI OPC UA Server

## Build order
05 → 06 → 07 → 08 → 09 → 10 → 11 → 12. One chapter per pull request.
