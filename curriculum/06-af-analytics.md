# Chapter 06 — AF Analytics

Bundle: `pi-server-f-af-analytics` (Analytics and Notifications for PI System Explorer, PI Server 2024 R2).

Shared sources:
- [Introduction to analyses](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1020478.html): an analysis runs on a schedule, takes AF attribute values as inputs and produces values or event frames; every analysis belongs to an element or element template; four types; save outputs to PI points (better performance, trends); PI Analysis Service writes outputs without exception reporting, but the output point's compression applies.
- [Learn about the different types of analyses](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1068689.html)

## Module 6.1: Expressions & Scheduling (`an-expressions`)
- Expression analyses calculate outputs from functions, operators and inputs; at least one output must be mapped. Saving history creates a PI point data reference attribute and a PI point; no history creates an analysis data reference, calculated only when requested (best when only the latest value matters). — [Understand expression analyses](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1018881.html), [Create an expression analysis](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1021796.html)
- Scheduling: periodic (clock time, UTC; max 120 per second; periods that don't divide the day reset at midnight) or event-triggered (on input attribute changes; the default triggers on any input). — [Understand analysis scheduling](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1021630.html)
- Output timestamps default to the trigger time; you can offset them or fix a time of day. — [Learn about output time stamps for analyses](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1020479.html)
- Gotcha: outputs skip exception reporting but the output point's compression still decides what is archived.

## Module 6.2: Rollups & SQC (`an-rollups-sqc`)
- Rollups calculate statistics over attributes of an element (aggregation) or its child elements, selected by name, category or template; new matching attributes are included automatically; avoid mixed UOMs and value types; strings don't participate. — [Understand rollup analyses](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1022214.html)
- Functions: Sum, Average, Minimum, Maximum, Count, Median, population and sample standard deviation; bad inputs are omitted (Count returns 4 of 5). — [Learn about rollup analysis functions](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1020660.html)
- SQC analyses test whether an attribute lies within control limits using pattern tests (Outside Control, 2 Sigma, 1 Sigma, One Side of Center Line, Stratification, Mixture, Trend). — [Understand SQC analyses](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1020786.html)
- Inputs: Source, Upper/Lower Control Limit, Center Line; X of Y per test (Western Electric defaults); output Normal or the highest-priority failed test, as an event frame or AF attribute (SQC Enumeration); ClearOnControlLimitChange. — [Create an SQC analysis](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1021803.html)

## Module 6.3: Event Frame Generation (`an-ef-generation`)
- Start/end conditions are true/false expressions; one start trigger can both start and end events; based on an event frame template; the element becomes the primary referenced element; Outputs at Close; severity levels; naming patterns (%EndTime%, %Duration% at close; default pattern); root cause child event frames. — [Learn about event frame generation analyses](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1021921.html)
- True for delays starting until the condition stays true; start time is when it first became true; periodic scheduling interplay; the event closes when the start trigger goes false, or when the end trigger is met; avoid start and end true together; recommend start trigger only. — [Learn about start and end trigger conditions](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1020801.html)

## Module 6.4: Backfill & Recalculation (`an-backfill`)
- Backfilling fills gaps and keeps data; recalculation deletes and regenerates; automatic backfilling covers service downtime (72 h by default); automatic recalculation handles late inputs once opted in per template; outputs must map to PI points; event frame analyses delete event frames and annotations; out-of-order outputs are not compressed; Execute permission via the Asset Analytics Recalculation identity; event frame generation analyses are excluded from automatic recalculation. — [Understand backfilling and recalculation of analyses](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1022569.html)
- Opt in with "Recalculate analysis for out-of-order input events"; an event is late if older than the last execution time. — [Configure automatic recalculation](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1018630.html), [Learn how to work with analyses](https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1068694.html)
