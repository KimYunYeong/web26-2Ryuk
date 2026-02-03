import { NextRequest, NextResponse } from 'next/server';

const FORWARD_HEADERS = [
  'authorization',
  'content-type',
  'cookie',
  'accept',
  'accept-language',
] as const;

function buildBackendUrl(pathSegments: string[], request: NextRequest): string {
  const base = process.env.NEXT_PUBLIC_API_SERVER_URL;
  if (!base) throw new Error('NEXT_PUBLIC_API_SERVER_URL is not set');
  const path = pathSegments.length ? pathSegments.join('/') : '';
  const search = request.nextUrl.searchParams.toString();
  const query = search ? `?${search}` : '';
  return `${base.replace(/\/$/, '')}/api/${path}${query}`;
}

function forwardHeaders(request: NextRequest): Headers {
  const out = new Headers();
  FORWARD_HEADERS.forEach((name) => {
    const value = request.headers.get(name);
    if (value) out.set(name, value);
  });
  return out;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const url = buildBackendUrl(path, request);
  const res = await fetch(url, {
    method: 'GET',
    headers: forwardHeaders(request),
    cache: 'no-store',
  });
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const url = buildBackendUrl(path, request);
  const body = await request.text();
  const res = await fetch(url, {
    method: 'POST',
    headers: forwardHeaders(request),
    body: body || undefined,
    cache: 'no-store',
  });
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const url = buildBackendUrl(path, request);
  const body = await request.text();
  const res = await fetch(url, {
    method: 'PUT',
    headers: forwardHeaders(request),
    body: body || undefined,
    cache: 'no-store',
  });
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const url = buildBackendUrl(path, request);
  const body = await request.text();
  const res = await fetch(url, {
    method: 'PATCH',
    headers: forwardHeaders(request),
    body: body || undefined,
    cache: 'no-store',
  });
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const url = buildBackendUrl(path, request);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: forwardHeaders(request),
    cache: 'no-store',
  });
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
