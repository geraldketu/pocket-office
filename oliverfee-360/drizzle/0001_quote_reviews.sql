CREATE TABLE quote_reviews (id TEXT PRIMARY KEY, carrier_id TEXT NOT NULL REFERENCES carriers(id), snapshot TEXT NOT NULL, selection TEXT NOT NULL, input_hash TEXT NOT NULL, status TEXT NOT NULL, signature TEXT, signed_at TEXT, signed_by TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, checkout_session TEXT, paid_cents INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE INDEX quote_reviews_carrier ON quote_reviews(carrier_id);
--> statement-breakpoint
CREATE TABLE stripe_events (id TEXT PRIMARY KEY, received_at TEXT NOT NULL);
