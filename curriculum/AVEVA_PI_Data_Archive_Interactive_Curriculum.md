# AVEVA PI Data Archive — Interactive Visual Learning Curriculum

> 8 explorable-explanation modules grounded in official AVEVA documentation  
> Inspired by Dilum Sanjaya's interactive visualizers & Explorable Explanations  
> All technical facts verified via `pi-server-s-da-admin`, `pi-server-s-da-reference`, and `pi-server-s-buf-ha` bundles on docs.aveva.com

---

## Module 1: Tag Anatomy & Point Classes

### Core Concept
Every PI point (tag) is defined by a **point class** (schema) that groups **attribute sets**; the two built-in classes — **Base** and **Classic** — determine what attributes a tag carries, while the `PointType`, `Zero`/`Span`, `Step`, and `DigitalSet` attributes control how values are stored and interpreted.

### Verified PI Technical Facts (from MCP)

| Attribute | Type | Default | Limits / Notes |
|-----------|------|---------|----------------|
| `PointType` | String | `Float32` | Allowed: `Float16`, `Float32`, `Float64`, `Int16`, `Int32`, `Digital`, `String`, `Blob`, `Timestamp` |
| `Zero` | Float32 | `0.0` | For digital points, automatically set to digital-set number; irrelevant for non-numeric types |
| `Span` | Float32 | `100.0` | Must be positive; for `Float16`, used with `Zero` for archive scaling |
| `Step` | BYTE | `0` (OFF) | 0 = continuous (interpolated), 1 = discrete (held). **Always ON for non-numeric types** (Digital, String, Timestamp) |
| `DigitalSet` | String | `system` | Used only for Digital-type points; must reference an existing digital state set |
| `PtClassName` | String | `base` | Allowed: `Base`, `Classic`, `Totalizer`, `alarm` |
| `Compressing` | BYTE | `1` (ON) | ON/OFF; when OFF, all exceptions are recorded without compression |
| `Archiving` | BYTE | `1` (ON) | ON/OFF |
| `CompDev` | Float32 | `0.2` | Engineering units |
| `CompMax` | Uint32 | `28800` | Seconds (8 hours default) |
| `CompMin` | Uint16 | `0` | 0–65535 seconds |
| `ExcDev` | Float32 | `0.1` | Engineering units |
| `ExcMax` | Uint32 | `600` | Seconds (10 minutes default) |
| `ExcMin` | Uint16 | `0` | 0–65535 seconds |
| `PointSource` | String | `Lab` | Identifies the data source |
| `TypicalValue` | Float32 | `50.0` | Must be within `Zero` ≤ x ≤ `Zero + Span` |

**Point Class Structure:**
- A **point class** = a group of **attribute sets**; no two attribute sets within a class share the same attribute
- **Base** class: minimal attribute set (archiving, compression, exception, descriptors)
- **Classic** class: extends Base with additional attribute sets (Location codes, scan classes, instrument ranges, etc.)
- Class is assigned at point creation and determines which attributes are configurable
- Built-in attributes (e.g., `CompDevPercent`, `ExcDevPercent`, `PtSecurity`, `DataSecurity`, `PointID`, `RecNo`) belong to **every** PI point regardless of class

**Non-numeric type rules:**
- `CompDev`, `CompDevPercent`, `ExcDev`, `ExcDevPercent` → returned as 0, ignored
- `Span` and `Zero` → not applicable (for digital: `Zero` = digital set number)
- `Step` → always ON (1)

> **Source:** "Point classes and attributes" (pi-server-s-da-admin/1021240), "Attributes that depend on point type" (pi-server-s-da-admin/1019291), "base" (pi-server-s-da-admin/1022864), "Built-in attributes" (pi-server-s-da-admin/1019296), "Span" (pi-server-s-da-admin/1021249)

### Interactive Visual Scene
An animated SVG "tag blueprint" that opens like an engineering schematic:
- **Center:** a large tag card showing `Tag: FT-101` with its current `PointType`, `Zero`, `Span`, and engineering-unit range rendered as a vertical thermometer-style gauge
- **Left panel:** a tree diagram showing the **point class hierarchy** — `Base` class with its attribute sets expanding on click; `Classic` class branching out additional sets
- **Right panel:** a live "snapshot bar" showing the current value with the `Step` attribute toggling between a **staircase plot** (Step=1) and a **linear interpolation plot** (Step=0)
- **Bottom strip:** a digital state-set browser showing numbered states (0 = "Off", 1 = "On", etc.) that animate when `PointType` is switched to `Digital`
- Color-coded attribute groups: green = exception, blue = compression, orange = identity/security, gray = system-assigned

### Interactive Controls ("Play With It")

| Control | Mapped Attribute | Range | Effect |
|---------|-----------------|-------|--------|
| **PointType dropdown** | `PointType` | `Float32`, `Int16`, `Digital`, `String` | Switching to Digital shows DigitalSet browser; switching to String grays out all deviation fields |
| **Zero / Span sliders** | `Zero`, `Span` | -1000…1000 / 1…10000 | Adjusts the thermometer range; updates `TypicalValue` indicator and shows how `ExcDevPercent`/`CompDevPercent` recalculate in engineering units |
| **Step toggle** | `Step` | 0 / 1 | Flips the right-panel interpolation plot between staircase and linear; shows annotation "Compression uses exception-style deadband when Step=1" |
| **Point Class selector** | `PtClassName` | `Base` / `Classic` | Expands/collapses attribute sets in the left tree; Classic adds Location1–5, InstrumentTag, etc. |

### Step-by-Step Guided Walkthrough

**Step 1 — "What is a Tag?"**  
The tag card pulses; a callout explains: "A PI point (tag) stores time-series data for one measurement. It has a unique `Tag` name, a `PointID`, and a set of configuration attributes determined by its **point class**." The `PointType` dropdown highlights.

**Step 2 — "The Range: Zero & Span"**  
The thermometer gauge animates. `Zero` slides from 0→100, `Span` adjusts. Callout: "For Float16 tags, `Zero` and `Span` physically scale archived values. For Float32/Float64/Int types, they serve as metadata for client displays and `ExcDevPercent`/`CompDevPercent` calculations. For Digital tags, `Zero` is auto-set to the digital-set number."

**Step 3 — "Continuous vs. Discrete: The Step Flag"**  
The right panel animates both plot types simultaneously, then fades one based on the Step toggle. Callout: "Step=0 means 'this signal changes continuously' — PI interpolates linearly between events. Step=1 means 'value holds until next change' — PI uses staircase. Non-numeric types are **always Step=1**. Step=1 also changes compression: swinging-door is replaced by a simple deadband comparison against `CompDev`."

**Step 4 — "Digital Points & State Sets"**  
PointType dropdown switches to `Digital`. The gauge transforms into a state-indicator panel. The DigitalSet browser lights up. Callout: "Digital points use numbered states from a **Digital State Set** (e.g., 'system' has states like 'Shutdown', 'Bad Input'). The state set must exist before the point can be created. Exception and compression deviation attributes are zeroed and ignored."

### Real-World Engineering Gotcha

**"The Span Trap"** — When `ExcDevPercent` is set (e.g., 1%), the actual `ExcDev` in engineering units is computed as `Span × ExcDevPercent / 100`. If an administrator creates a pressure tag with `Span = 100` and `ExcDevPercent = 1%` → `ExcDev = 1.0 psi`. Later, the instrument range changes and someone updates `Span` to `10000` without reviewing exception settings → `ExcDev` recalculates to `100 psi`, making the tag effectively dead to small changes. The simulation lets you watch the exception deadband widen in real time as `Span` is adjusted.

> **Documented behavior:** "When you change CompDev or CompDevPercent, the other is automatically updated to be compatible. If you changed both at once, CompDevPercent overrides CompDev." Same for ExcDev/ExcDevPercent. (pi-server-s-da-admin/1022865 and /1021927)

---

## Module 2: End-to-End Data Pipeline

### Core Concept
Data flows through a chain of subsystems — from a physical sensor through a **PI Interface/Connector** (with optional **exception reporting**), through the **PI Buffer Subsystem** (`pibufss`) for store-and-forward, into the **PI Snapshot Subsystem** (`pisnapss`) for **compression testing**, through the **Event Queue** (`pimapevq.dat`), and finally into the **PI Archive Subsystem** (`piarchss`) for persistent storage.

### Verified PI Technical Facts (from MCP)

**Core Subsystems and Executables:**

| Subsystem | Executable | Purpose | Dependencies |
|-----------|-----------|---------|--------------|
| Base | `pibasess.exe` | Maintains Point Database, Digital State Table, config databases; validates user logins | Update Manager, License Manager |
| Snapshot | `pisnapss.exe` | Stores most recent event per point, applies compression, sends data to event queue, serves snapshot events | Update Manager, License Manager |
| Archive | `piarchss.exe` | Stores and serves data from archive files | Snapshot, Update Manager, License Manager |
| Network Manager | `pinetmgr.exe` | Manages communication between subsystems, interfaces, and clients; validates clients at connection time | (none listed) |
| Update Manager | `piupdmgr.exe` | Queues notifications of changes to data values, point attributes, modules | Required by most subsystems |
| License Manager | `pilicmgr.exe` | Maintains license info for Data Archive and connected apps | (none) |
| Message | `pimsgss.exe` | Records status/error messages in log files | Falls back to Windows Event Log |
| AF Link | `piaflink.exe` | Synchronizes PI MDB and PI AF | Network Manager |

**Non-core subsystems:** Alarm (`pialarm.exe`), Backup (`pibackup.exe`), Batch (`pibatch.exe`), Performance Equations (`pipeschd.exe`), Recalculator (`pirecalc.exe`), Shutdown (`pishutev.exe`), SQL (`pisqlss.exe`), Totalizer (`pitotal.exe`)

**Data Flow Steps (official):**
1. **Interface sends data** — PI interfaces collect data from sources as **events** (timestamp + value + status). Exception reporting filters insignificant events before sending.
2. **Buffering (optional)** — If PI Buffer Subsystem is configured, events are saved on disk in case Data Archive is unavailable. The buffering service may also perform compression testing and fan data to all collective members (**n-way buffering**).
3. **PI Snapshot Subsystem receives all data** — Holds a single value per PI point (the **snapshot**). When a new value arrives: if in time-order, it becomes the new snapshot and the old snapshot is evaluated by **compression testing**. If **out-of-order** (timestamp older than current snapshot), it is sent **directly to the event queue without compression testing**.
4. **Event Queue** — Memory and disk buffer (`pimapevq.dat`) between snapshot and archive. PI Snapshot Subsystem adds data; PI Archive Subsystem removes data. Circular buffer of pages; overflow queues created when full.
5. **PI Archive Subsystem** — Continuously reads from event queue → stores in **write cache** → periodically moves to **archive files**.

> **Source:** "Understand Data Archive subsystems and dependencies" (pi-server-s-da-admin/1020186), "Understand how data flows in Data Archive" (pi-server-s-da-admin/1020286), "Snapshot" (pi-server-s-da-admin/1021213), "Event queue" (pi-server-s-da-admin/1018858)

### Interactive Visual Scene
A full-width animated SVG pipeline flowing left-to-right:
- **Left edge:** a sensor icon pulsing with raw analog values (sine wave + noise)
- **Stage 1 — Interface node:** a box labeled "PI Interface / Connector" with a small exception-filter graphic (deadband lines); filtered events emerge as colored dots
- **Stage 2 — Buffer:** a disk icon labeled "`pibufss`" with a queue-depth meter; dots enter and either pass through (green path) or queue to disk (orange path, shown when network-drop toggle is active)
- **Stage 3 — Snapshot:** a box labeled "`pisnapss`" showing the current snapshot value; incoming dots either replace the snapshot (normal path) or get shunted directly to the event queue (red "OOO" path)
- **Stage 4 — Event Queue:** an animated circular buffer diagram (`pimapevq.dat`) with read/write page indicators
- **Stage 5 — Archive:** a filing cabinet icon labeled "`piarchss`" with archive file slots filling over time
- **Top status bar:** real-time counters for "Events Received", "Events Compressed Out", "Events Archived"

### Interactive Controls ("Play With It")

| Control | What It Does | Visual Effect |
|---------|-------------|---------------|
| **Data rate slider** | Adjusts events/second from source | Dots flow faster/slower through the pipeline |
| **Network drop toggle** | Simulates connection loss between buffer and snapshot | Dots accumulate in the `pibufss` disk queue; counter shows "Queued Events" rising; reconnection triggers a burst |
| **Compression ON/OFF toggle** | Sets `Compressing = 0` or `1` | With OFF, every dot passes straight from snapshot to event queue (no filtering at Stage 3) |
| **"Send OOO event" button** | Injects an event with an old timestamp | The dot is colored red and routes directly from snapshot to event queue, bypassing the compression gate |

### Step-by-Step Guided Walkthrough

**Step 1 — "Data is Born"**  
The sensor pulses. Callout: "A physical instrument (thermocouple, flow meter, PLC) produces raw measurements. A PI Interface or PI Connector collects these values as events: each event = timestamp + value + quality status."

**Step 2 — "Exception Reporting: First Filter"**  
The interface box highlights; the deadband graphic animates. Some dots are discarded (faded out). Callout: "The interface applies exception reporting using `ExcDev`, `ExcMin`, `ExcMax`. Only significant changes pass through. This happens on the **interface node**, not the server."

**Step 3 — "Snapshot & Compression: Second Filter"**  
The snapshot box highlights; swinging-door angle lines appear. Callout: "PI Snapshot Subsystem holds one value per point. Each new event triggers compression testing on the previous snapshot. The swinging-door algorithm decides: archive the old snapshot, or discard it? Only significant events enter the event queue."

**Step 4 — "Archive: Permanent Storage"**  
The event queue drains into archive files. Callout: "Events move from the event queue into the write cache, then into archive files on disk. The event queue is a safety buffer — if the archive subsystem is busy or unavailable, data accumulates here. Place the event queue on a **different physical disk** from the archive files."

### Real-World Engineering Gotcha

**"The Compression-at-Buffer Surprise"** — When n-way buffering is enabled, `pibufss` can perform compression testing **before** data reaches `pisnapss`. This means different collective members may store **different events** for the same tag if they use different compression settings or if the buffered compression differs from server-side compression. The simulation shows identical raw data reaching two collective members with subtly different archived values, illustrating why archive comparisons between collective members can show discrepancies.

> **Documented:** "The buffering service may also perform compression testing and fans data to all members of a PI collective. This is called n-way buffering." API Buffer Server (bufserv) in particular "compressed at PI Data Archive, so archives at different collective members could contain different records." (pi-server-s-da-admin/1020286, pi-interface-for-universal-file-and-stream-loading-ufl/1009334)

---

## Module 3: Exception Reporting

### Core Concept
Exception reporting is the **first-stage filter** running on the **interface node** that uses a simple **deadband** algorithm to determine whether a new value is significant enough to send to Data Archive, reducing unnecessary data transmission.

### Verified PI Technical Facts (from MCP)

**Algorithm:**
1. Interface maintains the **last reported value** (most recently sent to Data Archive)
2. For each new scan value, the interface checks:
   - **Deadband test:** `|new_value - last_reported_value| > ExcDev` ?
   - **Minimum time test:** Has at least `ExcMin` seconds elapsed since the last reported event?
   - **Maximum time test:** Has `ExcMax` seconds elapsed since the last reported event?
3. If the value **exceeds the deadband AND** at least `ExcMin` has elapsed → **report the new value AND the previous value** (the value just before the trigger)
4. If `ExcMax` time has elapsed → report regardless of deadband
5. If `ExcMin` has not elapsed → discard (even if deadband is exceeded)

**Critical detail — the "previous value" forwarding:**
> "The interface reports value D [the triggering value] along with the previous value: in this case, value C. Compression testing will determine if C needs to be preserved, or if A and D are sufficient to recreate the original signal with the required fidelity."

This means exception reporting sends **two events** when a deadband exceedance triggers: the previous (within-band) value and the new (exceedance) value.

**Attribute Details:**

| Attribute | Description | Default | Notes |
|-----------|-------------|---------|-------|
| `ExcDev` | Deviation in engineering units | 0.1 | Set slightly smaller than instrument precision |
| `ExcDevPercent` | Deviation as % of Span | (computed) | Changing one auto-updates the other; if both changed simultaneously, `ExcDevPercent` overrides `ExcDev` |
| `ExcMax` | Max seconds between reports | 600 (10 min) | Setting to 0 disables the maximum timer |
| `ExcMin` | Min seconds between reports | 0 | Typically 0; prevents flooding from noisy signals |

**Non-numeric types:** For Digital, String, and Blob tags, `ExcDev` and `ExcDevPercent` are set to zero and ignored (every change of state is a significant event).

**Important:** Exception reporting parameters are used by **interfaces only**; they are not used by PI Server subsystems. Some interfaces do not support exception reporting — check interface documentation.

> **Source:** "Exception reporting" (pi-server-s-da-admin/1021932), "ExcDev, ExcDevPercent, ExcMax, and ExcMin" (pi-server-s-da-admin/1021927), "Attributes that depend on point type" (pi-server-s-da-admin/1019291)

### Interactive Visual Scene
An animated SVG signal-and-deadband diagram:
- **Main canvas:** a time-series chart drawing left-to-right with a moving pen. The Y-axis shows engineering units; the X-axis is time
- **Deadband corridor:** a shaded horizontal band centered on the last reported value, width = 2 × `ExcDev`
- **Value dots:** each scanned value appears as a dot — gray if within the deadband (discarded), green if it exceeds (reported)
- **"Previous value" mechanism:** when a green dot triggers reporting, the immediately prior gray dot turns **yellow** and an arrow shows it also being forwarded to Data Archive
- **Timer indicators:** two countdown rings — `ExcMin` (red, counts up from 0) and `ExcMax` (blue, counts down to 0). When ExcMax hits 0, the current value is force-reported regardless of deadband
- **Network pipe at bottom:** shows events flowing out of the interface toward the Data Archive server, with a counter "Events Sent"

### Interactive Controls ("Play With It")

| Control | Mapped Attribute | Range | Effect |
|---------|-----------------|-------|--------|
| **ExcDev slider** | `ExcDev` | 0.0 – 5.0 EU | Widens/narrows the deadband corridor; more values pass or get filtered |
| **ExcMax slider** | `ExcMax` | 0 – 1800 sec | Adjusts the blue countdown timer; at 0, timer is disabled |
| **ExcMin slider** | `ExcMin` | 0 – 60 sec | Shows how minimum-time gating blocks rapid-fire events even when they exceed deadband |
| **Signal noise slider** | (simulation) | Low / Medium / High | Adds random noise to the sine wave; demonstrates how exception reporting handles noisy signals |

### Step-by-Step Guided Walkthrough

**Step 1 — "The Deadband"**  
The deadband corridor highlights. Values arrive inside the band and fade out. Callout: "Every time the interface scans, it compares the new value to the **last reported** value. If the difference is within `ExcDev`, the value is discarded. The band moves only when a new value is reported."

**Step 2 — "Exceedance: Two Events, Not One"**  
A value exceeds the deadband (green dot). The immediately previous value turns yellow. Both are shown flowing to Data Archive. Callout: "When the deadband is exceeded, the interface sends **both** the new value AND the previous snapshot value (the last value before the exceedance). This gives compression testing the data it needs to decide if intermediate values mattered."

**Step 3 — "ExcMax: The Heartbeat"**  
The ExcMax timer counts down to zero while values remain flat (all within deadband). When it hits 0, the current value is force-reported. The deadband recenters. Callout: "Even if a value never changes, `ExcMax` ensures at least one event every N seconds. This confirms the instrument is alive. Default is 600s (10 minutes). Setting ExcMax to 0 **disables** this heartbeat."

**Step 4 — "ExcMin: The Flood Gate"**  
ExcMin is set to 5 seconds. Several rapid exceedances arrive within 5 seconds. Only the first passes; the rest are blocked. Callout: "`ExcMin` prevents a rapidly oscillating signal from flooding Data Archive. Events within `ExcMin` seconds of the last report are always discarded, even if they exceed the deadband."

### Real-World Engineering Gotcha

**"The Dead Instrument Illusion"** — If `ExcMax` is set to 0 (disabled) and the signal is flat (constant value within deadband), **no events are ever sent to Data Archive**. The tag's snapshot becomes stale indefinitely. Users see the last-known value and may assume the instrument is live when it has actually failed. The simulation shows a signal flatline with `ExcMax=0`: the "Events Sent" counter stays at 0 for hours while the instrument reads a constant value, indistinguishable from a disconnected sensor.

---

## Module 4: Swinging-Door Compression

### Core Concept
Compression testing (the **swinging-door algorithm**) is the **second-stage filter** running on the **PI Data Archive server** (in `pisnapss`) that determines which snapshot values are significant enough to archive, by maintaining a narrowing **slope corridor** between the last archived value and incoming events.

### Verified PI Technical Facts (from MCP)

**Algorithm — three values involved:**
1. **Last archive value (A):** the most recently stored event in the archive
2. **Current snapshot value (S):** the most up-to-date value held by pisnapss
3. **New value (N):** the value that just arrived and triggered compression testing

**Slope corridor logic:**
1. Calculate **maximum slope** and **minimum slope** using the last archived value (A), the current snapshot (S), and `CompDev`:
   - `Slope_max = (S_value + CompDev - A_value) / (S_time - A_time)`
   - `Slope_min = (S_value - CompDev - A_value) / (S_time - A_time)`
2. Calculate **reference slope** using last archived value (A) and new event (N):
   - `Slope_ref = (N_value - A_value) / (N_time - A_time)`
3. **If** `Slope_min ≤ Slope_ref ≤ Slope_max`: snapshot S is **not needed** → discard S, N becomes the new snapshot. Recalculate min/max slopes.
4. **If** `Slope_ref` is **outside** min/max slopes: snapshot S **is significant** → archive S, recalculate slopes with S as new archive value and N as new snapshot.

**Narrowing angle rule:** When slopes are recalculated after a non-archived snapshot is replaced, the new min and max slopes must always be **between** the old slopes (the angle narrows). If the newly calculated slope exceeds the old boundary, the old boundary is kept.

**Compression Attributes:**

| Attribute | Default | Description |
|-----------|---------|-------------|
| `CompDev` | 0.2 EU | Compression deviation in engineering units. Typically set to instrument precision |
| `CompDevPercent` | (computed) | As % of Span. 1–2% for transmitters, 0.5–1.0° for thermocouples. If both changed, `CompDevPercent` overrides |
| `CompMax` | 28800 sec (8 hrs) | Max seconds between archive events. Duplicate values archived when exceeded. **Does NOT create new values** — it waits for the next event |
| `CompMin` | 0 sec | Min seconds between archive events. Set to 0 when interfaces do exception reporting. Used to throttle extremely noisy points |

**Step attribute special behavior (Step=1):**
> "Swinging-door compression is not used when the Step attribute is set to On. Instead, an exception calculation is applied using the CompDev value. If the absolute difference between the current snapshot and the last archive value is greater than CompDev, then the snapshot is sent to the archive."

**Compression bypass conditions (events go directly to event queue):**
1. `Compressing` attribute is OFF (0)
2. Event timestamp is **older** than current snapshot (out-of-order event)
3. Event is **annotated**

> **Source:** "Compression testing" (pi-server-s-da-admin/1021696), "CompDev, CompDevPercent, CompMax, and CompMin" (pi-server-s-da-admin/1022865), "Step attribute in PI points" (pi-server-s-da-admin/1020817), "Compression guidelines" (pi-server-s-da-admin/1019236)

### Interactive Visual Scene
An animated SVG geometry diagram:
- **Main canvas:** a time-value chart showing archived values (solid blue dots), the current snapshot (hollow orange dot), and the incoming new event (pulsing green dot)
- **Slope corridor:** two dashed lines extending from the last archived value (A) through the ±CompDev bands around the snapshot. These form a "V" or "door" shape that narrows over time
- **Decision zone:** the area between the two slope lines is shaded green (safe = snapshot can be discarded). Outside is shaded red (significant = snapshot must be archived)
- **Step mode overlay:** when Step=1 is toggled on, the slope lines disappear and are replaced by a simple horizontal deadband bar centered on the last archived value, width = 2×CompDev
- **Archive counter:** running tally of "Events Archived" vs "Events Received" (compression ratio)

### Interactive Controls ("Play With It")

| Control | Mapped Attribute | Range | Effect |
|---------|-----------------|-------|--------|
| **CompDev slider** | `CompDev` | 0.0 – 10.0 EU | Widens/narrows the initial slope corridor; wider = more aggressive compression |
| **CompMax slider** | `CompMax` | 0 – 86400 sec | Shows how the max timer forces an archive event even on a flat signal |
| **Step toggle** | `Step` | 0 / 1 | Switches between swinging-door geometry (Step=0) and simple deadband (Step=1) |
| **Signal type selector** | (simulation) | Ramp / Sine / Step-change / Noisy | Different signal shapes to observe how compression behaves |

### Step-by-Step Guided Walkthrough

**Step 1 — "The Corridor Opens"**  
Value A is archived. Value S arrives. The slope corridor is calculated. Callout: "The 'door' opens from the last archived value. Its width is determined by `CompDev`. The two slopes define a corridor of acceptable values — if the next event falls inside this corridor, the snapshot is not needed."

**Step 2 — "The Door Narrows"**  
Several events arrive inside the corridor. Each time, the snapshot is replaced and slopes are recalculated. The corridor visibly narrows. Callout: "With each new event that falls inside the corridor, the angle tightens. The rule: **slopes must always narrow, never widen**. This progressive narrowing ensures that the compression deviation tolerance is maintained over long stretches."

**Step 3 — "The Door Swings: Archive!"**  
A new event falls outside the corridor. The old snapshot is archived (turns solid blue). New slopes are calculated from the newly archived value. Callout: "When the reference slope from A to N falls outside the min/max corridor, the old snapshot IS significant. It is sent to the event queue for archiving. The 'door' resets from the new archive value."

**Step 4 — "Step=1: No Swinging Door"**  
Toggle Step to 1. The corridor geometry disappears. A horizontal deadband replaces it. Callout: "For discrete/step data, swinging-door makes no sense — there's no interpolation between events. Instead, compression simply checks: `|snapshot - last_archive| > CompDev?` If yes, archive. `CompMax` and `CompMin` still apply."

### Real-World Engineering Gotcha

**"CompMax Does NOT Create Values"** — A common misconception is that `CompMax = 28800` (8 hours) guarantees a value every 8 hours. It does **not**. CompMax only checks the elapsed time **when a new snapshot event arrives**. If no new data is coming in (interface is down, ExcMax is disabled), no compression test runs and no archive event is created. The simulation demonstrates a scenario: set `ExcMax=0` on the interface and have a flat signal → the snapshot never updates → `CompMax` never triggers → the archive has a gap. The counter shows "Hours Since Last Archive Event" climbing past 8 hours.

> **Documented:** "The CompMax specification does not guarantee that a value will be written to the archive within a certain time. The archive waits for events to be sent to it. It does not check to see if a point has timed out. It does not create new values." (pi-server-s-da-admin/1022865)

---

## Module 5: Snapshot, Event Queue & Out-of-Order Events

### Core Concept
The **Snapshot Table** holds one current value per point; the **Event Queue** (`pimapevq.dat`) is a circular disk buffer between snapshot and archive; and **out-of-order (OOO) events** — events whose timestamp is older than the current snapshot — bypass compression entirely and write straight to the archive.

### Verified PI Technical Facts (from MCP)

**Snapshot Subsystem:**
- Executable: `pisnapss.exe`
- Holds the **most recent value** for each point → the **snapshot**
- Collection of all snapshot values = the **Snapshot Table**
- When a new event arrives:
  - If timestamp ≥ current snapshot timestamp → becomes the new snapshot; old snapshot undergoes compression testing
  - If timestamp < current snapshot timestamp → **out-of-order event** → sent directly to event queue **without compression testing**

**Out-of-Order Events — critical behavior:**
> "Sometimes an event enters PI Snapshot Subsystem with a time stamp that is older than the current snapshot value. This is called an out-of-order event. Data Archive sends out-of-order events directly to the event queue for archiving, without compression testing."

> "The out-of-order event is the incoming event with the older timestamp of the last event in the system."

**OOO consequences:**
- Bypasses compression → **all OOO events are archived**, regardless of `CompDev`/`CompMin`/`CompMax`
- Heavy OOO traffic can put a large load on Data Archive
- Common causes: backfill operations, interface recovery after outage, multiple interfaces writing to the same tag, manual data corrections

**Snapshot Recovery — future timestamps:**
- If system time is accidentally set forward, snapshot times can be in the future
- All subsequent (correct-time) events are treated as OOO (older than snapshot) → all bypass compression → massive archive load
- Recovery: `pisnapss -f` (interactive mode) → overwrites snapshots >20 minutes in the future with NULL; NULL is replaced by any new event, even OOO

**Event Queue:**
- File: `pimapevq.dat`
- Structure: circular buffer of **pages**, each page is a circular buffer of **events**
- PI Snapshot Subsystem writes → PI Archive Subsystem reads
- Under normal conditions, write page index = read page index
- When archive subsystem is busy/unavailable: **archive queuing** occurs
  - Queue fills; if full, **overflow queues** (additional files of same size) are created
- **Best practice:** place event queue on a **different physical disk** from archive files
- **Rule of thumb:** set event queue size to half of archive size
- Tuning parameter: `Snapshot_EventQueuePath`

**Archive queuing triggers:**
1. Interface nodes produce a burst of events (e.g., recovery after network outage)
2. PI Archive Subsystem busy storing OOO events or processing expensive queries
3. OS or hardware has reduced I/O or CPU capacity

> **Source:** "Snapshot" (pi-server-s-da-admin/1021213), "Event queue" (pi-server-s-da-admin/1018858), "Snapshot recovery" (pi-server-s-da-admin/1021363), "Recover from future times in the snapshot" (pi-server-s-da-admin/1020605), "Prevent archive data loss" (pi-server-s-da-admin/1021011), "Output from piartool -qs" (pi-server-s-da-reference/1020485)

### Interactive Visual Scene
A split-panel animated SVG:
- **Top half — Snapshot Table:** a row of tag slots, each showing `Tag Name | Current Value | Timestamp`. One slot is highlighted as the "active" tag. Incoming events appear from the left and either replace the snapshot (green flash) or get shunted downward (red flash = OOO)
- **Bottom half — Event Queue:** a circular buffer visualization (ring of segments). A write cursor (blue) advances clockwise as pisnapss adds events. A read cursor (green) follows as piarchss reads events. The gap between cursors = pending events. When gap = full ring → an overflow queue spawns as a second ring
- **OOO path:** a prominent red bypass arrow connecting directly from the incoming event to the event queue, skipping the snapshot/compression box
- **Diagnostic panel:** shows `piartool -qs` output in real time: Physical File Size, Write Page Index, Read Page Index, Current Queue Events, Overflow Queues

### Interactive Controls ("Play With It")

| Control | What It Does | Effect |
|---------|-------------|--------|
| **"Send OOO Event" button** | Injects event with timestamp older than current snapshot | Red dot bypasses compression, goes straight to event queue; "OOO Events" counter increments |
| **"Backfill Burst" button** | Sends 100 OOO events rapidly | Shows massive burst flowing into event queue; archive reader falls behind; overflow queue appears |
| **"Future Snapshot" toggle** | Sets snapshot timestamp to 1 hour in the future | All subsequent normal events become OOO; compression ratio drops to 0%; archive load spikes |
| **Archive speed slider** | Simulates piarchss read speed | Slow = queue fills up; fast = queue stays drained |

### Step-by-Step Guided Walkthrough

**Step 1 — "The Snapshot"**  
A new event arrives for tag FT-101. It has a timestamp newer than the current snapshot. The snapshot slot flashes green: old snapshot goes to compression testing, new event takes its place. Callout: "The snapshot is the most recent event for each point. It's not in the archive yet — it's being held for compression evaluation."

**Step 2 — "An Out-of-Order Event"**  
An event arrives with a timestamp 5 minutes in the past. It's highlighted red. It bypasses the compression box and goes straight to the event queue. Callout: "If an event's timestamp is older than the current snapshot, it's out-of-order. OOO events bypass compression entirely and are sent straight to the event queue for archiving. **Every single OOO event is archived.**"

**Step 3 — "The Event Queue Under Load"**  
The "Backfill Burst" button is pressed. 100 OOO events flood in. The event queue write cursor races ahead of the read cursor. The gap grows. An overflow queue appears. Callout: "The event queue is a circular buffer. When piarchss can't keep up — due to OOO bursts, expensive queries, or I/O contention — the queue fills. When it overflows, new queue files are created. Place the event queue on a different disk from the archives."

**Step 4 — "The Future-Timestamp Disaster"**  
The "Future Snapshot" toggle is engaged. All new events are now OOO. The compression ratio drops to 0%. The archive load counter spikes. Callout: "If system time was accidentally set forward, all snapshots have future timestamps. Every new event is 'older' than the snapshot → all bypass compression → massive unfiltered archive writes. Recovery: run `pisnapss -f` to null future snapshots."

### Real-World Engineering Gotcha

**"The Backfill Archive Bomb"** — When an interface recovers after a long outage and sends hours of buffered historical data, **every event is out-of-order** relative to the current snapshot (which has been updated by ExcMax heartbeats or other interfaces). All backfilled events bypass compression and are written raw to the archive. For a 10,000-point system recovering 24 hours of 1-second data, that's 864 million uncompressed events hitting the archive. The simulation shows the event queue filling to capacity, overflow queues spawning, and the archive subsystem becoming unresponsive to user queries during the burst.

---

## Module 6: PI Buffer Subsystem (`pibufss`) & N-Way Buffering

### Core Concept
The **PI Buffer Subsystem** (`pibufss`) runs on the interface node and provides **store-and-forward buffering** — when the connection to Data Archive is lost, events are queued to disk and forwarded when the connection is restored. In a **PI Collective** (HA configuration), pibufss performs **n-way buffering**: fanning out the same data to every collective member.

### Verified PI Technical Facts (from MCP)

**Service Details:**
- Executable: `pibufss` (PI Buffer Subsystem)
- Runs on the **interface node**, not the Data Archive server
- Recommended over the older API Buffer Server (`bufserv`) for all buffering scenarios including n-way buffering
- `pibufss` **automatically handles n-way buffering** — no manual configuration when collective membership changes
- `bufserv` (legacy) requires manual reconfiguration when a collective changes, and compressed data at PI Data Archive means "archives at different collective members could contain different records"

**Buffering Behavior:**
- Events from PI interfaces are written to on-disk **queue files**
- During normal operation: events pass through the buffer and are sent immediately
- During network outage: events accumulate in disk queue files
- On reconnection: queued events are forwarded (these may arrive as OOO events at the server)
- The buffering service **may also perform compression testing** before forwarding

**Key Statistics (from PI Buffer Subsystem performance counters):**

| Counter | Description |
|---------|-------------|
| `Buffer Sessions Active` | Number of active buffer sessions to physical servers |
| `Buffer Sessions Offline` | Number of inactive sessions (unable to queue/send data) |
| `Events Received/sec` | Rate of events received from interfaces |
| `Total Events Sent/sec` | Rate of events sent to all servers |
| `Total Queued Events` | Total buffered events across all queues |
| `Queue > Capacity` | Estimated seconds of buffering remaining if all connections lost |
| `Queue > File Count` | Total number of queue files for all servers |
| `Queue > Reset Folder Count` | Number of corrupted-queue reset folders |
| `Queue > Write Errors` | Events that failed to be written to queue |
| `Compressed Events/sec` | Rate of events marked for archiving (excludes OOO) |
| `Out-Of-Order Events/sec` | Rate of OOO events received |
| `Health` | 0=OK, 1=Warning, 2=Error, 3=Critical |
| `Events In Error` | Events not processed locally (invalid mode, type, value, digital set mismatch) — still sent to server |
| `Events Rejected` | Events not sent to server (unsupported source type, no write access on v3.4.375) |

**Queue corruption handling:** If PI Buffer Subsystem detects the queue is corrupted and cannot recover it, a new queue is created so data can flow. The old corrupted queue files are saved in a separate folder under the configured queue path.

**Configuration tool:** Buffering Manager (graphical UI in PI SMT) — set up buffering, add servers/collectives, view status, estimated capacity, events sent/queued, point errors.

> **Source:** "PI Buffer Subsystem statistics" (pi-server-s-da-reference/1020068), "Understand how data flows in Data Archive" (pi-server-s-da-admin/1020286), "n-way buffering" (pi-interface-for-universal-file-and-stream-loading-ufl/1009334), "Manage Data Archive with administration tools — Buffering Manager" (pi-server-s-da-admin/1022851), "PI Buffer Subsystem health alerts" (pi-server-s-buf-ha/1022106)

### Interactive Visual Scene
An animated SVG network diagram:
- **Left:** an interface node box with pibufss disk-queue visualization (stack of file icons with event counts)
- **Center:** a network cloud with an animated connection line to each server
- **Right:** two or three Data Archive server boxes (PI Collective members), each with their own snapshot/archive pipeline mini-diagram
- **Connection lines:** green when active (events flowing as animated dots), red with "X" when disconnected
- **Disk queue:** visualized as a growing/shrinking stack of files; file count number displayed
- **Health indicator:** traffic light (green/yellow/red) mapping to Health counter (0/1/2–3)
- **Capacity meter:** a gauge showing "Estimated Buffer Capacity" in hours/minutes

### Interactive Controls ("Play With It")

| Control | What It Does | Effect |
|---------|-------------|--------|
| **"Drop Connection" toggles** (per server) | Simulates network loss to individual collective members | Connection line turns red; events queue to disk for that server; other servers still receive data |
| **"Drop ALL Connections" button** | Simulates total network outage | All lines go red; disk queue grows; capacity meter counts down |
| **"Restore Connection" button** | Re-establishes connection | Queued events burst forward; receiving server shows OOO event processing |
| **Data rate slider** | Events/second from interface | Affects how fast the queue fills during outage and how long capacity lasts |

### Step-by-Step Guided Walkthrough

**Step 1 — "Normal Flow"**  
Events flow from interface → pibufss → all collective members. Disk queue is near-empty. Callout: "In normal operation, pibufss receives events from the interface and immediately forwards them to all configured Data Archive servers. The disk queue is nearly empty — events pass through."

**Step 2 — "Network Drop"**  
One server connection is dropped. Events continue to other servers but queue for the disconnected one. Callout: "When connection to a server is lost, pibufss writes events to its on-disk queue for that server. Other servers continue receiving data normally. The queue file count and total queued events grow."

**Step 3 — "N-Way Fan-Out"**  
All connections are restored. The same data fans out to all three servers. Callout: "With n-way buffering, pibufss sends the **same events** to every collective member. Unlike the legacy bufserv, pibufss automatically handles membership changes — no manual reconfiguration needed."

**Step 4 — "Recovery Burst"**  
A long-disconnected server reconnects. Queued events flood to it. That server shows OOO processing. Callout: "When a server reconnects, all queued events are forwarded. These events may arrive with timestamps older than that server's current snapshots, causing **out-of-order** processing — no compression, straight to archive. Watch for archive queuing on the recovering server."

### Real-World Engineering Gotcha

**"The Disk-Full Silent Failure"** — If the disk hosting the pibufss queue files runs out of space, pibufss cannot create new queue files. The `Queue > Write Errors` counter increments, but events are **silently dropped** — they are not sent to any server. The Health counter goes to 2 (Error) or 3 (Critical), but if no one is monitoring the pibufss performance counters, data loss goes unnoticed until someone queries the archive and finds gaps. The simulation fills the disk capacity meter to 100%, shows Write Errors spiking, and demonstrates the gap in the archive when the connection is later restored.

> **Documented:** "There is not enough disk space in the configured buffer location for PI Buffer Subsystem to create buffer queues." (pi-server-s-buf-ha/1022106)

---

## Module 7: Archive File Lifecycle & Shifting

### Core Concept
PI Data Archive stores time-series data in **archive files** that are managed through a lifecycle of creation, filling, **shifting** (rotating the primary archive to make room for new data), and eventual backup. Archives can be **fixed-size** (pre-allocated, recommended) or **dynamic** (grow as data arrives).

### Verified PI Technical Facts (from MCP)

**Fixed vs. Dynamic Archives:**

| Property | Fixed (Type=0) | Dynamic (Type=1) |
|----------|----------------|-------------------|
| Disk allocation | Pre-allocated at creation; empty and full archives use same disk space | Grows as data arrives; up to specified max or 2TB |
| Default | **Yes** (PI archives are fixed by default) | No |
| Recommendation | Use for all normal operations | Avoid; can negatively affect performance |
| Shifting | Participates if enabled and has capacity | Covers a specific time range |
| Creation | `piartool -ac` | `piartool -acd` |

**Auto-dynamic conversion:** Fixed archives become dynamic if they are full **and** there is sufficient disk space. If a converted dynamic archive becomes primary again, it converts back to fixed size.

**Archive Structure (from `piartool -al` output):**

| Field | Description |
|-------|-------------|
| Used | % of archive records used (estimate, only counts empty records) |
| State | 4 = mounted and ready (all visible archives) |
| Type | 0 = Fixed, 1 = Dynamic |
| Write Flag | 1 = currently writable |
| Shift Flag | 1 = eligible for archive shift |
| Record Size | Always 1024 bytes |
| Count | Number of records in the archive file |
| Add Rate/Hour | Average overflow records added per hour |
| Offsets: Primary | Start/end record numbers; end = Count/2 (half for primary records) |
| Offsets: Overflow | Start/end record numbers for overflow records |
| Annotations | Used / max annotations; archive shifts when annotations are exhausted |
| Start Time / End Time | Time range covered; "Current Time" for unused archives |

**Archive Shifting:**
- When the primary archive fills, an **archive shift** occurs: a new primary archive is created, and the old one becomes read-only historical storage
- Shifting can be:
  - **Natural:** automatic when the primary archive is full
  - **Scheduled:** daily, weekly, or monthly at midnight (configurable)
  - **Forced:** `piartool -fs`
- **Scheduled shift sizing:** Tuning parameter `Archive_AutoArchiveFileSize` sets the new primary's size. If not set, PI Archive Subsystem calculates size from past data rate and shift duration.
- In PI Collectives: scheduled shifts are configured on the primary server and apply to all members. Secondary members shift based on the primary's time zone.

**Archive Management:**
- `piartool -al` — list registered archives (reverse chronological)
- `piartool -fs` — force archive shift
- `piartool -ac` — create fixed archive
- `piartool -acd` — create dynamic archive
- `piartool -ar path` — register archive
- `piartool -au path` — unregister archive
- `piartool -ads path` — disable shift for archive
- `piartool -aes path` — enable shift for archive
- `piartool -as` — archive statistics

**Sizing guidelines:**
- Min 2KB per point
- Max 2TB per archive file
- For >50,000 points: 4–8KB × total points (on 64-bit)
- Archives should fit in Windows File System Cache: `RAM ÷ 3` for 64-bit
- Event queue size: half of archive size

> **Source:** "Fixed and dynamic archives" (pi-server-s-da-admin/1018975), "Schedule archive shifts" (pi-server-s-da-admin/1021015), "Archive size" (pi-server-s-da-admin/1022255), "Output from the piartool -al command" (pi-server-s-da-reference/1019995), "piartool command-line options" (pi-server-s-da-reference/1022132)

### Interactive Visual Scene
An animated SVG archive-timeline visualization:
- **Main canvas:** a horizontal timeline with archive files represented as rectangular blocks, color-coded by status:
  - **Blue (primary):** currently receiving new data, write flag = 1
  - **Green (historical):** read-only, full, shift flag may be 0 or 1
  - **Gray (unused):** empty, start/end = "Current Time"
  - **Orange (dynamic):** growing size shown by block width expanding
- **Archive internals:** clicking any block shows a detail view: primary records (top half), overflow records (bottom half), Used%, annotation count
- **Shift animation:** when primary fills to ~95%, a "SHIFT" event triggers: new empty block appears on the right as the new primary; old primary transitions from blue to green
- **Sizing ruler:** shows disk usage per archive, with FSC (File System Cache) limit line
- **`piartool -al` terminal:** a mini terminal at the bottom showing the live piartool output

### Interactive Controls ("Play With It")

| Control | What It Does | Effect |
|---------|-------------|--------|
| **Data rate slider** | Events/second being archived | Faster = archives fill more quickly → more frequent shifts |
| **Archive type toggle** | Fixed vs. Dynamic for new archives | Fixed shows pre-allocated block; Dynamic shows block growing |
| **"Force Shift" button** | Triggers `piartool -fs` | Immediate shift: new primary created, old becomes historical |
| **Shift schedule selector** | Natural / Daily / Weekly / Monthly | Shows shift patterns over a simulated month of operation |

### Step-by-Step Guided Walkthrough

**Step 1 — "The Primary Archive"**  
The primary archive block pulses blue. Data flows in. The Used% indicator climbs. Callout: "The primary archive is the only writable archive. All new events from the event queue flow into it. It has two regions: primary records (one per point) and overflow records (additional events per point)."

**Step 2 — "The Shift"**  
Used% reaches 95%. A shift animation plays: new empty block appears to the right as the new primary. The old block transitions to green (historical). Callout: "When the primary archive fills, an archive shift occurs. A new primary is created. The old primary becomes read-only. Archives cannot have overlapping time ranges."

**Step 3 — "Fixed vs. Dynamic"**  
Toggle between fixed and dynamic. Fixed shows a solid block; dynamic shows a block that grows. Callout: "Fixed archives (default, recommended) pre-allocate disk space at creation. Dynamic archives grow on demand up to 2TB but can hurt performance. If a full fixed archive receives backfill data, it auto-converts to dynamic."

**Step 4 — "Scheduled Shifting"**  
Weekly schedule selected. The timeline shows shifts occurring every Sunday midnight. Archive sizes are auto-calculated. Callout: "Scheduled shifts create predictable, time-aligned archives. PI Archive Subsystem calculates the new primary size from past data rate and shift interval, unless `Archive_AutoArchiveFileSize` is set."

### Real-World Engineering Gotcha

**"The Point-Count Wall"** — The archive size limits the number of points. No more than **half** the archive records can be primary records (one per point). If you have 65,536 record slots → max 32,768 points. Attempting to create point 32,769 fails silently or with a confusing error. The simulation shows an archive filling its primary-record slots and refusing new points, with the solution: force a shift into a larger archive using `piartool -fs` after creating a larger archive with `piartool -ac`.

> **Documented:** "No more than half of the archive records of a fixed archive can be primary records. To resolve this, before creating additional points, force the archives to shift into a larger archive." (pi-server-s-da-admin/1022255)

---

## Module 8: Security & Connection Pipeline

### Core Concept
PI Data Archive authentication uses a layered model: **Windows Integrated Security** (Kerberos/AD) is the recommended method, with **PI Mappings** connecting Windows identities to **PI Identities** (which represent access levels). Legacy **PI Trusts** authenticate by IP/hostname/app name. Access control is enforced per-point via **PtSecurity** (point configuration) and **DataSecurity** (point data).

### Verified PI Technical Facts (from MCP)

**Authentication Methods (in order of recommendation):**

1. **Windows Integrated Security (recommended):** Uses Windows AD/Kerberos authentication. Extended to PI interfaces with PI API 2016 for Windows Integrated Security.
   > "If you choose to install PI API 2016 for Windows Integrated Security, you can use **only** Windows Integrated Security for authentication. Both trusts and explicit logins will fail."

2. **PI Mappings (recommended over trusts):** Maps a Windows AD principal (user, group, or SID) to a **PI Identity**. Created in PI SMT under `Security > Mappings & Trusts > Mappings` tab. When a Windows user authenticates via Kerberos, the mapping grants them the access permissions of the associated PI Identity.

3. **PI Trusts (legacy, not recommended):** Authenticate by matching connection credentials — application name, IP address/netmask, hostname (FQDN or short). Defined against a single PI Identity, PI group, or PI user. Must be updated when interface nodes change hostname or IP.
   > "We do not recommend using PI trusts or explicit logins for authentication. For a more secure environment, we recommend using Windows Integrated Security."

4. **Explicit logins (not recommended):** PI user accounts with passwords, managed directly on Data Archive. Not secure.
   > "PI user accounts are not secure. Whenever possible, use Windows authentication."

**PI Identities:**
- Each PI Identity represents a **level of access** to PI Server resources
- Example: one identity can create points; another can only read data
- When a mapping exists between a PI Identity and a Windows group, **all users in that group** are automatically authenticated and granted that identity's permissions
- Managed in PI SMT: `Security > Identities, Users, and Groups > Identities` tab
- Default identities: `piadmin` (full admin), `piadmins` (admin group), `PIWorld` (default read access)

**Access Control — Two Layers:**

| Layer | Attribute | Default | Controls |
|-------|-----------|---------|----------|
| **Point Security** | `PtSecurity` | `piadmin: A(r,w) \| piadmins: A(r) \| PIWorld: A(r)` | Who can read/write **point configuration** (attributes) |
| **Point Security** | `PtOwner` | `piadmin` | Owner of the point definition |
| **Point Security** | `PtGroup` | `piadmins` | Group for the point definition |
| **Point Security** | `PtAccess` | `o:rw g:r w:r` | Owner/group/world access to point definition |
| **Data Security** | `DataSecurity` | `piadmin: A(r,w) \| piadmins: A(r) \| PIWorld: A(r)` | Who can read/write **point data** (values) |
| **Data Security** | `DataOwner` | `piadmin` | Owner for data access |
| **Data Security** | `DataGroup` | `piadmins` | Group for data access |
| **Data Security** | `DataAccess` | `o:rw g:r w:r` | Owner/group/world access to data |

**Database Security Tables:**

| Table | Controls |
|-------|----------|
| PIARCADMIN | Archive administration (creation, registration, shifts, reprocessing) |
| PIARCDATA | Archive data (listing, troubleshooting) |
| PIBACKUP | Backup management |
| PIUSER | Identities, users, and groups management |
| PIMAPPING | Mapping management |
| PITRUST | Trust management |
| PIAUDIT | Auditing management |
| PIPOINT | Point creation/deletion |
| PIDBSEC | Database security table editing (only piadmin/piadmins can edit) |
| PITUNING | Firewall table, tuning parameters |
| PIMSGSS | Message log management |
| PIReplication | Collective management |

**PI Trust credentials may include:**
- Name of the connecting application
- IP address and netmask of the interface node
- Fully qualified hostname (e.g., `apollo.aveva.com`)
- Short hostname (e.g., `apollo`)

> **Source:** "Interface authentication management with PI trusts" (pi-server-s-da-admin/1022433), "Data Archive side of the mapping" (pi-server-s-da-admin/1020309), "Manage PI identities in SMT" (pi-server-s-da-admin/1019910), "Create a mapping in PI SMT" (pi-server-s-da-admin/1019247), "Access control for basic Data Archive admin tasks" (pi-server-s-da-admin/1022296), "Built-in attributes" (pi-server-s-da-admin/1019296), "Manage Data Archive user accounts and groups" (pi-server-s-da-admin/1019908)

### Interactive Visual Scene
An animated SVG connection-flow diagram:
- **Left side — Clients:** three connection sources: (1) a Windows user at a PI Vision client, (2) a PI Interface node, (3) a legacy application
- **Center — Authentication Gateway:** a large box labeled "PI Network Manager (`pinetmgr`)" with three authentication paths:
  - **Path 1 (green, recommended):** Windows user → Kerberos ticket → PI Mapping lookup → PI Identity → Access granted
  - **Path 2 (yellow, legacy):** Interface node → IP/hostname match → PI Trust lookup → PI Identity → Access granted
  - **Path 3 (red, deprecated):** Legacy app → PI User login → password check → Access granted
- **Right side — Access Control:** two lock icons per point:
  - **PtSecurity lock:** controls who can configure the point
  - **DataSecurity lock:** controls who can read/write the point's data
- **Bottom — Database Security:** a table showing PIPOINT, PIDBSEC, PITRUST, etc. with identity→permission entries
- Connecting lines animate to show the flow: client authenticates → gets PI Identity → identity checked against PtSecurity/DataSecurity → access granted/denied

### Interactive Controls ("Play With It")

| Control | What It Does | Effect |
|---------|-------------|--------|
| **Authentication method selector** | Kerberos / Trust / Explicit Login | Highlights the corresponding path; shows which credentials are checked |
| **"Connect as..." dropdown** | Select identity: piadmin / piadmins / PIWorld / custom | Shows different access levels: piadmin gets full access; PIWorld gets read-only; custom shows configurable |
| **PtSecurity editor** | Edit the ACL string for a sample point | Shows in real time who can/cannot configure the point |
| **DataSecurity editor** | Edit the ACL string for data access | Shows in real time who can/cannot read/write data values |

### Step-by-Step Guided Walkthrough

**Step 1 — "Windows Integrated Security"**  
A Windows user connects to PI Vision. The Kerberos ticket is presented. PI Network Manager looks up mappings. A matching mapping maps the user's AD group to the `PIOperators` identity. Callout: "The recommended method: Windows AD credentials are verified via Kerberos. A PI Mapping connects the Windows group to a PI Identity, which defines what the user can access."

**Step 2 — "PI Trusts (Legacy)"**  
A PI Interface connects. Its IP address and application name are matched against the trust database. Callout: "Trusts identify connections by IP, hostname, or app name — no password, no Kerberos. If the interface node's IP changes, the trust breaks. Trusts are legacy; use Windows Integrated Security for new deployments."

**Step 3 — "Point Security vs. Data Security"**  
A user tries to: (a) change a point's `Span` attribute, (b) read the point's archived data. The PtSecurity lock checks (a); the DataSecurity lock checks (b). Different identities get different results. Callout: "PI enforces two separate access checks per point: `PtSecurity` controls point configuration (attributes), `DataSecurity` controls point data (values). A user might be able to read data but not change how it's collected."

**Step 4 — "Database Security"**  
An administrator tries to create a new point. The PIPOINT table is checked. Only identities with write access to PIPOINT can create/delete points. Callout: "Beyond per-point security, **database security tables** control administrative operations: creating points (PIPOINT), managing archives (PIARCADMIN), managing trusts (PITRUST), etc. Only `piadmin` or `piadmins` can edit PIDBSEC itself."

### Real-World Engineering Gotcha

**"The Orphaned Trust After IP Change"** — An interface node is migrated to a new server with a different IP address. The PI Trust was configured by IP (`192.168.1.50`). After migration to `192.168.1.75`, the interface can no longer authenticate — it appears as an unknown connection. Data stops flowing, but the interface may show no errors (it retries silently). The simulation shows: trust configured by IP → server IP change → authentication failure → data gap in archive. The fix: either update the trust's IP or (better) migrate to Windows Integrated Security with PI Mappings, which follow the Windows identity regardless of IP.

> **Documented:** "Update PI trusts when the interface node changes host name or IP address." and "We recommend using PI mappings to configure authentication rather than using PI trusts." (pi-server-s-da-admin/1022433, pi-vision/1009088)

---

## Appendix: Documentation Bundle Reference

| Bundle ID | Full Name | Used For |
|-----------|-----------|----------|
| `pi-server-s-da-admin` | Data Archive Administration | Primary reference for all 8 modules |
| `pi-server-s-da-reference` | Data Archive Reference | piartool commands, performance counters, event queue internals |
| `pi-server-s-buf-ha` | PI Buffer Subsystem & High Availability | Buffer health alerts, buffering statistics |
| `pi-server-f-da-smt` | PI Server (Full) — Data Archive & SMT | SMT procedures, compression configuration |
| `pi-interface-for-universal-file-and-stream-loading-ufl` | PI UFL Interface | n-way buffering definition |
| `pi-interface-for-opc-da` | PI Interface for OPC DA | Trust creation procedures |
| `pi-universal-interface-uniint-framework` | UniInt Framework | Exception reporting attribute reference |
| `pi-vision` | PI Vision | Kerberos delegation, security recommendations |
| `af-sdk` | AF SDK | PICommonPointAttributes field reference |

---

*Curriculum designed for interactive web implementation using SVG/Canvas animations with real-time parameter binding. All technical facts sourced from docs.aveva.com PI System documentation, accessed November 2026.*
