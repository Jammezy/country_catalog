-- Country Catalog tables for a new PostgreSQL database.
CREATE TABLE IF NOT EXISTS country (
    country_id INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    country_name VARCHAR(30) NOT NULL,
    popular_site VARCHAR(50) NOT NULL,
    capital VARCHAR(30) NOT NULL,
    population INTEGER NOT NULL CHECK (population >= 0),
    visited VARCHAR(1) CHECK (visited IN ('Y', 'N'))
);

-- Keep the existing class project's login fields.
CREATE TABLE IF NOT EXISTS users (
    user_email VARCHAR(50) PRIMARY KEY,
    user_first VARCHAR(50) NOT NULL,
    user_last VARCHAR(50) NOT NULL,
    user_password VARCHAR(50) NOT NULL
);
