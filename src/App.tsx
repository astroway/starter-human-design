import { useState } from 'react';
import type { BirthInput, Reading } from './types';
import { Bodygraph } from './Bodygraph';

/* A worked example, so the first thing a visitor sees is a chart and not an
   empty form. Kyiv in May 1990 kept UTC+4, not the +3 it keeps today, which is
   exactly why the field below takes a zone name and not an offset. */
const SAMPLE: BirthInput = {
  date: '1990-05-15',
  time: '14:30:00',
  timezone: 'Europe/Kyiv',
  latitude: '50.45',
  longitude: '30.52',
};

function Field(props: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint ? <span className="field-hint">{props.hint}</span> : null}
    </label>
  );
}

function Summary({ reading }: { reading: Reading }) {
  const rows: Array<[string, string]> = [
    ['Type', reading.type],
    ['Strategy', reading.strategy],
    ['Authority', reading.authority],
    ['Profile', `${reading.profile.profile} ${reading.profile.geometry}`],
    ['Definition', reading.definition],
    ['Not-self theme', reading.notSelfTheme],
    ['Incarnation cross', reading.cross.name],
  ];
  return (
    <dl className="summary">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Channels({ reading }: { reading: Reading }) {
  if (!reading.channels.length) {
    return <p className="muted">No channel is hung in this chart, which is what makes the definition {reading.definition.toLowerCase()}.</p>;
  }
  return (
    <ul className="channels">
      {reading.channels.map((c) => (
        <li key={`${c.gate1}-${c.gate2}`}>
          <code>{c.gate1}-{c.gate2}</code>
          <span>{c.centerA} to {c.centerB}</span>
          <em>{c.activatedBy.join(' and ')}</em>
        </li>
      ))}
    </ul>
  );
}

function Activations({ reading }: { reading: Reading }) {
  const rows = reading.personalityActivations.map((p, i) => ({
    planet: p.planet,
    personality: `${p.gate}.${p.line}`,
    design: reading.designActivations[i]
      ? `${reading.designActivations[i]!.gate}.${reading.designActivations[i]!.line}`
      : '',
  }));
  return (
    <table className="activations">
      <thead>
        <tr><th>Planet</th><th>Personality</th><th>Design</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.planet}>
            <td>{r.planet}</td>
            <td><code>{r.personality}</code></td>
            <td><code className="design">{r.design}</code></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function App() {
  const [input, setInput] = useState<BirthInput>(SAMPLE);
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof BirthInput) => (v: string) => setInput((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      /* Our own server, never api.astroway.info. The key lives there and the
         browser could not reach the API directly even if it had one.
         BASE_URL is '/' unless the app was built for a subpath, which is how
         the demo runs under /demo/human-design/ without a fork. */
      const res = await fetch(`${import.meta.env.BASE_URL}api/reading`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Server answered ${res.status}.`);
      setReading(json.data as Reading);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setReading(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header>
        <h1>Human Design reader</h1>
        <p className="lede">
          One call to <code>POST /v1/human-design</code> returns type, strategy, authority,
          profile, every centre, every channel and both activation sets. This page draws them.
        </p>
      </header>

      <form onSubmit={submit}>
        <div className="grid">
          <Field label="Date of birth" value={input.date} onChange={set('date')} type="date" />
          <Field label="Time of birth" hint="Exact. An hour out moves the profile." value={input.time} onChange={set('time')} placeholder="14:30:00" />
          <Field label="Time zone" hint="IANA name. Do not compute an offset yourself." value={input.timezone} onChange={set('timezone')} placeholder="Europe/Kyiv" />
          <Field label="Latitude" value={input.latitude} onChange={set('latitude')} placeholder="50.45" />
          <Field label="Longitude" value={input.longitude} onChange={set('longitude')} placeholder="30.52" />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Reading…' : 'Read the chart'}</button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {reading ? (
        <section className="result">
          <div className="two-up">
            <Bodygraph reading={reading} />
            <Summary reading={reading} />
          </div>
          <h2>Channels</h2>
          <Channels reading={reading} />
          <h2>Activations</h2>
          <p className="muted">
            Personality is the conscious side, computed at birth. Design is the unconscious one,
            computed about 88 degrees of solar arc earlier.
          </p>
          <Activations reading={reading} />
        </section>
      ) : null}

      <footer>
        <p>
          Built on the <a href="https://api.astroway.info">AstroWay API</a>.
          Source: <a href="https://github.com/astroway/starter-human-design">astroway/starter-human-design</a>.
        </p>
      </footer>
    </main>
  );
}
