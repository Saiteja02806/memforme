import { NextResponse } from 'next/server';

function isAllowedHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  if (hostname.endsWith('.up.railway.app')) {
    return true;
  }
  return false;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const baseUrl =
    typeof body === 'object' &&
    body !== null &&
    'baseUrl' in body &&
    typeof (body as { baseUrl: unknown }).baseUrl === 'string'
      ? (body as { baseUrl: string }).baseUrl.trim()
      : '';
  if (!baseUrl) {
    return NextResponse.json({ ok: false, error: 'Missing baseUrl' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid URL' }, { status: 400 });
  }

  const isLocal =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocal)) {
    return NextResponse.json(
      { ok: false, error: 'Only https URLs or http://localhost are allowed' },
      { status: 400 }
    );
  }

  if (!isAllowedHost(parsed.hostname)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Host not allowed. Use *.up.railway.app or localhost for this demo proxy, or curl /health from your machine.',
      },
      { status: 400 }
    );
  }

  const healthUrl = new URL('/health', `${parsed.protocol}//${parsed.host}`).href;

  try {
    const r = await fetch(healthUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: 'application/json' },
    });
    const text = await r.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 500) };
    }
    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      healthUrl,
      body: json,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: `Fetch failed: ${msg}`, healthUrl },
      { status: 502 }
    );
  }
}
