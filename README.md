# Architect Toolbox

A collection of interactive calculation tools for architects and building engineers, built with React and Vite.

## Tools

### Rampe PMR — Wheelchair Ramp Calculator
Checks compliance with the French accessibility regulation (*Arrêté du 8 décembre 2014*) for ERP (public buildings), new construction and existing buildings.

- Slope compliance check (5 %, 8 %, 12 % thresholds)
- Automatic rest-landing count (required every 10 m)
- Width validation (1.40 m new / 1.20 m existing)
- Handrail requirement detection
- Live 2D cross-section preview

### Rampe Parking — Parking Ramp Calculator
Designs parking ramps per the French standard **NF P91-100**, in two modes:

| Mode | Description |
|------|-------------|
| **Réglementaire** | Auto-computes bottom and top transitions from total height + slope |
| **Libre** | Free segment editor — set slope & height independently per section |

- Slope badge (≤ 15 % comfort / ≤ 17 % NF / ≤ 20 % exceptional)
- Per-segment breakdown table (length, slope, height, elevation)
- Live 2D elevation profile
- Live 3D Three.js scene (lazy-loaded)

## Tech Stack

| Layer | Library |
|-------|---------|
| UI framework | React 18 |
| Bundler | Vite 5 |
| Styling | Tailwind CSS 3 |
| Routing | React Router 6 |
| 3D rendering | Three.js 0.184 |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Requires **Node.js 18+**.

## Project Structure

```
src/
├── components/
│   ├── Sidebar.jsx          # Navigation sidebar
│   ├── ToolLayout.jsx       # Split-panel layout (controls / preview)
│   ├── RampeViz.jsx         # 2D PMR ramp SVG
│   ├── RampeParkingViz.jsx  # 2D parking ramp SVG + 3D mount
│   └── Ramp3D.jsx           # Three.js 3D ramp scene
└── pages/
    ├── Home.jsx             # Landing page
    ├── RampePMR.jsx         # PMR calculator page
    └── RampeParking.jsx     # Parking ramp calculator page
```

## Regulatory References

- **Rampe PMR** — Arrêté du 8 décembre 2014 relatif à l'accessibilité aux personnes handicapées des ERP et des IOP, Annexes 2 & 3
- **Rampe Parking** — NF P91-100 : Parcs de stationnement — Règles de calcul et de conception

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-tool`)
3. Commit your changes (`git commit -m 'feat: add my tool'`)
4. Push to the branch (`git push origin feat/my-tool`)
5. Open a Pull Request

## License

MIT
