// Cloudflare Worker - API代理
// 解决CORS问题，并提供缓存

const API_BASE = 'http://115.190.60.121:8899';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // 处理CORS预检请求
        if (request.method === 'OPTIONS') {
            return handleCors();
        }
        
        // API代理
        if (url.pathname.startsWith('/api/')) {
            return handleApiProxy(request, url);
        }
        
        // 健康检查
        if (url.pathname === '/health') {
            return new Response(JSON.stringify({ status: 'ok', worker: true }), {
                headers: { 'Content-Type': 'application/json', ...getCorsHeaders() }
            });
        }
        
        // 其他请求返回404
        return new Response('Not Found', { status: 404 });
    }
};

// API代理
async function handleApiProxy(request, url) {
    const targetUrl = `${API_BASE}${url.pathname}${url.search}`;
    
    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.text();
        
        return new Response(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                ...getCorsHeaders(),
                'Cache-Control': 'public, max-age=30'  // 缓存30秒
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ 
            code: -1, 
            msg: 'API请求失败: ' + error.message 
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...getCorsHeaders()
            }
        });
    }
}

// CORS头
function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

// 处理CORS预检
function handleCors() {
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders()
    });
}
