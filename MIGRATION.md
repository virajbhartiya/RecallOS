# Migration Guide: RecallOS → Cognia

## SSL Certificates

New SSL certificates have been generated with Cognia naming:

### Client Certificates
- Location: `client/certs/`
- Files: `app.cognia.test+3-key.pem`, `app.cognia.test+3.pem`
- Valid for: `app.cognia.test`, `localhost`, `127.0.0.1`, `::1`

### API Certificates
- Location: `api/certs/`
- Files: `api.cognia.test+3-key.pem`, `api.cognia.test+3.pem`
- Valid for: `api.cognia.test`, `localhost`, `127.0.0.1`, `::1`

Certificates are valid until February 12, 2028.

## Database Migration

The database name has changed from `recallos` to `cognia`. If you have existing data:

### Option 1: Fresh Start (Recommended for Development)
1. Stop existing containers:
   ```bash
   cd api
   docker compose down -v
   ```
2. Start with new database:
   ```bash
   docker compose up -d
   ```
3. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

### Option 2: Migrate Existing Data
1. Export data from old database:
   ```bash
   docker exec cognia_db pg_dump -U postgres cognia > backup.sql
   ```
2. Update docker-compose.yml (already done - uses `cognia_db` and `cognia` database)
3. Start new containers:
   ```bash
   cd api
   docker compose up -d
   ```
4. Import data into new database:
   ```bash
   docker exec -i cognia_db psql -U postgres cognia < backup.sql
   ```
5. Run any pending migrations:
   ```bash
   npm run prisma:migrate
   ```

### Update Environment Variables

Update your `api/.env` file:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cognia
```

## Docker Volumes

Old volumes (if they exist):
- `cognia_data`
- `cognia_qdrant_data`
- `cognia_redis_data`
- `cognia_network`

New volumes:
- `cognia_data`
- `cognia_qdrant_data`
- `cognia_redis_data`
- `cognia_network`

If you need to migrate data from old volumes, you'll need to:
1. Stop containers
2. Copy volume data manually using `docker run --rm -v` commands
3. Or use a volume backup/restore tool

## Network Configuration

Update `/etc/hosts` (or equivalent) to include:
```
127.0.0.1 app.cognia.test
127.0.0.1 api.cognia.test
```

## Extension IDs

The Firefox extension ID is `cognia@cognia.com`. If you have the extension installed, you may need to reinstall it.

