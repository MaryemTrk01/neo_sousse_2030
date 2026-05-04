-- ───────────────────────────────────────────────────────────
-- SEED SOUSSE — Smart City Neo-Sousse 2030
-- Peuplement de la base avec des données réalistes de Sousse
-- ───────────────────────────────────────────────────────────

-- Nettoyage optionnel (décommenter si nécessaire)
-- TRUNCATE mesures, interventions, vehicules, capteurs, citoyens RESTART IDENTITY CASCADE;

-- 1. CITOYENS DE SOUSSE
INSERT INTO citoyens (nom, score_ecolo, adresse) VALUES
('Amine Sousse', 85, 'Boulevard de la Corniche, Sousse'),
('Salma Zaafrani', 92, 'Route de la Plage, Hammam Sousse'),
('Yassine Ben Ahmed', 75, 'Avenue Habib Bourguiba, Centre Ville'),
('Leila Trabelsi', 60, 'Cité Riadh, Sousse'),
('Mohamed Dridi', 88, 'Kantaoui, Hammam Sousse'),
('Sonia Gharbi', 70, 'Quartier Sahloul 4, Sousse'),
('Karim Belhadj', 55, 'Medina, Vieux Sousse'),
('Olfa Mansour', 95, 'Khzema Est, Sousse'),
('Walid Jlassi', 40, 'Port de Sousse'),
('Hana Saidi', 82, 'Bouhsina, Sousse');

-- 2. CAPTEURS (50+ capteurs dans les zones de Sousse)
-- Zones : Centre Ville, Medina, Corniche, Port Sousse, Sahloul, Khzema, Hammam Sousse, Kantaoui, Riadh, Bouhsina
INSERT INTO capteurs (type, zone, statut, date_installation) VALUES
('pollution', 'Centre Ville', 'ACTIF', '2023-01-15'),
('trafic', 'Centre Ville', 'ACTIF', '2023-01-15'),
('eclairage', 'Centre Ville', 'ACTIF', '2023-01-15'),
('pollution', 'Medina', 'ACTIF', '2023-02-10'),
('bruit', 'Medina', 'SIGNALE', '2023-02-10'),
('temperature', 'Corniche', 'ACTIF', '2023-03-05'),
('humidite', 'Corniche', 'ACTIF', '2023-03-05'),
('pollution', 'Corniche', 'ACTIF', '2023-03-05'),
('trafic', 'Corniche', 'ACTIF', '2023-03-05'),
('co2', 'Port Sousse', 'ACTIF', '2023-04-12'),
('pollution', 'Port Sousse', 'ACTIF', '2023-04-12'),
('trafic', 'Port Sousse', 'HORS_SERVICE', '2023-04-12'),
('pollution', 'Sahloul', 'ACTIF', '2023-05-20'),
('co2', 'Sahloul', 'ACTIF', '2023-05-20'),
('temperature', 'Sahloul', 'ACTIF', '2023-05-20'),
('humidite', 'Sahloul', 'ACTIF', '2023-05-20'),
('eclairage', 'Sahloul', 'ACTIF', '2023-05-20'),
('pollution', 'Khzema', 'ACTIF', '2023-06-15'),
('trafic', 'Khzema', 'ACTIF', '2023-06-15'),
('bruit', 'Khzema', 'ACTIF', '2023-06-15'),
('pollution', 'Hammam Sousse', 'ACTIF', '2023-07-01'),
('temperature', 'Hammam Sousse', 'ACTIF', '2023-07-01'),
('humidite', 'Hammam Sousse', 'ACTIF', '2023-07-01'),
('trafic', 'Hammam Sousse', 'SIGNALE', '2023-07-01'),
('pollution', 'Kantaoui', 'ACTIF', '2023-08-10'),
('co2', 'Kantaoui', 'ACTIF', '2023-08-10'),
('temperature', 'Kantaoui', 'ACTIF', '2023-08-10'),
('bruit', 'Kantaoui', 'EN_MAINTENANCE', '2023-08-10'),
('eclairage', 'Kantaoui', 'ACTIF', '2023-08-10'),
('pollution', 'Riadh', 'ACTIF', '2023-09-05'),
('co2', 'Riadh', 'INACTIF', '2023-09-05'),
('trafic', 'Riadh', 'ACTIF', '2023-09-05'),
('pollution', 'Bouhsina', 'ACTIF', '2023-10-12'),
('temperature', 'Bouhsina', 'ACTIF', '2023-10-12'),
('humidite', 'Bouhsina', 'ACTIF', '2023-10-12'),
-- Ajout supplémentaire pour atteindre 50
('bruit', 'Centre Ville', 'ACTIF', '2024-01-10'),
('co2', 'Medina', 'ACTIF', '2024-01-12'),
('eclairage', 'Corniche', 'ACTIF', '2024-01-15'),
('pollution', 'Sahloul', 'ACTIF', '2024-02-01'),
('trafic', 'Khzema', 'ACTIF', '2024-02-05'),
('bruit', 'Hammam Sousse', 'ACTIF', '2024-02-10'),
('co2', 'Kantaoui', 'ACTIF', '2024-02-15'),
('temperature', 'Riadh', 'ACTIF', '2024-02-20'),
('humidite', 'Bouhsina', 'ACTIF', '2024-02-25'),
('pollution', 'Centre Ville', 'SIGNALE', '2024-03-01'),
('trafic', 'Port Sousse', 'ACTIF', '2024-03-05'),
('eclairage', 'Medina', 'ACTIF', '2024-03-10'),
('co2', 'Corniche', 'ACTIF', '2024-03-15'),
('temperature', 'Sahloul', 'ACTIF', '2024-03-20'),
('bruit', 'Khzema', 'ACTIF', '2024-03-25');

-- 3. VÉHICULES
INSERT INTO vehicules (type, trajet_id, statut) VALUES
('bus', 1, 'EN_ROUTE'),
('camion_poubelle', 2, 'STATIONNE'),
('bus', 3, 'EN_ROUTE'),
('balayeuse', 4, 'EN_PANNE'),
('navette_autonome', 5, 'EN_ROUTE'),
('camion_poubelle', 6, 'STATIONNE'),
('bus', 7, 'ARRIVE'),
('bus', 8, 'EN_ROUTE');

-- 4. INTERVENTIONS
INSERT INTO interventions (capteur_id, technicien1_id, technicien2_id, statut, date) VALUES
(5, 1, NULL, 'TECH1_ASSIGNE', NOW() - INTERVAL '2 hours'),
(12, 2, 3, 'TECH2_VALIDE', NOW() - INTERVAL '1 day'),
(24, 4, NULL, 'DEMANDE', NOW() - INTERVAL '5 hours'),
(28, 5, 6, 'IA_VALIDE', NOW() - INTERVAL '30 minutes'),
(45, 7, 8, 'TERMINE', NOW() - INTERVAL '2 days');

-- 5. MESURES INITIALES
INSERT INTO mesures (capteur_id, type_mesure, valeur, date)
SELECT id, type, 
    CASE 
        WHEN type = 'pollution' THEN 20 + (random() * 80)
        WHEN type = 'co2' THEN 350 + (random() * 500)
        WHEN type = 'temperature' THEN 15 + (random() * 25)
        WHEN type = 'humidite' THEN 40 + (random() * 50)
        WHEN type = 'trafic' THEN random() * 100
        WHEN type = 'bruit' THEN 40 + (random() * 40)
        ELSE random() * 100
    END,
    NOW() - (random() * INTERVAL '24 hours')
FROM capteurs WHERE statut = 'ACTIF';
