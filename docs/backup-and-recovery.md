# Ricarut — Database Backup & Disaster Recovery Guide (Phase 8)

## 1. Executive Summary & Policy

Ricarut implements a zero-data-loss architecture for all ledger entries, idempotency logs, provider transactions, and reconciliation audit trails.

### Backup Schedule
* **Point-in-Time Recovery (PITR)**: Continuous transaction log archiving via PostgreSQL WAL (Write-Ahead Logging) retaining up to 7 days of granular point-in-time state.
* **Daily Full Logical Snapshots**: Automated snapshot taken at `02:00 UTC` every night.
* **Retention Policy**:
  * Daily snapshots: 30 days
  * Monthly archive snapshots: 12 months (for financial accounting audits)

---

## 2. Backup Execution (Sandbox & Production)

To take a full logical backup of the Ricarut database:

```bash
# Set PostgreSQL connection URI
export PGPASSWORD="your_db_password"

# Generate compressed SQL dump with schema and data
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="ricarut_backup_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 3. Disaster Recovery & Restoration Procedure

In the event of an infrastructure incident, accidental deletion, or failover requirement:

### Step 1: Drain & Pause Inbound Traffic
Switch the API gateway or reverse proxy to maintenance mode to reject new transfer submissions with `503 SERVICE_UNAVAILABLE (Maintenance in progress)`.

### Step 2: Provision Target Database
Ensure target PostgreSQL instance matches the required version (PostgreSQL 15+).

### Step 3: Execute Restore
```bash
pg_restore -h $TARGET_HOST -U $TARGET_USER -d $TARGET_DB \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "ricarut_backup_YYYYMMDD_HHMMSS.dump"
```

### Step 4: Run Prisma Schema Verification
```bash
npx prisma db push --skip-generate
```

### Step 5: Post-Restore Reconciliation Sweep
Run the Ricarut batch reconciliation service to sweep any transactions that were in `pending` or `processing` during the incident window:
```bash
npx ts-node scripts/reconcile-sweep.ts
```

### Step 6: Health Verification & Traffic Restoration
Verify `/health` and `/health/ready` return 200 before removing maintenance mode.
