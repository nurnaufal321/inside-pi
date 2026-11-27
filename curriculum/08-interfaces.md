# Chapter 08 — PI Interfaces

Bundles: `pi-universal-interface-uniint-framework`, `pi-interface-configuration-utility-icu`, `pi-to-pi-interface`.

The individual interfaces (OPC DA/HDA, RDBMS, UFL, Modbus, DNP3, SNMP, Perfmon, Ping, TCP Response, simulators, the batch interfaces) all share the UniInt framework taught here; each lesson links to that family.

## Module 8.1: UniInt & Scan Classes (`if-uniint`)
- UniInt-based interfaces share failover, disconnected startup, input and output points, and health/performance points; they send data with PI API. — [UniInt-based interfaces](https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026204.html)
- Input points are scan-based (Location4 = scan class), unsolicited or trigger-based (Location4 = 0). — [Input points](https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026198.html)
- /f defines scan classes in order (period, offset, L for wall-clock); offsets spread the load; changing order or deleting scan classes affects existing points; /ec sets a unique IO rate counter. — [Standard parameters](https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026147.html)
- Health points: heartbeat 1–15 at the fastest scan class (1 s…60 s), Intf Shut on normal shutdown, device status, IO rate, scan class counters. — [Health points](https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026077.html)
- PI ICU configures parameters, manages the service, buffering and logs. — [Introduction to PI ICU](https://docs.aveva.com/bundle/pi-interface-configuration-utility-icu/page/1011097.html)

## Module 8.2: Interface Failover (`if-failover`)
- Phase 2 shared-file failover between two instances on two computers; hot, warm or cold; phase 1 is deprecated; first started is primary; heartbeat 1–15 (17–31 without a Data Archive connection, 0 on shutdown); active ID; hot failover queues three intervals and may overlap; Primary Error / Backup Error; disconnected startup. — [UniInt failover configuration overview](https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026203.html)

## Module 8.3: PI to PI (`if-pi-to-pi`)
- Copies point data one way from a source to a target Data Archive; uses: isolation, copies, test systems, aggregation; collectives alternative; scan class 1 receives exception data, others archive data; history recovery (default 8 h); source-level and UniInt failover. — [Introduction to the PI to PI Interface](https://docs.aveva.com/bundle/pi-to-pi-interface/page/1012164.html)
- History recovery runs at startup, after reconnecting, on queue overflow, for new points and on failover; starts per point at its current value; append/replace/no replace; bypasses compression on the target; time-range recovery mode exits after recovering. — [History recovery](https://docs.aveva.com/bundle/pi-to-pi-interface/page/1012180.html)
