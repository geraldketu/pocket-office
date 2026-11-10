CREATE TABLE national_diesel_rate (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 price REAL NOT NULL CHECK (price > 0),
 rate_date TEXT NOT NULL
);
