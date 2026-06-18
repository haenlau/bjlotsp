// Cloudflare Pages Function - 图片代理
// /img/flag/w40/cn.png → flagcdn.com
// /img/crest/57.png → crests.football-data.org

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const parts = url.pathname.replace('/img/', '').split('/');
    const source = parts[0]; // flag or crest

    let targetUrl;
    if (source === 'flag') {
        // /img/flag/w40/cn.png → https://flagcdn.com/w40/cn.png
        const rest = parts.slice(1).join('/');
        targetUrl = `https://flagcdn.com/${rest}`;
    } else if (source === 'crest') {
        // /img/crest/57.png → https://crests.football-data.org/57.png
        const rest = parts.slice(1).join('/');
        targetUrl = `https://crests.football-data.org/${rest}`;
    } else {
        return new Response('Not Found', { status: 404 });
    }

    try {
        const resp = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        if (!resp.ok) {
            return new Response(null, { status: resp.status });
        }

        // 转发响应，加缓存头
        const headers = new Headers(resp.headers);
        headers.set('Cache-Control', 'public, max-age=604800'); // 缓存7天
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(resp.body, {
            status: resp.status,
            headers,
        });
    } catch (e) {
        return new Response(null, { status: 502 });
    }
}
