-- ───────────────────────────────────────────────────────────
-- TIMESCALE MIGRATION — Smart City Neo-Sousse 2030
-- Convertit la table 'mesures' en hypertable pour l'analyse temporelle
-- ───────────────────────────────────────────────────────────

-- 1. Activer l'extension TimescaleDB (doit être installée sur le serveur)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Préparer la table mesures pour la conversion
-- On s'assure que la colonne 'date' est bien au format TIMESTAMP
ALTER TABLE mesures ALTER COLUMN date TYPE TIMESTAMP WITH TIME ZONE USING date::timestamp with time zone;

-- 3. Convertir en hypertable
-- 'date' est la colonne de partitionnement temporel
-- On utilise migrate_data => true pour conserver les données existantes
SELECT create_hypertable('mesures', 'date', if_not_exists => TRUE, migrate_data => TRUE);

-- 4. Ajouter des index optimisés
CREATE INDEX IF NOT EXISTS idx_mesures_capteur_id ON mesures(capteur_id);
CREATE INDEX IF NOT EXISTS idx_mesures_type_date ON mesures(type_mesure, date DESC);

-- 5. Vérification
DO $$
BEGIN
    RAISE NOTICE 'Migration TimescaleDB terminée avec succès.';
END $$;
