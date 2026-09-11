# Example authorized export layout

Copy this folder, fill it from an official read-only dump, then set:

```
LEGACY_EXPORT_DIR=C:\path\to\your\export
```

Each file is a JSON array of records. Empty arrays are valid and mean “this entity was not in the export” (`NOT_AVAILABLE_IN_LEGACY_SOURCE`).

Do not put production data in the git repository.

Suggested files:

- universities.json
- institutes.json
- users.json
- students.json
- enrollments.json
- insurance.json
- documents.json
- payments.json
- reviews.json
- ecards.json
- notifications.json
- auditLogs.json
- files-manifest.json
