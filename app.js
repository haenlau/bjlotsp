// ==================== 配置 ====================
const CONFIG = {
    // API地址优先级：
    // 1. 如果配置了Worker代理地址，使用Worker（推荐，解决HTTPS/HTTP混合内容问题）
    // 2. 否则直接访问后端服务器
    //
    // 部署Worker后，把下面的 WORKER_URL 改成你的Worker地址
    // 例如: 'https://bjlotsp-api.your-subdomain.workers.dev'
    WORKER_URL: '',  // Worker代理地址，留空则直连后端
    
    // 后端API地址（直连模式，仅限HTTP页面使用）
    API_BASE: 'http://115.190.60.121:8899',
    
    // 自动选择API地址
    get apiBase() {
        // 如果当前页面是HTTPS且配置了Worker，使用Worker
        if (location.protocol === 'https:' && this.WORKER_URL) {
            return this.WORKER_URL;
        }
        return this.API_BASE;
    },
    
    // 更新间隔（毫秒）
    UPDATE_INTERVAL: 60000,
    
    // 玩法名称映射
    GAME_NAMES: {
        200: '胜平负',
        210: '上下盘单双数',
        230: '总进球数',
        240: '半全场胜平负',
        250: '单场比分',
        260: '下半场比分',
        270: '胜负过关'
    },
    
    // SP值标签
    SP_LABELS: {
        200: ['胜', '平', '负'],
        210: ['上盘', '下盘', '单', '双'],
        230: ['0球', '1球', '2球', '3球', '4球', '5球', '6球', '7+球'],
        240: ['胜胜', '胜平', '胜负', '平胜', '平平', '平负', '负胜', '负平', '负负'],
        250: [],  // 动态
        260: [],  // 动态
        270: ['胜', '负']
    }
};

// ==================== 全局状态 ====================
let currentGameId = 200;
let matchesData = [];
let spChart = null;

// ==================== DOM Elements ====================
const elements = {
    tabsWrapper: document.getElementById('tabsWrapper'),
    matchesGrid: document.getElementById('matchesGrid'),
    loading: document.getElementById('loading'),
    emptyState: document.getElementById('emptyState'),
    sectionTitle: document.getElementById('sectionTitle'),
    statusFilter: document.getElementById('statusFilter'),
    updateTime: document.getElementById('updateTime'),
    
    // Stats
    totalMatches: document.getElementById('totalMatches'),
    totalRecords: document.getElementById('totalRecords'),
    
    // Modal
    detailModal: document.getElementById('detailModal'),
    modalClose: document.getElementById('modalClose'),
    modalLeague: document.getElementById('modalLeague'),
    modalTitle: document.getElementById('modalTitle'),
    modalHomeTeam: document.getElementById('modalHomeTeam'),
    modalAwayTeam: document.getElementById('modalAwayTeam'),
    modalScore: document.getElementById('modalScore'),
    modalHandicap: document.getElementById('modalHandicap'),
    modalTime: document.getElementById('modalTime'),
    modalStatus: document.getElementById('modalStatus'),
    modalSpValues: document.getElementById('modalSpValues'),
    spChart: document.getElementById('spChart')
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initEventListeners();
    loadData();
    
    // 定时更新
    setInterval(loadData, CONFIG.UPDATE_INTERVAL);
});

// ==================== 事件监听 ====================
function initEventListeners() {
    // 状态筛选
    elements.statusFilter.addEventListener('change', () => {
        renderMatches();
    });
    
    // 关闭弹窗
    elements.modalClose.addEventListener('click', closeModal);
    elements.detailModal.addEventListener('click', (e) => {
        if (e.target === elements.detailModal) {
            closeModal();
        }
    });
    
    // ESC关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// ==================== 标签切换 ====================
function initTabs() {
    const tabs = elements.tabsWrapper.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有active
            tabs.forEach(t => t.classList.remove('active'));
            // 添加active
            tab.classList.add('active');
            // 切换玩法
            currentGameId = parseInt(tab.dataset.game);
            elements.sectionTitle.textContent = `${CONFIG.GAME_NAMES[currentGameId]} · 即时SP值`;
            // 重新加载数据
            loadData();
        });
    });
}

// ==================== 数据加载 ====================
async function loadData() {
    showLoading();
    
    try {
        // 并行请求
        const [spResponse, statsResponse] = await Promise.all([
            fetch(`${CONFIG.apiBase}/api/sp/latest?game_id=${currentGameId}`),
            fetch(`${CONFIG.apiBase}/api/stats`)
        ]);
        
        const spData = await spResponse.json();
        const statsData = await statsResponse.json();
        
        if (spData.code === 0) {
            matchesData = spData.data || [];
            renderMatches();
        }
        
        if (statsData.code === 0) {
            updateStats(statsData.data);
        }
        
        // 更新时间
        elements.updateTime.textContent = `最后更新: ${new Date().toLocaleTimeString()}`;
        
    } catch (error) {
        console.error('加载数据失败:', error);
        showError('数据加载失败，请检查网络连接');
    }
}

// ==================== 更新统计 ====================
function updateStats(stats) {
    let totalMatches = 0;
    let totalRecords = 0;
    
    Object.values(stats).forEach(game => {
        totalRecords += game.sp_records || 0;
        totalRecords += game.result_records || 0;
    });
    
    // 简单估算场次
    totalMatches = Math.floor(matchesData.length);
    
    elements.totalMatches.textContent = totalMatches;
    elements.totalRecords.textContent = formatNumber(totalRecords);
}

// ==================== 渲染比赛列表 ====================
function renderMatches() {
    const filter = elements.statusFilter.value;
    let filteredData = matchesData;
    
    if (filter !== 'all') {
        filteredData = matchesData.filter(m => m.status === filter);
    }
    
    if (filteredData.length === 0) {
        elements.matchesGrid.innerHTML = '';
        elements.emptyState.style.display = 'block';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.loading.style.display = 'none';
    
    elements.matchesGrid.innerHTML = filteredData.map(match => createMatchCard(match)).join('');
    
    // 绑定点击事件
    document.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => {
            const matchNo = card.dataset.matchNo;
            const match = matchesData.find(m => m.match_no == matchNo);
            if (match) {
                openModal(match);
            }
        });
    });
}

// ==================== 创建比赛卡片 ====================
function createMatchCard(match) {
    const spData = JSON.parse(match.sp_data || '[]');
    const labels = CONFIG.SP_LABELS[currentGameId] || [];
    
    // 根据状态设置样式
    let statusClass = 'status-stopped';
    if (match.status === '销售中') statusClass = 'status-selling';
    else if (match.status === '已开奖') statusClass = 'status-drawn';
    
    // 生成SP值显示
    let spHtml = '';
    if (currentGameId === 250 || currentGameId === 260) {
        // 比分类型只显示部分
        spHtml = spData.slice(0, 4).map((val, i) => `
            <div class="sp-item">
                <span class="sp-label">${val > 0 ? '选项' + (i+1) : '-'}</span>
                <span class="sp-value">${val > 0 ? val.toFixed(2) : '-'}</span>
            </div>
        `).join('');
    } else {
        spHtml = spData.map((val, i) => `
            <div class="sp-item">
                <span class="sp-label">${labels[i] || '选项' + (i+1)}</span>
                <span class="sp-value">${val > 0 ? val.toFixed(2) : '-'}</span>
            </div>
        `).join('');
    }
    
    return `
        <div class="match-card" data-match-no="${match.match_no}">
            <div class="match-card-header">
                <span class="match-league">${match.league || '未知赛事'}</span>
                <span class="match-status ${statusClass}">${match.status || '未知'}</span>
            </div>
            <div class="match-teams">
                <div class="team home">
                    <span class="team-name">${match.host_team || '主队'}</span>
                    <span class="team-label">主队</span>
                </div>
                <div class="match-vs">
                    <span class="vs-text">VS</span>
                    <span class="handicap">让 ${match.handicap || '0'}</span>
                </div>
                <div class="team away">
                    <span class="team-name">${match.guest_team || '客队'}</span>
                    <span class="team-label">客队</span>
                </div>
            </div>
            <div class="match-sp">${spHtml}</div>
            <div class="match-time">场次 ${match.match_no} · ${match.match_time || '-'}</div>
        </div>
    `;
}

// ==================== 打开详情弹窗 ====================
async function openModal(match) {
    const spData = JSON.parse(match.sp_data || '[]');
    const labels = CONFIG.SP_LABELS[currentGameId] || [];
    
    // 填充基本信息
    elements.modalLeague.textContent = match.league || '未知赛事';
    elements.modalTitle.textContent = `场次 ${match.match_no}`;
    elements.modalHomeTeam.textContent = match.host_team || '主队';
    elements.modalAwayTeam.textContent = match.guest_team || '客队';
    elements.modalScore.textContent = match.score || 'VS';
    elements.modalHandicap.textContent = `让球: ${match.handicap || '0'}`;
    elements.modalTime.textContent = match.match_time || '-';
    elements.modalStatus.textContent = match.status || '-';
    
    // 生成SP值网格
    elements.modalSpValues.innerHTML = spData.map((val, i) => `
        <div class="sp-grid-item">
            <span class="sp-grid-label">${labels[i] || '选项' + (i+1)}</span>
            <span class="sp-grid-value">${val > 0 ? val.toFixed(2) : '-'}</span>
        </div>
    `).join('');
    
    // 显示弹窗
    elements.detailModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // 加载SP历史数据
    await loadSpHistory(match);
}

// ==================== 加载SP历史 ====================
async function loadSpHistory(match) {
    try {
        // 获取当前奖期号
        const drawNo = match.draw_no;
        
        const response = await fetch(
            `${CONFIG.apiBase}/api/sp/history?game_id=${currentGameId}&draw_no=${drawNo}&match_no=${match.match_no}&hours=48`
        );
        const data = await response.json();
        
        if (data.code === 0 && data.data.length > 0) {
            renderChart(data.data, match);
        } else {
            // 显示无历史数据提示
            renderEmptyChart();
        }
    } catch (error) {
        console.error('加载SP历史失败:', error);
        renderEmptyChart();
    }
}

// ==================== 渲染图表 ====================
function renderChart(historyData, match) {
    const labels = CONFIG.SP_LABELS[currentGameId] || [];
    
    // 准备数据
    const timestamps = historyData.map(d => {
        const date = new Date(d.scraped_at);
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    });
    
    const spValues = historyData.map(d => JSON.parse(d.sp_data || '[]'));
    
    // 获取有效的SP索引（非零值）
    const validIndices = [];
    if (spValues.length > 0) {
        spValues[0].forEach((val, i) => {
            if (val > 0) {
                validIndices.push(i);
            }
        });
    }
    
    // 准备数据集
    const datasets = validIndices.map((idx, i) => {
        const colors = [
            'rgb(59, 130, 246)',   // 蓝
            'rgb(239, 68, 68)',    // 红
            'rgb(16, 185, 129)',   // 绿
            'rgb(245, 158, 11)',   // 黄
            'rgb(139, 92, 246)',   // 紫
            'rgb(236, 72, 153)',   // 粉
            'rgb(20, 184, 166)',   // 青
            'rgb(249, 115, 22)',   // 橙
            'rgb(99, 102, 241)',   // 靛
        ];
        
        return {
            label: labels[idx] || `选项${idx + 1}`,
            data: spValues.map(sp => sp[idx] || null),
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length] + '20',
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 6
        };
    });
    
    // 销毁旧图表
    if (spChart) {
        spChart.destroy();
    }
    
    // 创建新图表
    spChart = new Chart(elements.spChart, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 10,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// ==================== 空图表 ====================
function renderEmptyChart() {
    if (spChart) {
        spChart.destroy();
    }
    
    spChart = new Chart(elements.spChart, {
        type: 'line',
        data: {
            labels: ['暂无数据'],
            datasets: [{
                label: 'SP值',
                data: [0],
                borderColor: 'rgb(203, 213, 225)',
                backgroundColor: 'rgba(203, 213, 225, 0.1)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// ==================== 关闭弹窗 ====================
function closeModal() {
    elements.detailModal.classList.remove('active');
    document.body.style.overflow = '';
    
    if (spChart) {
        spChart.destroy();
        spChart = null;
    }
}

// ==================== 工具函数 ====================
function showLoading() {
    elements.loading.style.display = 'flex';
    elements.emptyState.style.display = 'none';
}

function showError(message) {
    elements.loading.style.display = 'none';
    elements.matchesGrid.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">⚠️</span>
            <p>${message}</p>
        </div>
    `;
}

function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
}
