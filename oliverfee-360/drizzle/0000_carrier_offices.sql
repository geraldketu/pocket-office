CREATE TABLE carriers (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE memberships (carrier_id TEXT NOT NULL REFERENCES carriers(id), email TEXT NOT NULL, user_id TEXT, role TEXT NOT NULL CHECK(role IN ('owner','office','driver')), person_id TEXT, PRIMARY KEY(carrier_id,email));
--> statement-breakpoint
CREATE INDEX memberships_user ON memberships(user_id);
--> statement-breakpoint
CREATE TABLE workspaces (carrier_id TEXT PRIMARY KEY REFERENCES carriers(id), state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE files (id TEXT PRIMARY KEY, carrier_id TEXT NOT NULL REFERENCES carriers(id), person_id TEXT, record_id TEXT, purpose TEXT, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, expires_on TEXT, uploaded_by TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX files_carrier ON files(carrier_id);
--> statement-breakpoint
CREATE TABLE office_audit (id TEXT PRIMARY KEY, carrier_id TEXT NOT NULL, user_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL);
