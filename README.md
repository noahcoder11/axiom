# Axiom 🔬

> Interactive math and CS tools — visualizers, calculators, and algorithm demos.

**Live site:** https://noahcoder11.github.io/axiom

---

## Tech Stack

- **Vite + React + TypeScript**
- **React Router** (HashRouter for GitHub Pages compat)
- **Vanilla CSS** design system
- **gh-pages** for deployment

---

## Getting Started

```bash
npm install
npm run dev        # start dev server at http://localhost:5173/axiom/
```

## Deploying

```bash
npm run deploy     # builds and pushes to gh-pages branch
```

---

## Adding a New Tool

1. **Create the page** at `src/pages/tools/YourTool.tsx`
2. **Register it** in `src/data/tools.ts`:
   ```ts
   {
     id: 'your-tool',
     name: 'Your Tool',
     description: 'What it does.',
     icon: '🔢',
     tags: ['Math'],
     path: '/axiom/your-tool',
   }
   ```
3. **Add the route** in `src/App.tsx`:
   ```tsx
   import YourTool from './pages/tools/YourTool';
   // ...
   <Route path="/axiom/your-tool" element={<YourTool />} />
   ```
4. Done — the card appears on the hub automatically.

---

## Project Structure

```
src/
├── components/       # Shared components (Navbar, ToolCard)
├── data/
│   └── tools.ts      # ← Tool registry (add tools here)
├── pages/
│   ├── Home.tsx      # Hub/landing page
│   ├── NotFound.tsx  # 404 page
│   └── tools/        # One file per tool
├── styles/
│   ├── global.css    # Design system & tokens
│   └── home.css      # Hub page styles
└── main.tsx
```
