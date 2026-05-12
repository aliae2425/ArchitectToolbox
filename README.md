# Architect Toolbox

Une collection d'outils de calcul interactifs pour architectes et ingénieurs du bâtiment, développée avec React et Vite.

## Outils

### Rampe PMR — Calculateur de rampe d'accès handicapé
Vérifie la conformité à la réglementation française d'accessibilité (*Arrêté du 8 décembre 2014*) pour les ERP (établissements recevant du public), constructions neuves et bâtiments existants.

- Vérification de la pente (seuils à 5 %, 8 %, 12 %)
- Calcul automatique des paliers de repos (obligatoires tous les 10 m)
- Validation de la largeur (1,40 m neuf / 1,20 m existant)
- Détection des exigences en garde-corps
- Aperçu 2D en coupe transversale en temps réel

### Rampe Parking — Calculateur de rampe de parking
Conçoit des rampes de stationnement selon la norme française **NF P91-100**, en deux modes :

| Mode | Description |
|------|-------------|
| **Réglementaire** | Calcul automatique des transitions basse et haute à partir de la hauteur totale et de la pente |
| **Libre** | Éditeur de segments libres — pente et hauteur définissables indépendamment par section |

- Indicateur de pente (≤ 15 % confort / ≤ 17 % NF / ≤ 20 % exceptionnel)
- Tableau détaillé par segment (longueur, pente, hauteur, dénivelé)
- Profil d'élévation 2D en temps réel
- Scène 3D Three.js en temps réel (chargement différé)

## Technologies

| Couche | Bibliothèque |
|--------|--------------|
| Framework UI | React 18 |
| Bundler | Vite 5 |
| Styles | Tailwind CSS 3 |
| Routage | React Router 6 |
| Rendu 3D | Three.js 0.184 |

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Construire pour la production
npm run build

# Prévisualiser la version de production
npm run preview
```

Nécessite **Node.js 18+**.

## Structure du projet

```
src/
├── components/
│   ├── Sidebar.jsx          # Barre de navigation latérale
│   ├── ToolLayout.jsx       # Mise en page deux panneaux (contrôles / aperçu)
│   ├── RampeViz.jsx         # SVG 2D rampe PMR
│   ├── RampeParkingViz.jsx  # SVG 2D rampe parking + montage 3D
│   └── Ramp3D.jsx           # Scène 3D Three.js
└── pages/
    ├── Home.jsx             # Page d'accueil
    ├── RampePMR.jsx         # Page calculateur PMR
    └── RampeParking.jsx     # Page calculateur rampe parking
```

## Références réglementaires

- **Rampe PMR** — Arrêté du 8 décembre 2014 relatif à l'accessibilité aux personnes handicapées des ERP et des IOP, Annexes 2 & 3
- **Rampe Parking** — NF P91-100 : Parcs de stationnement — Règles de calcul et de conception

## Contribuer

1. Forker le dépôt
2. Créer une branche de fonctionnalité (`git checkout -b feat/mon-outil`)
3. Valider les modifications (`git commit -m 'feat: ajout de mon outil'`)
4. Pousser la branche (`git push origin feat/mon-outil`)
5. Ouvrir une Pull Request

## Licence

MIT
