# Chapter 11 — Developer Access

Bundles: `pi-web-api`, `pi-web-api-reference`, `af-sdk`, `af-sdk-getting-started`, `pi-sql-client-oledb`, `pi-sql-client-odbc`, `pi-sql-data-access-server-rtqp-engine`, `pi-oledb-enterprise`, `pi-sql-commander-lite`.

## Module 11.1: PI Web API: WebIDs, Batch & Channels (`dv-web-api`)
- RESTful service giving programmatic access to the Data Archive and PI AF server; installs Core Services and optionally OMF Services. — [Install PI Web API](https://docs.aveva.com/bundle/pi-web-api/page/1023078.html)
- Resources are addressed by persistent, URL-safe WebIDs encoding GUIDs and/or paths; WebID 2.0 types Full (default), IDOnly, PathOnly, LocalIDOnly, DefaultIDOnly. — [WebID](https://docs.aveva.com/bundle/pi-web-api/page/1023105.html)
- Full survives move/rename/delete best; IDOnly follows the item when moved but breaks if deleted; PathOnly always refers to whatever sits at that path. — [WebID Type](https://docs.aveva.com/bundle/pi-web-api-reference/page/help/topics/webid-type.html)
- Batch: many requests in one POST; a dictionary of IDs → request objects; ParentIds make a request wait for others; Resource can be a JSONPath into a parent's response; RequestTemplate fans out per token. — [Batch support](https://docs.aveva.com/bundle/pi-web-api/page/1023110.html)
- Channels: WebSocket stream of value changes, no polling; server polls the update queue every ChannelPollingInterval (default 1000 ms); includeInitialValues; heartbeatRate sends empty messages; no chronological-order guarantee. — [Channels](https://docs.aveva.com/bundle/pi-web-api/page/1023111.html)
- Authentication: Kerberos (only default; needs AD delegation and SPNs), Basic, Bearer (needs AIM), Anonymous (served as the service account; use Read-only mode). — [Authentication methods](https://docs.aveva.com/bundle/pi-web-api/page/1023024.html)
- Gotcha: Kerberos without delegation configured for the PI Web API account fails the double hop to the Data Archive / AF.

Scene: client app → PI Web API (floor "PI Web API server") → PI Data Archive and PI AF Server. Try it: one-by-one GETs vs a batch with ParentIds (round-trip count), polling vs channel (requests per minute), WebID type vs rename/move/delete.

## Module 11.2: AF SDK: Objects & Bulk Calls (`dv-af-sdk`)
- PISystem → AFDatabase → AFElement → child AFElements / AFAttributes; collections are pluralised (AFElements); hierarchy mirrors PI System Explorer. — [Understand AF SDK basics](https://docs.aveva.com/bundle/af-sdk-getting-started/page/1011025.html)
- No explicit Connect() needed: implicit connection on first use. — [Connect to a Data Archive or AF database](https://docs.aveva.com/bundle/af-sdk-getting-started/page/1011026.html)
- A data call per attribute costs a network round trip each; an AFAttributeList's Data property makes one bulk call. — [Lesson 3: Reading and writing data](https://docs.aveva.com/bundle/af-sdk-getting-started/page/1011034.html)
- Bulk calls split attributes by data reference, then PI Point attributes by Data Archive, one bulk call per archive. — [AFListData.RecordedValues](https://docs.aveva.com/bundle/af-sdk/page/html/M_OSIsoft_AF_Data_AFListData_RecordedValues.htm)
- PIPagingConfiguration: PageType TagCount or EventCount and PageSize; the archive never splits one tag across pages; operation timeout defaults to 60 s; shrinking pages beats raising the timeout; errors surface as OperationCanceledException with the cause on config.Error. — [List / Bulk Data Methods Overview](https://docs.aveva.com/bundle/af-sdk/page/html/bulk-data-methods-overview.htm)
- AFDataPipe signs attributes up for data change events (GetUpdateEvents). — [AFDataPipe Class](https://docs.aveva.com/bundle/af-sdk/page/html/T_OSIsoft_AF_Data_AFDataPipe.htm)

Try it: attribute count, per-call vs bulk, page type/size, events per tag → round trips, page size in events, timeout.

## Module 11.3: The PI SQL Family (`dv-pi-sql`)
- PI SQL Client OLEDB/ODBC/JDBC implement the standard API; PI SQL DAS (RTQP Engine) executes the queries and installs only on a PI AF server. — [Introduction to PI SQL DAS (RTQP Engine)](https://docs.aveva.com/bundle/pi-sql-data-access-server-rtqp-engine/page/1016057.html), [PI SQL Client ODBC](https://docs.aveva.com/bundle/pi-sql-client-odbc/page/1014381.html)
- Ports: clients → AF 5457, SQL DAS 5464 (HTTP/SOAP) and 5465 (net.tcp); SQL DAS → Data Archive 5450, → SQL Server 1433. — [Using PI SQL DAS](https://docs.aveva.com/bundle/pi-server-f-topologies/page/1638826.html)
- Queries: Master.Element.ElementHierarchy, Master.Element.Element WHERE Template = 'Boiler'. — [SQL statements](https://docs.aveva.com/bundle/pi-sql-client-oledb/page/1014258.html)
- Linked server heterogeneous queries join SQL Server tables to AF. — [Heterogenous queries](https://docs.aveva.com/bundle/pi-sql-client-oledb/page/1014257.html)
- Data tables return one row per attribute value; transposed TVFs built from an element template return one column per attribute, via CROSS APPLY or derived function tables; created with a wizard in PI SQL Commander Lite. — [Transposition of data tables and TVFs](https://docs.aveva.com/bundle/pi-oledb-enterprise/page/1015823.html)

Try it: pick a client driver, a query (hierarchy, by template, archive values), rows vs transposed shape; block port 5465 to see the failure.
