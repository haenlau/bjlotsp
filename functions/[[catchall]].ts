// Cloudflare Pages Function - 统一代理
// /api/*  → 转发到后端API服务器
// /img/*  → 代理图片资源
// 其他    → 交给 Pages 正常处理静态文件

const API_ORIGIN = 'https://api.dawn.us.ci:8899';

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const path = url.pathname;

    // /api/* → 后端API代理
    if (path.startsWith('/api/')) {
        const targetUrl = API_ORIGIN + path + url.search;
        try {
            const resp = await fetch(targetUrl, {
                method: context.request.method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0',
                },
                signal: AbortSignal.timeout(25000),
            });

            const headers = new Headers();
            headers.set('Content-Type', 'application/json; charset=utf-8');
            headers.set('Cache-Control', 'public, max-age=3');
            headers.set('Access-Control-Allow-Origin', '*');

            return new Response(resp.body, {
                status: resp.status,
                headers,
            });
        } catch (e) {
            return new Response(
                JSON.stringify({ code: -1, msg: 'API请求失败: ' + e.message }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }
    }

    // /img/flag/* → flagcdn.com
    if (path.startsWith('/img/flag/')) {
        const targetUrl = 'https://flagcdn.com/' + path.replace('/img/flag/', '');
        return proxyImage(targetUrl);
    }

    // /img/crest/* → crests.football-data.org
    if (path.startsWith('/img/crest/')) {
        const targetUrl = 'https://crests.football-data.org/' + path.replace('/img/crest/', '');
        return proxyImage(targetUrl);
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
