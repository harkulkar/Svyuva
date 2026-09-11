# WORK QUEUE GUIDE

PROJECT: SV Yuva Suraksha Yojana Portal  
PHASE: 15

Route: `/admin/work-queue`  
API: `GET /api/admin/work-queue`, `GET /api/admin/work-queue/summary`, `POST /api/admin/work-queue/:id/assign`, `POST /api/admin/work-queue/assign-bulk`

Admin only.

## Summary cards

My Tasks, Unassigned, Overdue, High Priority, Recently Completed (7 days). Plus pending registration count. Due dates are operational, not official SLAs.

## List filters (server-side pagination, max 50)

workflow type, status, priority, assigned user, university, institute, date range, mine / unassigned / overdue.

## Assignment

Creates a `WorkflowTask` (`ASSIGNED`) and sets `WorkflowInstance.assignedTo`. Previous open tasks for that instance are `CANCELLED`. Reassignment is allowed. Completing a terminal workflow action marks open tasks `COMPLETED`.

Priorities: `LOW`, `NORMAL`, `HIGH`, `URGENT`.

## College action center

`GET /api/college/action-center` and college dashboard `actionItems` are generated from live records (registration correction, missing principal name, rejected documents, empty student list, Excel errors, pending payments, open insurance workflows). Links go to the matching page. AI may summarise these items; it does not invent them.

## Excel overlay

After preview/import, `STUDENT_UPLOAD` workflow records validation/import progress. Invalid rows are not imported. Downloadable error report remains `GET /api/college/students/import/:jobId/errors` (row, column/identifier, value context, error). Logs should not dump extra personal data.
