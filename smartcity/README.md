# Neo Sousse 2030

Application Smart City pour le suivi des capteurs, interventions, vehicules, mesures urbaines, automates d'etats, rapports IA et compilation de requetes en SQL.

## Fonctionnalites

- Dashboard avec KPIs de la ville en temps reel.
- Pages Capteurs, Interventions et Vehicules avec etats synchronises.
- Automates interactifs pour les transitions d'etats.
- Carte urbaine et visualisation des donnees de qualite d'air.
- Statistiques et graphiques avec Recharts.
- Chat IA, rapports et suggestions.
- Compilateur de langage naturel vers SQL.
- Backend Flask avec REST API et Socket.IO.
- Synchronisation des donnees par Socket.IO plus refresh API toutes les 60 secondes.

## Architecture

```text
smartcity/
|-- backend/              # API Flask + Socket.IO
|   |-- app.py            # Serveur principal
|   `-- ia_module.py      # Collecte des donnees et logique IA
|-- frontend/             # Application React + Vite
|   |-- src/
|   |   |-- App.jsx
|   |   |-- SocketContext.jsx
|   |   `-- components/
|   `-- package.json
|-- bdd/                  # Configuration et scripts SQL
|-- compilateur/          # Lexer, parser, semantic, codegen
|-- automates/            # Automates Python
|-- db/                   # Modules base de donnees et IA
`-- README.md
```

## Prerequis

- Python 3.10 ou plus recent
- Node.js 18 ou plus recent
- PostgreSQL
- Base de donnees `smartcity`

Configuration actuelle de la base dans `bdd/db_config.py` :

```text
host: localhost
port: 5433
database: smartcity
user: postgres
```

Le mot de passe est configure localement dans `bdd/db_config.py`. Pour un depot public, il est recommande de le remplacer par une variable d'environnement.

## Installation

Depuis le dossier `smartcity` :

```bash
pip install flask flask-cors flask-socketio psycopg2-binary transitions eventlet
```

Puis installer le frontend :

```bash
cd frontend
npm install
```

## Lancement

Ouvrir un premier terminal pour le backend :

```bash
cd smartcity
python backend/app.py
```

Le backend demarre sur :

```text
http://localhost:5000
```

Ouvrir un deuxieme terminal pour le frontend :

```bash
cd smartcity/frontend
npm run dev
```

Le frontend demarre sur :

```text
http://localhost:3000
```

## Temps reel

Le backend envoie les evenements Socket.IO suivants :

```text
metrics_update
capteurs_update
measures_update
vehicle_update
intervention_update
status_change
alert
```

Le moteur automatique backend tourne toutes les 60 secondes. A chaque cycle, il peut modifier les etats des capteurs, interventions et vehicules, puis envoyer les nouvelles valeurs au frontend.

Exemple de logs backend :

```text
[WORKER] Heartbeat - 15:49:06
[AUTO] capteur #24: ACTIF -> SIGNALE via signaler
[AUTO] vehicule #10: STATIONNE -> EN_ROUTE via auto_vehicle_flow
[SOCKET] emit_all_updates 15:49:06
[FRONTEND] dashboard: capteurs_actifs=30, capteurs_signales=34, capteurs_hs=2, interventions_en_cours=0, interventions_terminees=200, vehicules_en_route=50, vehicules_en_panne=2
[FRONTEND] socket lists: capteurs_update=100 items, measures_update=50 items, vehicle_update=150 items, intervention_update=200 items
```

Les pages frontend utilisent Socket.IO et relisent aussi leurs API toutes les 60 secondes pour garder les dernieres valeurs.

## API principales

| Methode | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/dashboard` | KPIs globaux du dashboard |
| GET | `/api/capteurs` | Liste des capteurs |
| POST | `/api/capteurs/<id>/transition` | Transition d'un capteur |
| GET | `/api/interventions` | Liste des interventions |
| POST | `/api/interventions/<id>/transition` | Transition d'une intervention |
| GET | `/api/vehicules` | Liste des vehicules |
| POST | `/api/vehicules/<id>/transition` | Transition d'un vehicule |
| GET | `/api/mesures` | Mesures des capteurs |
| GET | `/api/citoyens` | Liste des citoyens |
| GET | `/api/rapport` | Rapport IA |
| GET | `/api/suggestions` | Suggestions IA |
| POST | `/api/chat` | Chat IA |
| POST | `/api/compiler` | Compilation langage naturel vers SQL |
| GET | `/api/realtime/status` | Statut du moteur temps reel |
| POST | `/api/simulate/start` | Demarrer la simulation |
| POST | `/api/simulate/stop` | Arreter la simulation |

## Transitions automatiques

Capteurs :

```text
INACTIF -> ACTIF
ACTIF -> SIGNALE
SIGNALE -> EN_MAINTENANCE
EN_MAINTENANCE -> ACTIF
EN_MAINTENANCE -> HORS_SERVICE
HORS_SERVICE -> INACTIF
```

Interventions :

```text
DEMANDE -> TECH1_ASSIGNE
TECH1_ASSIGNE -> TECH2_VALIDE
TECH2_VALIDE -> IA_VALIDE
IA_VALIDE -> TERMINE
```

Vehicules :

```text
STATIONNE -> EN_ROUTE
EN_ROUTE -> ARRIVE
EN_ROUTE -> EN_PANNE
ARRIVE -> STATIONNE
EN_PANNE -> STATIONNE
```

## Verification

Compiler le frontend :

```bash
cd frontend
npm run build
```

Verifier le backend :

```bash
python -m py_compile backend/app.py
```

## Technologies

- Backend : Flask, Flask-SocketIO, psycopg2, Python
- Frontend : React 18, Vite, Tailwind CSS, Recharts, React Flow, Leaflet
- Base de donnees : PostgreSQL
- Temps reel : Socket.IO
- Compilation : lexer, parser, analyse semantique, generation SQL
