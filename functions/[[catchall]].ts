// Cloudflare Pages Function - 统一代理

const API_ORIGIN = 'https://api.dawn.us.ci';

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const path = url.pathname;

    // /api/* → 后端API代理
    if (path.startsWith('/api/')) {
        const targetUrl = API_ORIGIN + path + url.search;
        try {
            const resp = await fetch(targetUrl, {
                method: context.request.method,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(20000),
            });

            if (!resp.ok) {
                return new Response(
                    JSON.stringify({ code: -1, msg: 'Backend ' + resp.status }),
                    { status: resp.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
                );
            }

            const body = await resp.text();
            return new Response(body, {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'public, max-age=3',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        } catch (e) {
            return new Response(
                JSON.stringify({ code: -1, msg: 'Proxy error: ' + e.message }),
                { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
            );
        }
    }

    // /img/flag/* → flagcdn.com
    if (path.startsWith('/img/flag/')) {
        return proxyImage('https://flagcdn.com/' + path.replace('/img/flag/', ''));
    }

    // /img/crest/* → crests.football-data.org
    if (path.startsWith('/img/crest/')) {
        return proxyImage('https://crests.football-data.org/' + path.replace('/img/crest/', ''));
    }

    // 其他 → 静态文件
    return context.next();
}

async function proxyImage(targetUrl) {
    try {
        const resp = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            cf: { cacheTtl: 604800, cacheEverything: true },
        });
        if (!resp.ok) return new Response(null, { status: resp.status });
        const headers = new Headers(resp.headers);
        headers.set('Cache-Control', 'public, max-age=604800');
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(resp.body, { status: resp.status, headers });
    } catch {
        return new Response(null, { status: 502 });
    }
}
