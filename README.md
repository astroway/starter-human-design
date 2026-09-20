# Human Design reader

A working Human Design app on the [AstroWay API](https://api.astroway.info): birth data in, bodygraph and reading out. Clone it, put a key in `.env`, run it.

**Live demo: [api.astroway.info/demo/human-design/](https://api.astroway.info/demo/human-design/)**

One call to `POST /v1/human-design` returns the type, strategy, authority, profile, definition, incarnation cross, all nine centres with their active gates, every defined channel and both activation sets. This app draws them. There is no second call and no local astrology library.

## Run it

```bash
git clone https://github.com/astroway/starter-human-design
cd starter-human-design
npm install
cp .env.example .env     # put your key in it
npm run dev              # http://localhost:5173
```

Get a key at [api.astroway.info/dashboard/sign-up](https://api.astroway.info/dashboard/sign-up). The free tier is 10,000 credits a month and needs no card. Use an `aw_test_*` sandbox key while you build: it spends nothing.

For production:

```bash
npm run build
npm start                # http://localhost:5178, serves the built app and the API route
```

## The shape of it

```
server/index.mjs   the whole backend: one route, no framework, no dependencies
src/App.tsx        the form and the reading
src/Bodygraph.tsx  the nine centres as SVG
src/types.ts       the part of the response this app uses
```

**The browser never talks to AstroWay.** It talks to `/api/reading` on this server, which holds the key and forwards the call. That is not a preference: responses from `https://api.astroway.info/v1/*` carry no `access-control-allow-origin` header, so a fetch straight from the page fails on CORS before it fails on auth. Every app on this API needs a server route, and `server/index.mjs` is the smallest honest one at about 150 lines.

A few things in there are worth keeping when you rewrite it in your own framework:

- **The key is read from the environment, never from the client.** Nothing prefixed `VITE_` reaches this file, because anything prefixed `VITE_` reaches the browser.
- **The time zone goes as an IANA name**, not as an offset you computed. Kyiv in May 1990 kept UTC+4, not the +3 it keeps today, and an hour of error moves the profile.
- **The API's own error message is passed through.** It knows why it refused; rewriting the reason is how someone ends up debugging your guess instead of their input.
- **`X-Credits-Used` and `X-Credits-Remaining` are logged on every call.** A Human Design reading is 50 credits, so the free tier is 200 of them a month. Knowing that before the bill does is the whole point of the header.
- **There is a rate limit in front of the key**, because a demo on a public URL spends real credits on every visitor. Ten readings an hour per address by default, `RATE_LIMIT_PER_HOUR=0` to turn it off on your own machine.

## About the bodygraph

`src/Bodygraph.tsx` draws a topology diagram: the nine centres where they always sit, and one straight line for each defined channel between the two centres it joins. A traditional bodygraph routes all 36 channels through their own gate pairs, which is a lot of hand-authored geometry to get subtly wrong, and none of that geometry is in the API response. What the response does carry is which centres are defined and which channels are hung, and that is what this draws.

If you want the traditional rendering without drawing it yourself, the API renders one and it needs no key at all:

```
https://api.astroway.info/v1/embed/bodygraph?date=1990-05-15&time=14:30:00&timezoneOffset=4&latitude=50.45&longitude=30.52
```

That returns an HTML page meant for an `<iframe>`.

## What it costs

| Call | Credits |
|---|---|
| `POST /v1/human-design` | 50 |

The Free plan is 10,000 credits a month, so 200 readings. [Full price list](https://api.astroway.info/credits/), every endpoint, published.

## Where to go next

- [Human Design API](https://api.astroway.info/products/human-design-api/): the other eleven endpoints, including compatibility, transits and the incarnation cross.
- [Prompts for AI builders](https://api.astroway.info/prompts/): if you would rather have Lovable, Bolt or v0 write the next one.
- [MCP server](https://api.astroway.info/agent-setup/): point an agent at `https://mcp.astroway.info/mcp/human-design` and it calls these endpoints itself.

## Licence

MIT. Take it apart.
