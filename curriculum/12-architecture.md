# Chapter 12 — Architecture & Integration

Bundles: `pi-server-f-topologies`, `pi-server-f-builder`, `pi-to-connect-agent`, `pi-opc-ua-server`. Related, linked: `pi-system-connector-3`, `pi-integrator-for-business-analytics`, `pi-cloud-connect`.

## Module 12.1: Topologies & Sizing (`ar-topologies`)
- Topology 1: up to 1,000 events/s, one PI System node with Data Archive, AF, Asset Analytics, Notifications and SQL Server Express (2 CPU, 8 GB). — [Topology 1](https://docs.aveva.com/bundle/pi-server-f-topologies/page/1283416.html)
- Topology 2A: up to 5,000 events/s, PI System node plus a SQL Server node; tuning parameters per topology. — [Topology 2A](https://docs.aveva.com/bundle/pi-server-f-topologies/page/1634261.html); 2B: 5,000–20,000. — [Topology 2B](https://docs.aveva.com/bundle/pi-server-f-topologies/page/1634263.html)
- Topology 3A: up to 50,000, separate Analytics node (Asset Analytics, Notifications); 3B 50,000–150,000; 3C 150,000–250,000. — [3A](https://docs.aveva.com/bundle/pi-server-f-topologies/page/1566328.html), [3B](https://docs.aveva.com/bundle/pi-server-f-topologies/page/1566330.html)
- Auxiliary components (PI Vision, PI Web API, PI System Connector, OPC UA Server, CONNECT integration, SQL DAS) are sized on their own dedicated nodes and are not in the core envelopes. — [Auxiliary topology components](https://docs.aveva.com/bundle/pi-server-f-topologies/page/1638815.html)
- Heavy PI Web API or SQL DAS use benefits from more SQL Server / AF resources; analyses should output to PI points for PI Vision. — [Topology 3: Things to note](https://docs.aveva.com/bundle/pi-server-f-topologies/page/1283409.html)

## Module 12.2: Bulk Edits with PI Builder (`ar-builder`)
- Excel add-in to create, retrieve, edit and delete PI points and AF objects; connects to an AF database or Data Archive. — [Get started with PI Builder](https://docs.aveva.com/bundle/pi-server-f-builder/page/1019417.html)
- Publish: parents in rows before children; only rows with X in Selected(x); stops after two blank rows/columns; Edit Mode Create and Edit / Create Only / Edit Only; Create or update PI points; auto check-in. — [Publish objects](https://docs.aveva.com/bundle/pi-server-f-builder/page/1020573.html)
- Edit Only guards against creating new objects by mistake. — [Edit PI AF objects](https://docs.aveva.com/bundle/pi-server-f-builder/page/1021909.html); Create Only errors on existing names. — [Create PI AF objects](https://docs.aveva.com/bundle/pi-server-f-builder/page/1021830.html)

## Module 12.3: PI to CONNECT (`ar-connect`)
- Agent streams selected AF elements and PI points to CONNECT data services; historical transfer from a past start time; backfill after the agent was down. — [Transfer PI System data to CONNECT data services](https://docs.aveva.com/bundle/pi-to-connect-agent/page/1509961.html)
- Historical first, then current; sent every 30 s or 50,000 events, whichever first. — [Start a PI to CONNECT data transfer](https://docs.aveva.com/bundle/pi-to-connect-agent/page/1509963.html)
- Statuses: Sending Historical Data, Sending Streaming Data, Backfilling Streaming Gap, Streaming Error Failover, Update Queue Overflow… — [Data transfer status](https://docs.aveva.com/bundle/pi-to-connect-agent/page/1509964.html)

## Module 12.4: PI OPC UA Server (`ar-opc-ua`)
- Manages communication between any OPC UA client and PI Server. — [Release 1.0.0](https://docs.aveva.com/bundle/pi-opc-ua-server/page/1594972.html)
- Address space: Objects › AF Servers (Databases, Elements, Attributes) and DA Servers (all points, or grouped by point source). — [Browse data](https://docs.aveva.com/bundle/pi-opc-ua-server/page/1514426.html)
- Subscriptions deliver updates without polling; AF attributes and PI points can be subscribed, properties cannot. — [Subscribe to data](https://docs.aveva.com/bundle/pi-opc-ua-server/page/1514424.html)
