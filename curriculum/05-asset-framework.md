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
