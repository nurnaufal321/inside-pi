# Chapter 05 — Asset Framework

Bundles: `pi-server-f-af-pse` (Asset Framework and PI System Explorer, PI Server 2024 R2).

---

## Module 5.1: Elements & Templates (`af-elements-templates`)

### Core Concept
In PI AF, an *element* represents a piece of equipment, and an *element template* is a model of an asset type. Attribute templates on the template become attributes on every element built from it. Substitution parameters let one template point each element at its own PI points.

### Verified PI Technical Facts (from MCP)
- An element template is a model of an asset type. Changes to a template propagate to every element derived from it. Deleting a template deletes notification and analysis templates that target it. If the template allows extensions, an element can have attributes and ports the template doesn't define. Templates can restrict parent and child reference types. An element can't be derived directly from a Base Template Only template. — [Element templates](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022495.html)
- When you create an element from a template, it gets one attribute per attribute template, inheriting all its properties. You still give each attribute a value. — [Learn about attribute templates](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022264.html)
- A base template passes its attributes, ports and analyses to derived templates. You override an inherited attribute by creating an attribute template with exactly the same name in the derived template, and hide one by setting that same-name attribute template to Excluded. BTO applies to element, model, transfer and event frame templates. — [Base and derived templates](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021662.html)
- New Element → choose a template → choose a reference type (default parent-child). Most General-tab fields are read-only, and you can't add attributes unless the template allows extensions. Check In saves. — [Create elements based on a template](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022497.html)
- Substitution parameters are variables in attribute templates for PI point, String Builder and URI Builder data references, resolved when PI AF creates the data reference. — [Substitution parameters in data references](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1020827.html)
- `%Element%` is the name of the element holding the attribute, `%..\Element%` is its parent, `%Attribute%` is the attribute's name, and `%Server%` is the default Data Archive. — [List of PI AF substitution parameters](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022031.html)
- PI AF does not create PI point data references automatically. *Create or Update Data Reference* replaces the substitution parameters and locks the reference in. After that, template changes no longer affect it (with exceptions for Relative Time and Tag Creation settings). *Reset to Template* undoes the lock-in. — [Attribute-value updates from PI point data references](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021652.html)
- Base elements on templates in almost every case. Start by modelling one asset type. Categories, analyses and notifications are unaffected by Allow Extensions. — [Adopt a template strategy](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022651.html)

### Interactive Visual Scene
- Three columns, left to right: **PI points** (purple cylinders: `P-101.Flow`…), **elements** (P-101, P-102, P-103, green blocks), and the **Library** (Pump template, blue; Rotating Equipment BTO base template behind it, grey).
- Arrows: base → Pump (derives); Pump → each element (creates); each element → its PI point (data reference). Value packets flow from the points into the elements once the references are locked in.

### Interactive Controls ("Play With It")
- **Tag pattern** (choice): `%Element%.%Attribute%` or `%..\Element%_%Element%.%Attribute%`.
- **Create or Update Data Reference** (action): resolves and locks in each element's reference.
- **Add attribute template "Vibration"** (toggle): propagates to every element.
- **Allow extensions** (toggle) + **Add "Seal Temp" to P-103** (action): blocked unless allowed.
- **Reset to Template** (action).
- Scenarios: Fresh template · Forgot Create/Update · Pattern changed after lock-in · Extension blocked.

### Step-by-Step Guided Walkthrough
1. Many pumps · problem: three pumps, nine attributes to keep consistent by hand.
2. Template · concept: the element template models an asset type.
3. Attribute templates · mechanism: one attribute per attribute template on every element.
4. Create · mechanism: New Element → template → parent-child; fields read-only.
5. Substitution · mechanism: `\\%Server%\%Element%.%Attribute%` resolves per element.
6. Lock-in · gotcha: Create or Update Data Reference is required, and it locks the reference in.
7. Propagate · mechanism: one template edit changes every element; deleting a template deletes the analysis and notification templates that target it.
8. Base & derived · concept: BTO base template, overriding by same name, Excluded.
9. Extensions · fix: Allow Extensions for one-off attributes.
10. Recap.

### Real-World Engineering Gotcha
Editing the tag pattern in a template does nothing to existing attributes whose data references are already locked in. They keep pointing at the old points until you run *Create or Update Data Reference* (or *Reset to Template*) again.

---

## Module 5.2: Attributes & Data References (`af-attributes`)

### Core Concept
An attribute holds one piece of data about an element. It can store a constant value itself, or a *data reference* can tell PI AF where to get the value when a client asks for it: a PI point, a formula over other attributes, a table, and more. How the reference retrieves the value, and in which unit of measure, is part of its configuration.

### Verified PI Technical Facts (from MCP)
- A data reference configures an attribute to obtain its value from a source. The types are PI point, PI point array, formula, string builder, table lookup and URI builder. — [Understand configuration of data references](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1018607.html)
- Configuration strings: formula `A=Attribute3;[A*3];UOM=cm`, PI point `\\MyPIDataArchiveServer\sinusoid` (optionally `;TimeMethod=TimeRange;RelativeTime=-1h;TimeRangeMethod=Total`), table lookup `SELECT Density FROM [Material Specifications] WHERE MaterialID = @Product`. — [Attribute configuration string syntax](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022656.html)
- A Configuration Item is an attribute representing an inherent property with a constant value. PI System Explorer checks it out when you change it, and you check it in to commit; PI point and formula references should not be configuration items. — [Use the Configuration Item attribute property](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1018605.html)
- PI point references can be direct (`\\server\tag`) or indirect (via another attribute). You can specify the point's source units. Read Only is checked by default, so PI AF does not write to the point. — [Configure direct or indirect PI point data references](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022657.html), [Attribute value updates](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1020113.html)
- Clients request a value at a time or over a time range. A reference can return the point value at a time, or a calculation over a range, such as the average over an hour. — [Configuration of retrieval methods](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021700.html), [List of range retrieval options](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1020585.html)
- Every UOM belongs to a class with a canonical unit. A user viewing an attribute in meters can choose feet, and PI AF converts automatically. — [Learn about units of measure in PI AF](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022669.html)
- A formula's parameters are variables A–Z mapped to attributes. Each parameter's UOM is the unit the formula *requires* from that input, not the attribute's own UOM. — [Define parameters for formula data references](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021886.html)
- A table lookup reads a column from a table, selecting rows with a WHERE clause on attributes or literals. — [Configure table lookup data references](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022662.html)
- Calculation-based references (Formula, Table Lookup, String Builder…) use the recorded values of their inputs to generate timestamps for their own values. — [Restrictions on viewing time series data](https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022188.html)

### Interactive Visual Scene
- Centre: element **T-101** on the PI AF Server floor, drawn as five attribute blocks in a column: Area (static, grey), Level (PI point, blue), Temperature (PI point, blue), Volume (formula, orange), Density (table lookup, yellow).
- Right: the sources, each flowing *into* its attribute (−x): `LT-101` and `TT-101` cylinders on a PI Data Archive floor; a Formula node `[A*B]` fed by Level and Area; a Material Specifications table block.
- Left: a client (PI Vision) that asks T-101 for values; the answers flow left to it.

### Interactive Controls ("Play With It")
- **Request**: current value or 1 h average (time vs time-range retrieval).
- **Temperature shown in**: °C or °F (UOM conversion).
- **Product**: Water, Diesel or Ethanol (the table lookup picks a different Density).
- **Formula input UOM for Level**: m or cm (the gotcha: Volume becomes 100× too big).
- **Read only** toggle plus a **Write 3.0 m to Level** action.
- **Edit Area**: the configuration item is checked out until you check it in.

### Step-by-Step Guided Walkthrough
1. One tank · problem: a tank's data lives in different places.
2. Static value · concept: Area is a constant configuration item (check out, check in).
3. Data references · concept: tell AF where to fetch the value; the six types.
4. PI point · mechanism: Level ← `\\server\LT-101`; Read Only by default.
5. Retrieval · mechanism: a value at a time, or a calculation (Average) over a range.
6. Units · mechanism: Temperature stored in °C, shown in °F, converted by AF.
7. Formula · mechanism: Volume = `A=Level;B=Area;[A*B]`, timestamped by its inputs.
8. Table lookup · mechanism: Density by `WHERE MaterialID = @Product`.
9. Parameter units · gotcha: a formula input's UOM is what the formula needs.
10. Recap.

### Real-World Engineering Gotcha
In a formula, the UOM chosen for each parameter is the unit the *equation* needs, and PI AF converts the input into it. Choose a different unit from the one the equation assumes (cm instead of m) and the result is off by the conversion factor.
