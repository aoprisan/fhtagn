interface ZigguratVizProps {
  devotion: number
}

// Tiers of the altar: devotion per stone block, darkest (raw) to brightest (hallowed).
const TIERS = [
  { threshold: 10_000, color: '#243042' },   // basalt
  { threshold: 25_000, color: '#2f6f63' },   // eldritch teal
  { threshold: 50_000, color: '#1f9e8f' },   // deep teal glow
  { threshold: 100_000, color: '#c9a227' },  // sickly gold
]

const BLOCK_W = 22
const BLOCK_H = 16
const GAP = 2

interface Block {
  tier: number
  color: string
}

function computeBlocks(devotion: number): Block[] {
  const blocks: Block[] = []
  let remaining = devotion

  for (const tier of TIERS) {
    while (remaining >= tier.threshold) {
      blocks.push({ tier: TIERS.indexOf(tier), color: tier.color })
      remaining -= tier.threshold
    }
  }
  return blocks
}

// Ziggurat layout: row 0 (bottom) is widest; a block stacks if it has 2 supports below.
function layoutZiggurat(blocks: Block[]): { x: number; y: number; color: string }[] {
  if (blocks.length === 0) return []

  let baseWidth = 1
  while (baseWidth * (baseWidth + 1) / 2 < blocks.length) baseWidth++

  const rows: Block[][] = []
  let placed = 0
  let rowWidth = baseWidth

  while (placed < blocks.length && rowWidth > 0) {
    const rowBlocks = blocks.slice(placed, placed + rowWidth)
    rows.push(rowBlocks)
    placed += rowBlocks.length
    rowWidth--
  }

  const result: { x: number; y: number; color: string }[] = []
  for (let row = 0; row < rows.length; row++) {
    const w = rows[row].length
    const offsetX = (baseWidth - w) * (BLOCK_W + GAP) / 2
    for (let col = 0; col < w; col++) {
      result.push({
        x: offsetX + col * (BLOCK_W + GAP),
        y: (rows.length - 1 - row) * (BLOCK_H + GAP),
        color: rows[row][col].color,
      })
    }
  }
  return result
}

export default function ZigguratViz({ devotion }: ZigguratVizProps) {
  const blocks = computeBlocks(devotion)
  const layout = layoutZiggurat(blocks)

  if (layout.length === 0) return null

  const maxX = Math.max(...layout.map(b => b.x + BLOCK_W))
  const maxY = Math.max(...layout.map(b => b.y + BLOCK_H))
  const svgW = maxX + 4
  const svgH = maxY + 4

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ maxHeight: 120 }}
    >
      {layout.map((block, i) => (
        <rect
          key={i}
          x={block.x + 2}
          y={block.y + 2}
          width={BLOCK_W}
          height={BLOCK_H}
          fill={block.color}
          rx={2}
        />
      ))}
    </svg>
  )
}
