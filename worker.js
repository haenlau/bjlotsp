// Cloudflare Worker - 北京体彩API代理
// 解决HTTPS页面访问HTTP API的混合内容问题

const API_BASE = 'http://115.190.60.121:8899';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // 处理CORS预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: getCorsHeaders()
            });
        }
        
        // 健康检查
        if (url.pathname === '/' || url.pathname === '/health') {
            return jsonResponse({ status: 'ok', worker: true, api: API_BASE });
        }
        
        // API代理 - 转发所有 /api/ 请求
        if (url.pathname.startsWith('/api/')) {
            const targetUrl = `${API_BASE}${url.pathname}${url.search}`;
            
            try {
                const resp = await fetch(targetUrl, {
                    method: request.method,
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const body = await resp.text();
                
                return new Response(body, {
                    status: resp.status,
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        ...getCorsHeaders(),
                        'Cache-Control': 'public, max-age=10'
                    }
                });
            } catch (err) {
                return jsonResponse({ code: -1, msg: 'API请求失败: ' + err.message }, 502);
            }
        }
        
        return jsonResponse({ code: -1, msg: 'Not Found' }, 404);
    }
};

function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...getCorsHeaders()
        }
    });
}
