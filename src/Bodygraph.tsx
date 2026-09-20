import type { Reading } from './types';

/**
 * The nine centres, drawn.
 *
 * This is a topology diagram, not a ritual bodygraph: the centres sit where
 * they always sit and a defined channel is one straight line between the two
 * centres it joins. A traditional chart routes each of the 36 channels through
 * its own pair of gates, which is a great deal of hand-authored geometry to get
 * subtly wrong, and none of it is in the API response. What is in the response
 * is which centres are defined and which channels are hung, and that is what
 * this draws. Swap it for a full bodygraph when you have one; nothing else in
 * the app changes.
 *
 * If you want the ritual version without drawing it, the API renders one:
 * https://api.astroway.info/v1/embed/bodygraph?date=…&time=…&latitude=…&longitude=…
 * That endpoint needs no key and returns an HTML page for an iframe.
 */

const W = 320;
const H = 520;

/* Canonical positions. x, y is the centre of each shape. */
const POS: Record<string, { x: number; y: number; shape: 'triangle' | 'inverted' | 'square' | 'diamond'; size: number; label: string }> = {
  Head:        { x: 160, y: 42,  shape: 'triangle', size: 46, label: 'Head' },
  Ajna:        { x: 160, y: 118, shape: 'inverted', size: 46, label: 'Ajna' },
  Throat:      { x: 160, y: 196, shape: 'square',   size: 56, label: 'Throat' },
  G:           { x: 160, y: 286, shape: 'diamond',  size: 52, label: 'G' },
  Heart:       { x: 246, y: 250, shape: 'inverted', size: 36, label: 'Heart' },
  Spleen:      { x: 62,  y: 372, shape: 'triangle', size: 44, label: 'Spleen' },
  SolarPlexus: { x: 258, y: 372, shape: 'inverted', size: 44, label: 'Solar Plexus' },
  Sacral:      { x: 160, y: 380, shape: 'square',   size: 56, label: 'Sacral' },
  Root:        { x: 160, y: 466, shape: 'square',   size: 56, label: 'Root' },
};

function shapePoints(name: string): string {
  const p = POS[name]!;
  const h = p.size / 2;
  switch (p.shape) {
    case 'triangle':
      return `${p.x},${p.y - h} ${p.x + h},${p.y + h} ${p.x - h},${p.y + h}`;
    case 'inverted':
      return `${p.x - h},${p.y - h} ${p.x + h},${p.y - h} ${p.x},${p.y + h}`;
    case 'diamond':
      return `${p.x},${p.y - h} ${p.x + h},${p.y} ${p.x},${p.y + h} ${p.x - h},${p.y}`;
    default:
      return `${p.x - h},${p.y - h} ${p.x + h},${p.y - h} ${p.x + h},${p.y + h} ${p.x - h},${p.y + h}`;
  }
}

export function Bodygraph({ reading }: { reading: Reading }) {
  const defined = new Set(reading.centers.filter((c) => c.defined).map((c) => c.name));

  return (
    <figure className="bodygraph">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bodygraph: nine centres with the defined channels between them">
        {/* Channels first, so the centres sit on top of the lines. */}
        {reading.channels.map((c) => {
          const a = POS[c.centerA];
          const b = POS[c.centerB];
          if (!a || !b) return null;
          return (
            <line
              key={`${c.gate1}-${c.gate2}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              className="channel"
            >
              <title>{`${c.gate1}-${c.gate2}: ${c.centerA} to ${c.centerB}, ${c.activatedBy.join(' and ')}`}</title>
            </line>
          );
        })}

        {reading.centers.map((c) => {
          const p = POS[c.name];
          if (!p) return null;
          return (
            <g key={c.name} className={defined.has(c.name) ? 'centre defined' : 'centre open'}>
              <polygon points={shapePoints(c.name)}>
                <title>
                  {`${p.label}: ${c.defined ? 'defined' : 'open'}. `
                    + `Active gates: ${c.activeGates.length ? c.activeGates.join(', ') : 'none'}.`}
                </title>
              </polygon>
              <text x={p.x} y={p.y + 4} textAnchor="middle">{p.label}</text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        Filled centres are defined. Hover a centre for its active gates, a line for the channel.
      </figcaption>
    </figure>
  );
}
