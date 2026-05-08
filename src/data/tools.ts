// Tool registry — add new tools here and they automatically appear on the hub.

export type Tag =
  | 'Math'
  | 'CS'
  | 'Calculus'
  | 'Algebra'
  | 'Algorithm'
  | 'Statistics';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: Tag[];
  path: string;      // React Router path
  /** Optional: mark tool as work-in-progress — shown but not clickable */
  wip?: boolean;
}

const tools: Tool[] = [
  // ── Add your first real tool here when you're ready ──
  // Example (remove or replace):
  {
    id: 'approx-integration',
    name: 'Approximate Integration',
    description:
      'Visualize and compare numerical integration methods: Midpoint, Trapezoid, and Simpson\'s Rule on any function.',
    icon: '∫',
    tags: ['Calculus', 'Math'],
    path: '/axiom/approx-integration',
  },
  {
    id: 'volume-rotation',
    name: 'Volume by Rotation',
    description:
      'Generate 3D solids of revolution around any axis and compute their volume using the disk/shell method.',
    icon: '🔄',
    tags: ['Calculus', 'Math'],
    path: '/axiom/volume-rotation',
    wip: true,
  },
  {
    id: 'graph-traversal',
    name: 'Graph Traversal',
    description:
      'Step through BFS and DFS on custom graphs. Visualize discovery order, frontier, and visited sets.',
    icon: '⬡',
    tags: ['CS', 'Algorithm'],
    path: '/axiom/graph-traversal',
    wip: true,
  },
  {
    id: 'matrix-ops',
    name: 'Matrix Operations',
    description:
      'Perform row reduction, determinants, eigenvalues, and matrix multiplication with step-by-step breakdowns.',
    icon: '⊞',
    tags: ['Math', 'Algebra'],
    path: '/axiom/matrix-ops',
    wip: true,
  },
  {
    id: 'sorting-viz',
    name: 'Sorting Visualizer',
    description:
      'Watch Quicksort, Mergesort, Heapsort, and more race against each other in real time with adjustable speed.',
    icon: '↕',
    tags: ['CS', 'Algorithm'],
    path: '/axiom/sorting-viz',
    wip: true,
  },
  {
    id: 'probability-sim',
    name: 'Probability Simulator',
    description:
      'Run Monte Carlo simulations and see how experimental probability converges to theory as sample size grows.',
    icon: '🎲',
    tags: ['Math', 'Statistics'],
    path: '/axiom/probability-sim',
    wip: true,
  },
];

export default tools;
