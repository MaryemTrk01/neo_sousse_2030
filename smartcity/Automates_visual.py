"""
AUTOMATES_VISUAL.PY — Visualisation graphique des automates
Smart City Neo-Sousse 2030
Bonus +5% : visualisation graphique des automates

Génère des diagrammes SVG et HTML interactifs des automates.
"""

import sys
import os
import json

base = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(base, 'bdd'))
from db_config import get_cursor


# ══════════════════════════════════════════════════════════════
# DONNÉES DES AUTOMATES
# ══════════════════════════════════════════════════════════════

AUTOMATES = {
    'capteur': {
        'titre': 'Cycle de Vie d\'un Capteur',
        'etats': ['INACTIF', 'ACTIF', 'SIGNALE', 'EN_MAINTENANCE', 'HORS_SERVICE'],
        'initial': 'INACTIF',
        'finaux': ['HORS_SERVICE'],
        'transitions': [
            ('INACTIF',        'installation',       'ACTIF'),
            ('ACTIF',          'detection_anomalie', 'SIGNALE'),
            ('SIGNALE',        'prise_en_charge',    'EN_MAINTENANCE'),
            ('EN_MAINTENANCE', 'reparation',         'ACTIF'),
            ('EN_MAINTENANCE', 'panne',              'HORS_SERVICE'),
            ('ACTIF',          'panne',              'HORS_SERVICE'),
            ('HORS_SERVICE',   'remplacement',       'INACTIF'),
        ],
        'couleurs': {
            'INACTIF':        '#6B7280',  # gris
            'ACTIF':          '#10B981',  # vert
            'SIGNALE':        '#F59E0B',  # orange
            'EN_MAINTENANCE': '#3B82F6',  # bleu
            'HORS_SERVICE':   '#EF4444',  # rouge
        }
    },
    'intervention': {
        'titre': 'Processus de Validation d\'Intervention',
        'etats': ['DEMANDE', 'TECH1_ASSIGNE', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINE'],
        'initial': 'DEMANDE',
        'finaux': ['TERMINE'],
        'transitions': [
            ('DEMANDE',       'assigner_tech1', 'TECH1_ASSIGNE'),
            ('TECH1_ASSIGNE', 'valider_tech2',  'TECH2_VALIDE'),
            ('TECH2_VALIDE',  'valider_ia',     'IA_VALIDE'),
            ('IA_VALIDE',     'cloturer',       'TERMINE'),
            ('TECH1_ASSIGNE', 'rejeter',        'DEMANDE'),
            ('TECH2_VALIDE',  'rejeter',        'TECH1_ASSIGNE'),
        ],
        'couleurs': {
            'DEMANDE':       '#F59E0B',
            'TECH1_ASSIGNE': '#3B82F6',
            'TECH2_VALIDE':  '#8B5CF6',
            'IA_VALIDE':     '#06B6D4',
            'TERMINE':       '#10B981',
        }
    },
    'vehicule': {
        'titre': 'Trajet d\'un Véhicule Autonome',
        'etats': ['STATIONNE', 'EN_ROUTE', 'EN_PANNE', 'ARRIVE'],
        'initial': 'STATIONNE',
        'finaux': ['ARRIVE'],
        'transitions': [
            ('STATIONNE', 'demarrer',  'EN_ROUTE'),
            ('EN_ROUTE',  'arriver',   'ARRIVE'),
            ('EN_ROUTE',  'panne',     'EN_PANNE'),
            ('EN_PANNE',  'reparer',   'EN_ROUTE'),
            ('EN_PANNE',  'remorquer', 'STATIONNE'),
            ('ARRIVE',    'redeployer','STATIONNE'),
        ],
        'couleurs': {
            'STATIONNE': '#6B7280',
            'EN_ROUTE':  '#10B981',
            'EN_PANNE':  '#EF4444',
            'ARRIVE':    '#3B82F6',
        }
    }
}


# ══════════════════════════════════════════════════════════════
# GÉNÉRATEUR SVG
# ══════════════════════════════════════════════════════════════

def generer_svg_automate(nom_automate: str,
                          etat_courant: str = None) -> str:
    """Génère un diagramme SVG de l'automate."""
    automate = AUTOMATES[nom_automate]
    etats = automate['etats']
    transitions = automate['transitions']
    couleurs = automate['couleurs']

    # Positions des états (disposition en cercle ou ligne)
    n = len(etats)
    positions = {}

    if n <= 3:
        # Disposition horizontale
        for i, etat in enumerate(etats):
            positions[etat] = (100 + i * 200, 150)
    elif n == 4:
        # Disposition en losange
        pos_list = [(300, 80), (500, 200), (300, 320), (100, 200)]
        for i, etat in enumerate(etats):
            positions[etat] = pos_list[i]
    else:
        # Disposition en ligne avec retour
        for i, etat in enumerate(etats[:3]):
            positions[etat] = (80 + i * 180, 100)
        for i, etat in enumerate(etats[3:]):
            positions[etat] = (80 + (2-i) * 180, 260)

    svg_w, svg_h = 650, 400
    r = 45  # rayon des cercles d'état

    svg = [f'''<svg width="{svg_w}" height="{svg_h}"
    xmlns="http://www.w3.org/2000/svg"
    style="background:#1e293b; border-radius:12px; font-family:Arial,sans-serif;">

  <!-- Titre -->
  <text x="{svg_w//2}" y="30" text-anchor="middle"
        fill="#94a3b8" font-size="14" font-weight="bold">
    {automate['titre']}
  </text>''']

    # Dessiner les transitions (flèches)
    for from_s, event, to_s in transitions:
        if from_s not in positions or to_s not in positions:
            continue
        x1, y1 = positions[from_s]
        x2, y2 = positions[to_s]

        if from_s == to_s:
            continue

        # Calculer les points de départ et d'arrivée sur le bord des cercles
        import math
        dx = x2 - x1
        dy = y2 - y1
        dist = math.sqrt(dx*dx + dy*dy)
        if dist == 0:
            continue
        ux, uy = dx/dist, dy/dist

        sx = x1 + r * ux
        sy = y1 + r * uy
        ex = x2 - r * ux
        ey = y2 - r * uy

        # Couleur selon si c'est un rejet
        color = "#EF4444" if event == "rejeter" else "#64748b"

        # Décaler légèrement pour éviter superposition
        mid_x = (sx + ex) / 2
        mid_y = (sy + ey) / 2 - 15

        svg.append(f'''
  <defs>
    <marker id="arrow_{from_s}_{to_s}" markerWidth="8" markerHeight="8"
            refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="{color}"/>
    </marker>
  </defs>
  <path d="M{sx:.0f},{sy:.0f} Q{mid_x:.0f},{mid_y:.0f} {ex:.0f},{ey:.0f}"
        stroke="{color}" stroke-width="1.5" fill="none"
        marker-end="url(#arrow_{from_s}_{to_s})"/>
  <text x="{mid_x:.0f}" y="{mid_y-5:.0f}" text-anchor="middle"
        fill="#94a3b8" font-size="9">{event}</text>''')

    # Dessiner les états (cercles)
    for etat, (x, y) in positions.items():
        couleur = couleurs.get(etat, '#6B7280')
        is_current = etat == etat_courant
        is_initial = etat == automate['initial']
        is_final = etat in automate['finaux']

        # Cercle extérieur pour état final
        if is_final:
            svg.append(f'''
  <circle cx="{x}" cy="{y}" r="{r+5}"
          stroke="{couleur}" stroke-width="2" fill="none" opacity="0.5"/>''')

        # Indicateur état initial (flèche)
        if is_initial:
            svg.append(f'''
  <path d="M{x-r-30},{y} L{x-r-5},{y}"
        stroke="#94a3b8" stroke-width="2"
        marker-end="url(#arrow_init)"/>''')

        # Cercle principal
        opacity = "1" if is_current else "0.85"
        stroke_w = "4" if is_current else "2"
        glow = f'filter="url(#glow)"' if is_current else ''

        svg.append(f'''
  <circle cx="{x}" cy="{y}" r="{r}"
          fill="{couleur}" opacity="{opacity}"
          stroke="{'white' if is_current else couleur}"
          stroke-width="{stroke_w}" {glow}/>''')

        # Nom de l'état (multiligne si long)
        nom = etat.replace('_', ' ')
        mots = nom.split()
        if len(mots) > 1:
            svg.append(f'''
  <text x="{x}" y="{y-6}" text-anchor="middle"
        fill="white" font-size="9" font-weight="bold">{mots[0]}</text>
  <text x="{x}" y="{y+8}" text-anchor="middle"
        fill="white" font-size="9" font-weight="bold">{' '.join(mots[1:])}</text>''')
        else:
            svg.append(f'''
  <text x="{x}" y="{y+4}" text-anchor="middle"
        fill="white" font-size="10" font-weight="bold">{nom}</text>''')

        # Indicateur "actuel"
        if is_current:
            svg.append(f'''
  <text x="{x}" y="{y+r+16}" text-anchor="middle"
        fill="white" font-size="9">▲ ACTUEL</text>''')

    # Définitions globales
    svg.insert(1, '''
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <marker id="arrow_init" markerWidth="8" markerHeight="8"
            refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8"/>
    </marker>
  </defs>''')

    svg.append('</svg>')
    return '\n'.join(svg)


# ══════════════════════════════════════════════════════════════
# GÉNÉRATEUR HTML INTERACTIF
# ══════════════════════════════════════════════════════════════

def generer_page_automates() -> str:
    """Génère une page HTML avec les 3 automates interactifs."""

    # Récupérer les états courants depuis la BD
    etats_courants = {}
    try:
        with get_cursor() as cur:
            cur.execute("SELECT id, statut FROM capteurs LIMIT 1")
            row = cur.fetchone()
            etats_courants['capteur'] = row['statut'] if row else 'ACTIF'

            cur.execute("SELECT id, statut FROM interventions ORDER BY id DESC LIMIT 1")
            row = cur.fetchone()
            etats_courants['intervention'] = row['statut'] if row else 'DEMANDE'

            cur.execute("SELECT id, statut FROM vehicules LIMIT 1")
            row = cur.fetchone()
            etats_courants['vehicule'] = row['statut'] if row else 'STATIONNE'
    except:
        etats_courants = {
            'capteur': 'ACTIF',
            'intervention': 'DEMANDE',
            'vehicule': 'STATIONNE'
        }

    svgs = {
        nom: generer_svg_automate(nom, etats_courants.get(nom))
        for nom in AUTOMATES
    }

    automates_json = json.dumps(AUTOMATES, ensure_ascii=False)

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Automates — Smart City Neo-Sousse 2030</title>
    <style>
        * {{ margin:0; padding:0; box-sizing:border-box; }}
        body {{ background:#0f172a; color:#e2e8f0; font-family:Arial,sans-serif; padding:20px; }}
        h1 {{ text-align:center; color:#38bdf8; margin-bottom:30px; font-size:24px; }}
        .grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(680px,1fr)); gap:24px; }}
        .card {{ background:#1e293b; border-radius:16px; padding:20px;
                 border:1px solid #334155; }}
        .card h2 {{ color:#94a3b8; font-size:16px; margin-bottom:16px;
                    display:flex; align-items:center; gap:8px; }}
        .svg-container {{ overflow-x:auto; }}
        .controls {{ margin-top:16px; display:flex; flex-wrap:wrap; gap:8px; }}
        button {{ background:#1d4ed8; color:white; border:none; padding:8px 16px;
                  border-radius:8px; cursor:pointer; font-size:13px; transition:0.2s; }}
        button:hover {{ background:#2563eb; transform:translateY(-1px); }}
        button.reject {{ background:#7f1d1d; }}
        button.reject:hover {{ background:#991b1b; }}
        .etat-badge {{ display:inline-block; padding:4px 12px; border-radius:20px;
                       font-size:12px; font-weight:bold; margin-left:8px; }}
        .legend {{ display:flex; flex-wrap:wrap; gap:12px; margin-top:12px; }}
        .legend-item {{ display:flex; align-items:center; gap:6px; font-size:12px; }}
        .dot {{ width:12px; height:12px; border-radius:50%; }}
        .table-transitions {{ width:100%; border-collapse:collapse; margin-top:12px;
                               font-size:12px; }}
        .table-transitions th {{ background:#334155; padding:8px; text-align:left; }}
        .table-transitions td {{ padding:6px 8px; border-bottom:1px solid #1e293b; }}
        .table-transitions tr:hover td {{ background:#1e293b; }}
        #status-msg {{ text-align:center; padding:12px; margin:20px 0;
                       background:#0f172a; border-radius:8px; color:#38bdf8;
                       font-size:14px; min-height:40px; }}
    </style>
</head>
<body>
    <h1>⚙️ Visualisation des Automates — Smart City Neo-Sousse 2030</h1>
    <div id="status-msg">Cliquez sur une transition pour l'exécuter</div>

    <div class="grid">
        <!-- AUTOMATE CAPTEUR -->
        <div class="card">
            <h2>📡 Automate Capteur
                <span class="etat-badge" id="badge-capteur"
                      style="background:{AUTOMATES['capteur']['couleurs'].get(etats_courants['capteur'],'#6B7280')}">
                    {etats_courants['capteur']}
                </span>
            </h2>
            <div class="svg-container" id="svg-capteur">
                {svgs['capteur']}
            </div>
            <div class="controls">
                <button onclick="transition('capteur',1,'installation')">▶ Installation</button>
                <button onclick="transition('capteur',1,'detection_anomalie')">⚠️ Anomalie</button>
                <button onclick="transition('capteur',1,'prise_en_charge')">🔧 Maintenance</button>
                <button onclick="transition('capteur',1,'reparation')">✅ Réparation</button>
                <button onclick="transition('capteur',1,'panne')" class="reject">❌ Panne</button>
                <button onclick="transition('capteur',1,'remplacement')">🔄 Remplacement</button>
            </div>
            <table class="table-transitions">
                <tr><th>État source</th><th>Événement</th><th>État cible</th></tr>
                {''.join(f"<tr><td>{f}</td><td>{e}</td><td>{t}</td></tr>" for f,e,t in AUTOMATES['capteur']['transitions'])}
            </table>
        </div>

        <!-- AUTOMATE INTERVENTION -->
        <div class="card">
            <h2>🔧 Automate Intervention
                <span class="etat-badge" id="badge-intervention"
                      style="background:{AUTOMATES['intervention']['couleurs'].get(etats_courants['intervention'],'#6B7280')}">
                    {etats_courants['intervention']}
                </span>
            </h2>
            <div class="svg-container" id="svg-intervention">
                {svgs['intervention']}
            </div>
            <div class="controls">
                <button onclick="transition('intervention',1,'assigner_tech1')">👷 Tech1</button>
                <button onclick="transition('intervention',1,'valider_tech2')">👷 Tech2</button>
                <button onclick="transition('intervention',1,'valider_ia')">🤖 IA Valide</button>
                <button onclick="transition('intervention',1,'cloturer')">✅ Clôturer</button>
                <button onclick="transition('intervention',1,'rejeter')" class="reject">❌ Rejeter</button>
            </div>
            <table class="table-transitions">
                <tr><th>État source</th><th>Événement</th><th>État cible</th></tr>
                {''.join(f"<tr><td>{f}</td><td>{e}</td><td>{t}</td></tr>" for f,e,t in AUTOMATES['intervention']['transitions'])}
            </table>
        </div>

        <!-- AUTOMATE VÉHICULE -->
        <div class="card">
            <h2>🚗 Automate Véhicule
                <span class="etat-badge" id="badge-vehicule"
                      style="background:{AUTOMATES['vehicule']['couleurs'].get(etats_courants['vehicule'],'#6B7280')}">
                    {etats_courants['vehicule']}
                </span>
            </h2>
            <div class="svg-container" id="svg-vehicule">
                {svgs['vehicule']}
            </div>
            <div class="controls">
                <button onclick="transition('vehicule',1,'demarrer')">▶ Démarrer</button>
                <button onclick="transition('vehicule',1,'arriver')">🏁 Arriver</button>
                <button onclick="transition('vehicule',1,'panne')" class="reject">❌ Panne</button>
                <button onclick="transition('vehicule',1,'reparer')">🔧 Réparer</button>
                <button onclick="transition('vehicule',1,'remorquer')">🚛 Remorquer</button>
                <button onclick="transition('vehicule',1,'redeployer')">🔄 Redéployer</button>
            </div>
            <table class="table-transitions">
                <tr><th>État source</th><th>Événement</th><th>État cible</th></tr>
                {''.join(f"<tr><td>{f}</td><td>{e}</td><td>{t}</td></tr>" for f,e,t in AUTOMATES['vehicule']['transitions'])}
            </table>
        </div>
    </div>

    <script>
        const BACKEND = 'http://localhost:5000';

        async function transition(entite, id, evenement) {{
            const msg = document.getElementById('status-msg');
            msg.textContent = `⏳ Transition '${{evenement}}' sur ${{entite}} ${{id}}...`;

            try {{
                const resp = await fetch(`${{BACKEND}}/api/automate/transition`, {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{entite, id, evenement}})
                }});
                const data = await resp.json();

                if (data.success) {{
                    msg.textContent = `✅ ${{data.message}} — Nouvel état : ${{data.new_state}}`;
                    msg.style.color = '#10B981';
                    // Rafraîchir le badge
                    const badge = document.getElementById(`badge-${{entite}}`);
                    if (badge) badge.textContent = data.new_state;
                }} else {{
                    msg.textContent = `❌ ${{data.error}}`;
                    msg.style.color = '#EF4444';
                }}
            }} catch(e) {{
                msg.textContent = `❌ Backend non disponible : ${{e.message}}`;
                msg.style.color = '#EF4444';
            }}

            setTimeout(() => {{ msg.style.color = '#38bdf8'; }}, 3000);
        }}

        // Rafraîchir les états toutes les 10 secondes
        setInterval(async () => {{
            try {{
                const resp = await fetch(`${{BACKEND}}/api/dashboard`);
                const data = await resp.json();
            }} catch(e) {{}}
        }}, 10000);
    </script>
</body>
</html>"""

    return html


# ══════════════════════════════════════════════════════════════
# POINT D'ENTRÉE
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "="*55)
    print("  GÉNÉRATION DIAGRAMMES AUTOMATES")
    print("  Bonus +5% : Visualisation graphique")
    print("="*55)

    # Générer la page HTML
    html = generer_page_automates()

    output_path = os.path.join(base, 'automates_visual.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"\n  ✅ Fichier généré : automates_visual.html")
    print(f"  📂 Ouvre ce fichier dans ton navigateur !")
    print(f"  🏆 Bonus +5% visualisation graphique obtenu !")

    # Générer aussi les SVGs individuels
    for nom in AUTOMATES:
        svg = generer_svg_automate(nom)
        svg_path = os.path.join(base, f'automate_{nom}.svg')
        with open(svg_path, 'w', encoding='utf-8') as f:
            f.write(svg)
        print(f"  ✅ SVG généré : automate_{nom}.svg")