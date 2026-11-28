# Chapter 10 — Visualization

Bundles: `pi-vision`, `pi-datalink`, `pi-processbook-to-pi-vision-migration-utility`. Related, linked: `pi-vision-api-reference`, `pi-manual-logger`, `rtreports`.

## Module 10.1: PI Vision Displays & Symbols (`vi-displays`)
- Symbols: trend, value, gauges, table, asset comparison table, time series table, bar chart, XY plot. — [Add a symbol to a display](https://docs.aveva.com/bundle/pi-vision/page/1009811.html)
- Monitor mode locks the display; dragging a data item onto a trend adds a trace, onto a table adds a row, onto a value or gauge swaps it; new symbols switch to Design mode; double-click opens a pop-up trend. — [Monitor displays](https://docs.aveva.com/bundle/pi-vision/page/1009823.html)
- Timebar: shared start/end, 8 h default, end time Now (*) keeps symbols updating. — [Use the timebar control](https://docs.aveva.com/bundle/pi-vision/page/1009777.html)
- Asset list: default shows assets from the same template, switching one asset at a time; criteria-based lists treat the asset as lone (same template) or root (with descendants); can be hidden. — [Configure asset lists](https://docs.aveva.com/bundle/pi-vision/page/1009801.html)
- Collections replicate symbols for each related asset; edit criteria to change which assets appear. — [Create a collection](https://docs.aveva.com/bundle/pi-vision/page/1010091.html)
- Ad hoc URL displays: DataItems, StartTime/EndTime, default 8 h to now, trend by default. — [Temporary (ad hoc) displays](https://docs.aveva.com/bundle/pi-vision/page/1009426.html)

## Module 10.2: PI DataLink (`vi-datalink`)
- Excel add-in retrieving PI point and AF attribute values and metadata into worksheets; functions embed in cells and update on recalculation. — [PI DataLink overview](https://docs.aveva.com/bundle/pi-datalink/page/1014223.html), [Learn about PI DataLink Functions](https://docs.aveva.com/bundle/pi-datalink/page/1013798.html)
- Sampled Data returns evenly spaced interpolated values at an interval; output cell expands down and right and may overwrite adjacent cells. — [Sampled Data function](https://docs.aveva.com/bundle/pi-datalink/page/1013850.html)
- Automatic Update recalculates at an interval (min 5 s; 0 = twice the calculation time); Calculate (F9) updates volatile functions — Current Value is the only volatile one — Full Calculate updates all; cache cleared every 6 h or manually. — [Automatic Update feature](https://docs.aveva.com/bundle/pi-datalink/page/1014213.html), [Manage PI DataLink settings](https://docs.aveva.com/bundle/pi-datalink/page/1013790.html)

## Module 10.3: ProcessBook to PI Vision (`vi-migration`)
- Limitations: ERD needs an AF connection; Arial only, no font styles; no layers; VBA dropped; no UOM conversion; multi-state needs a server connection; buttons become rectangles with navigation links when targets migrate together; ActiveX controls, OLE objects, SQC charts and BatchView aren't migrated. — [Migration limitations](https://docs.aveva.com/bundle/pi-processbook-to-pi-vision-migration-utility/page/1011842.html)
