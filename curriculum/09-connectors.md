# Chapter 09 — Connectors & Adapters

Bundles: `overview-of-pi-connectors`, `pi-connector-administration`, `adapter-for-opc-ua`, `adapter-for-mqtt`, `omf-with-pi-web-api`.

Long tail, linked from these lessons: PI Connectors for BACnet, CygNet, EtherNet/IP, FANUC FOCAS, HART-IP, IEC 60870-5-104, IEC 61850, MQTT Sparkplug, OPC UA Gen 1/2, Ping, SIMATIC PCS 7, UFL, Wonderware Historian; adapters for BACnet, DNP3, Modbus TCP, RDBMS, Structured Data Files.

## Module 9.1: Connectors, Relay & DCM (`cn-connectors`)
- Connectors scan sources and discover data items. Generation 1 is the superhost model, mirroring the source into AF and Data Archive; Generation 2 adds PI Connector Relay (one or more PI Server destinations; can sit in a DMZ) and PI Data Collection Manager. — [Generations of PI connectors](https://docs.aveva.com/bundle/overview-of-pi-connectors/page/1009907.html)
- Data streams go through the relay, which creates PI points and assets automatically and updates them as sources change; DCM configures and monitors the flow; a connector can send to several relays, an OMF application to one. — [Data collection operations](https://docs.aveva.com/bundle/pi-connector-administration/page/1011288.html)
- Buffering is in-process and always on: connector→relay in one queue, relay→PI per destination; Buffer Statistics; buffer error messages such as attribute type changes. — [PI connectors data buffering](https://docs.aveva.com/bundle/overview-of-pi-connectors/page/1009918.html)

## Module 9.2: Adapters & OMF (`cn-adapters-omf`)
- Adapters transfer time-series and event data from devices to OMF endpoints in CONNECT data services, PI Servers or Edge Data Store; run on Windows or Linux; configured by REST (JSON) or EdgeCmd; egress, health, buffering, logging. — [Principles of operation (OPC UA adapter)](https://docs.aveva.com/bundle/adapter-for-opc-ua/page/1228891.html)
- MQTT data selection: topic, valueField (JSONPath), dataType, optional indexField/uom; adapter-supplied timestamps when no index. — [Data selection parameters (MQTT adapter)](https://docs.aveva.com/bundle/adapter-for-mqtt/page/1562601.html)
- OMF messages: a type message creates an AF element template; a container message creates PI points (one per value property), deleting it deletes them; data messages send values (static → elements, dynamic → PI points) after type and container. — [Step 2](https://docs.aveva.com/bundle/omf-with-pi-web-api/page/1017370.html), [Container messages](https://docs.aveva.com/bundle/omf-with-pi-web-api/page/1017392.html), [Data messages](https://docs.aveva.com/bundle/omf-with-pi-web-api/page/1017397.html)
- OMF with PI Web API versus DCM/Relay: OMF 1.0–1.2, single AF + Data Archive, Windows basic authentication, point naming container.property. — [Comparison](https://docs.aveva.com/bundle/omf-with-pi-web-api/page/1017360.html)
