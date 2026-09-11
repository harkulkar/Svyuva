# ID maps

Generated JSON maps (`university-map.json`, `institute-map.json`, …) appear here after dry-run or staging.

Format:

```json
{
  "LEGACY-ID": "newMongoObjectId"
}
```

Maps are derived from `legacyId`, never from array index. Staging also persists the same pairs in MongoDB collection `migrationIdMaps`.
