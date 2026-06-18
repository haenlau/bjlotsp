// Cloudflare Pages Function - 图片代理
// [[catchall]].ts 拦截所有请求，只代理 /img/* 路径

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const path = url.pathname;

    // 只处理 /img/ 开头的请求
    if (!path.startsWith('/img/')) {
        return context.next();
    }

    const rest = path.replace('/img/', '');

    let targetUrl;
    if (rest.startsWith('flag/')) {
        // /img/flag/w40/cn.png → flagcdn.com/w40/cn.png
        targetUrl = 'https://flagcdn.com/' + rest.replace('flag/', '');
    } else if (rest.startsWith('crest/')) {
        // /img/crest/57.png → crests.football-data.org/57.png
        targetUrl = 'https://crests.football-data.org/' + rest.replace('crest/', '');
    } else {
        return new Response('Not Found', { status: 404 });
    }

    try {
        const resp = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            cf: { cacheTtl: 604800, cacheEverything: true },
        });

        if (!resp.ok) {
            return new Response(null, { status: resp.status });
        }

        const headers = new Headers(resp.headers);
        headers.set('Cache-Control', 'public, max-age=604800');
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(resp.body, {
            status: resp.status,
            headers,
        });
    } catch (e) {
        return new Response(null, { status: 502 });
    }
}
