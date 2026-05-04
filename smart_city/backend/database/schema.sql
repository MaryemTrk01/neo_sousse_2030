-- Enable TimescaleDB Extension (CRITICAL for time-series data)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Drop tables if they exist
DROP TABLE IF EXISTS mesures CASCADE;
DROP TABLE IF EXISTS interventions CASCADE;
DROP TABLE IF EXISTS vehicules CASCADE;
DROP TABLE IF EXISTS capteurs CASCADE;
DROP TABLE IF EXISTS citoyens CASCADE;

-- 1. Citoyens (Citizens)
CREATE TABLE citoyens (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    score_ecologique INT DEFAULT 50 CHECK (score_ecologique BETWEEN 0 AND 100),
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vehicules (Autonomous Vehicles)
CREATE TABLE vehicules (
    id SERIAL PRIMARY KEY,
    matricule VARCHAR(20) UNIQUE NOT NULL,
    capacite INT NOT NULL,
    etat VARCHAR(20) DEFAULT 'STATIONNÉ' CHECK (etat IN ('STATIONNÉ', 'EN_ROUTE', 'EN_PANNE', 'ARRIVÉ')),
    niveau_batterie INT DEFAULT 100 CHECK (niveau_batterie BETWEEN 0 AND 100),
    co2_economise_kg FLOAT DEFAULT 0.0,
    localisation_actuelle VARCHAR(100)
);

-- 3. Capteurs (Sensors)
CREATE TABLE capteurs (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL,
    type_capteur VARCHAR(50) NOT NULL CHECK (type_capteur IN ('Air', 'Trafic', 'Energie', 'Dechets')),
    localisation VARCHAR(100) NOT NULL,
    etat VARCHAR(20) DEFAULT 'INACTIF' CHECK (etat IN ('INACTIF', 'ACTIF', 'SIGNALÉ', 'EN_MAINTENANCE', 'HORS_SERVICE')),
    date_installation DATE DEFAULT CURRENT_DATE
);

-- 4. Interventions (Maintenance on sensors/vehicles)
CREATE TABLE interventions (
    id SERIAL PRIMARY KEY,
    capteur_id INT REFERENCES capteurs(id) ON DELETE CASCADE,
    vehicule_id INT REFERENCES vehicules(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    etat VARCHAR(20) DEFAULT 'DEMANDE' CHECK (etat IN ('DEMANDE', 'TECH1_ASSIGNÉ', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINÉ')),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_cloture TIMESTAMP,
    -- Constraint: an intervention applies to either a sensor or a vehicle, not both
    CHECK ((capteur_id IS NOT NULL AND vehicule_id IS NULL) OR (capteur_id IS NULL AND vehicule_id IS NOT NULL))
);

-- 5. Mesures (Time-series data for sensors)
CREATE TABLE mesures (
    time TIMESTAMPTZ NOT NULL,
    capteur_id INT NOT NULL REFERENCES capteurs(id) ON DELETE CASCADE,
    valeur FLOAT NOT NULL,
    unite VARCHAR(20) NOT NULL
);

-- Convert mesures into a TimescaleDB hypertable partitioned by time
-- This is a mandatory step for TimescaleDB integration
SELECT create_hypertable('mesures', 'time', if_not_exists => TRUE);

-- Create indexes for performance
CREATE INDEX idx_capteurs_etat ON capteurs(etat);
CREATE INDEX idx_vehicules_etat ON vehicules(etat);
CREATE INDEX idx_interventions_etat ON interventions(etat);
CREATE INDEX idx_mesures_capteur_id_time ON mesures(capteur_id, time DESC);
