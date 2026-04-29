# 🏙️ Smart City Neo-Sousse 2030
## Projet de Théorie des Langages et Compilation — Section IA 2

---

## 📁 Structure du Projet

```
smartcity/
├── backend/
│   ├── app.py              # Serveur Flask REST API (port 5000)
│   └── ia_module.py         # Module IA Générative (Google Gemini)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Dashboard principal
│   │   └── components/
│   │       ├── Sidebar.jsx   # Navigation latérale
│   │       ├── Overview.jsx  # KPIs temps réel
│   │       ├── Compiler.jsx  # Compilateur NL → SQL
│   │       ├── Automates.jsx # Automates finis interactifs
│   │       ├── Reports.jsx   # Rapports IA & Chat ARIA
│   │       └── Charts.jsx    # Graphiques Recharts
│   └── package.json
├── compilateur/              # Compilateur NL → SQL existant
├── automates/                # Automates existants (transitions)
├── bdd/
│   └── db_config.py         # Configuration PostgreSQL
└── README.md
```

---

## 🚀 Instructions de Lancement

### Prérequis
- **Python 3.8+** avec pip
- **Node.js 18+** avec npm
- **PostgreSQL** démarré sur le port `5433` (base `smartcity`)

### 1. Installer les dépendances Python
```bash
pip install flask flask-cors psycopg2-binary transitions
```

### 2. Lancer le serveur Backend (Flask)
```bash
cd smartcity/backend
python app.py
```
Le serveur démarre sur **http://localhost:5000**

### 3. Installer les dépendances Frontend
```bash
cd smartcity/frontend
npm install
```

### 4. Lancer le Dashboard React
```bash
cd smartcity/frontend
npm run dev
```
Le dashboard est accessible sur **http://localhost:3000**

---

## 📡 Endpoints API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/rapport` | Rapport journalier IA |
| GET | `/suggestions` | Suggestions d'actions |
| GET | `/stats` | KPIs en JSON |
| GET | `/mesures` | Données des mesures |
| GET | `/citoyens` | Liste des citoyens |
| GET | `/automates/etat` | État des automates |
| POST | `/valider-transition` | Validation IA d'une transition |
| POST | `/chat` | Chat avec ARIA |
| POST | `/compiler` | Compilateur NL → SQL |
| POST | `/automates/transition` | Déclencher une transition |

---

## ⚙️ Configuration

| Paramètre | Valeur |
|-----------|--------|
| PostgreSQL Host | localhost |
| PostgreSQL Port | 5433 |
| Base de données | smartcity |
| User | postgres |
| Password | salma123456 |
| Flask Port | 5000 |
| React Port | 3000 |
| API IA | Google Gemini (gratuit) |

---

## 🧠 Technologies

- **Backend** : Python, Flask, psycopg2, Google Gemini API
- **Frontend** : React 18, Vite, TailwindCSS, Recharts, React Flow
- **Base de données** : PostgreSQL
- **Automates** : Library `transitions` (Python)
- **Compilateur** : Lexer → Parser → Sémantique → CodeGen (NL → SQL)
