# Chapter 07 — Data Archive Operations

Bundles: `pi-server-s-buf-ha`, `pi-server-s-da-admin`, `pi-server-f-da-smt`, `pi-server-s-da-reference`.

## Module 7.1: Collectives & HA (`da-collectives`)
- A collective is multiple Data Archive servers acting as one logical server for HA, disaster recovery, load distribution and scalability; a secondary keeps collecting and serving data when the primary is unavailable. — [Collectives](https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1022287.html)
- Clients fail over to another member and switch back automatically; connection preference (require primary / prefer primary / any) is considered first, then connection priority. — [Client failover](https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1018593.html)
- Configuration changes are made on the primary, which sends them to the secondaries; clients that write configuration must connect to the primary. — [Specify the connection preference for PI SDK clients](https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1020776.html)
- N-way buffering sends data from the source to every member; PI to PI can copy between members when that is impossible, but is less robust. — [Data transfer between collective members](https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1019485.html)
- Limitations: single AD domain; geographically distributed servers suit PI to PI; data not sent through buffering is not replicated; batch records are not replicated. — [High availability limitations](https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1020189.html)
- Health counters: IsCommunicating, IsAvailable, IsInSync, LastSyncRecordID. — [Data Archive collective performance](https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1020119.html)

## Module 7.2: Backups & Health Checks (`da-backups`)
- A collective is not a substitute for a backup; back up at least the primary; tuning parameters and message logs are not replicated; schedule member backups 30+ minutes apart; restoring the primary requires reinitializing secondaries. — [Data Archive collectives and backups](https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1020122.html)
- Backup types: Copy (Backups tool), Incremental (scheduled), Differential and Full (third-party), Numarch/Cutoff (legacy). — [Data Archive backup types](https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020078.html)
- On-demand backups need PIBACKUP read/write; don't substitute them for scheduled backups set up as a Windows scheduled task. — [Perform an on-demand Data Archive backup](https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020011.html), [Data Archive backup scripts](https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020285.html)
- Keep archives and event queue, the paging file and the backup directory on separate drives; archives must be local. — [Recommended disk configuration](https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020591.html)
- Health check: daily archives and backups; weekly message logs, interface logs, snapshot flow, IO rates; monthly licensing. — [Data Archive daily health check](https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1022426.html)

## Module 7.3: Tuning Parameters (`da-tuning`)
- The Tuning Parameters tool in PI SMT groups settings by tab (General, Archive, Backup, Base, Net Manager, Snapshot, Update Manager, Security). — [Configurable tuning parameters](https://docs.aveva.com/bundle/pi-server-f-da-smt/page/1019467.html)
- Edits take effect only after restarting Data Archive or the subsystem; connected clients need to reconnect; tuning parameters are not replicated in a collective. — [Edit tuning parameters](https://docs.aveva.com/bundle/pi-server-f-da-smt/page/1019469.html)
- PITUNING (r,w) to edit; (r) to view. — [Tuning Parameters security permissions](https://docs.aveva.com/bundle/pi-server-f-da-smt/page/1021401.html)
- pitimeout.tbl stores tuning parameters; SnapFlushCycle (15 min default) bounds how old the snapshot can be after a crash, which sets shutdown event timestamps. — [PI Data Archive file types](https://docs.aveva.com/bundle/pi-server-s-da-reference/page/1022114.html)
