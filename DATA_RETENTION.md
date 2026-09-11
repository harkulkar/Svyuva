# Data retention

Do not invent legal retention periods. Official / DPDP / scheme policy: **TODO: VERIFY OFFICIAL RETENTION POLICY**.

| Record type | Application behaviour today | Official retention |
| --- | --- | --- |
| Students | Soft status `ACTIVE` / `INACTIVE` (no hard delete API) | TODO: VERIFY OFFICIAL RETENTION POLICY |
| Institutes | Status workflow; last admin cannot be removed | TODO: VERIFY OFFICIAL RETENTION POLICY |
| Insurance | Collection exists; HTTP API not live | TODO: VERIFY OFFICIAL RETENTION POLICY |
| Documents | Metadata in MongoDB; files when storage is configured | TODO: VERIFY OFFICIAL RETENTION POLICY |
| Payments | Collection exists; HTTP API not live | TODO: VERIFY OFFICIAL RETENTION POLICY |
| E-cards | Collection exists; HTTP API not live | TODO: VERIFY OFFICIAL RETENTION POLICY |
| Audit logs | Append-only (no update/delete API) | TODO: VERIFY OFFICIAL RETENTION POLICY |
| Excel preview jobs | TTL expiry on `uploads` | Operational, not archival |
| Refresh tokens | TTL expiry | Session lifetime |

Automatic archival of production records is **not** enabled. See `ARCHIVING.md`.
