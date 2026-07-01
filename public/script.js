// ==================== 工具函数 & 全局变量 ====================
const API_BASE = '/api';

// 获取或生成匿名用户UUID
let myUuid = localStorage.getItem('ab_uuid');
if (!myUuid) {
    myUuid = crypto.randomUUID ? crypto.randomUUID() : 'uuid' + Date.now() + Math.random().toString(36);
    localStorage.setItem('ab_uuid', myUuid);
}
let myNickname = localStorage.getItem('ab_nickname') || '';

// ==================== 页面切换 ====================
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active', 'fade-out');
        p.classList.add('hidden');
    });
    const target = document.getElementById(pageId + '-page');
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
        if (pageId === 'my') {
            loadMyFeedbacks();
            loadMessages();
        }
        if (pageId === 'admin') {
            loadAdminFeedbacks();
        }
    }
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector(`.nav-links a[data-page="${pageId}"]`);
    if (link) link.classList.add('active');
}

// 禁止右键查看源代码
document.oncontextmenu = function() { return false; };

// ==================== 轮播图 ====================
let currentIndex = 0;
let slideInterval;

function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicatorsContainer = document.getElementById('indicators');
    if (!slides.length || !indicatorsContainer) return;

    indicatorsContainer.innerHTML = '';
    slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.classList.add('indicator');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            clearInterval(slideInterval);
            goToSlide(i);
            startAutoPlay();
        });
        indicatorsContainer.appendChild(dot);
    });

    function goToSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === index) slide.classList.add('active');
        });
        document.querySelectorAll('.indicator').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentIndex = index;
    }

    function nextSlide() {
        goToSlide((currentIndex + 1) % slides.length);
    }

    function startAutoPlay() {
        slideInterval = setInterval(nextSlide, 5000);
    }

    goToSlide(0);
    startAutoPlay();
}

// ==================== 版本切换（首页） ====================
function initVersionTabs() {
    document.querySelectorAll('.version-tab[data-version]').forEach(tab => {
        tab.addEventListener('click', function() {
            const version = this.dataset.version;
            const cppPanel = document.getElementById('cpp-panel');
            const guiPanel = document.getElementById('gui-panel');
            const cppTab = document.querySelector('.version-tab[data-version="cpp"]');
            const guiTab = document.querySelector('.version-tab[data-version="gui"]');
            if (version === 'cpp') {
                cppPanel.classList.add('active');
                guiPanel.classList.remove('active');
                cppTab.classList.add('active');
                guiTab.classList.remove('active');
            } else {
                guiPanel.classList.add('active');
                cppPanel.classList.remove('active');
                guiTab.classList.add('active');
                cppTab.classList.remove('active');
            }
        });
    });
}

// ==================== 更新日志版本切换 ====================
function initChangelogTabs() {
    document.querySelectorAll('.version-tab[data-changelog]').forEach(tab => {
        tab.addEventListener('click', function() {
            const version = this.dataset.changelog;
            const cppPanel = document.getElementById('changelog-cpp');
            const guiPanel = document.getElementById('changelog-gui');
            const cppTab = document.querySelector('.version-tab[data-changelog="cpp"]');
            const guiTab = document.querySelector('.version-tab[data-changelog="gui"]');
            if (version === 'cpp') {
                cppPanel.classList.add('active');
                guiPanel.classList.remove('active');
                cppTab.classList.add('active');
                guiTab.classList.remove('active');
            } else {
                guiPanel.classList.add('active');
                cppPanel.classList.remove('active');
                guiTab.classList.add('active');
                cppTab.classList.remove('active');
            }
        });
    });
}

// ==================== 导航点击 ====================
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        if (page) switchPage(page);
    });
});

// ==================== 反馈提交 ====================
// 反馈标签切换
document.querySelectorAll('.feedback-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.feedback-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const type = this.dataset.type;
        const form = document.getElementById('feedback-form');
        const virusArea = document.getElementById('virusSubmitArea');
        if (type === 'virus') {
            form.style.display = 'none';
            virusArea.style.display = 'block';
        } else {
            form.style.display = 'block';
            virusArea.style.display = 'none';
            form.dataset.type = type;
        }
    });
});
// 默认激活第一个（病毒库）
document.querySelector('.feedback-tab[data-type="virus"]').click();

// 提交反馈
document.getElementById('submitFeedback').addEventListener('click', async function() {
    const title = document.getElementById('feedbackTitle').value.trim();
    const content = document.getElementById('feedbackContent').value.trim();
    const type = document.getElementById('feedback-form').dataset.type || 'bug';
    if (!title || !content) {
        alert('请填写完整信息');
        return;
    }
    if (!myNickname) {
        alert('请先在“我的”页面设置昵称');
        return;
    }
    const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: myUuid, nickname: myNickname, type, title, content })
    });
    const data = await res.json();
    if (data.success) {
        alert('反馈已提交，感谢您的反馈！');
        document.getElementById('feedbackTitle').value = '';
        document.getElementById('feedbackContent').value = '';
    } else {
        alert('提交失败：' + (data.error || '未知错误'));
    }
});

// ==================== 设置昵称 ====================
document.getElementById('setNicknameBtn').addEventListener('click', async function() {
    const nickname = document.getElementById('nicknameInput').value.trim();
    if (!nickname) { alert('请输入昵称'); return; }
    const res = await fetch(`${API_BASE}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: myUuid, nickname })
    });
    const data = await res.json();
    if (data.success) {
        myNickname = nickname;
        localStorage.setItem('ab_nickname', nickname);
        document.getElementById('nicknameDisplay').textContent = nickname;
        document.getElementById('nicknameInput').disabled = true;
        document.getElementById('setNicknameBtn').disabled = true;
        alert('昵称设置成功！');
    } else {
        alert('设置失败：' + (data.error || ''));
    }
});

// 加载已有昵称
if (myNickname) {
    document.getElementById('nicknameDisplay').textContent = myNickname;
    document.getElementById('nicknameInput').disabled = true;
    document.getElementById('setNicknameBtn').disabled = true;
}

// ==================== 加载我的反馈 ====================
async function loadMyFeedbacks() {
    const container = document.getElementById('feedbackList');
    try {
        const res = await fetch(`${API_BASE}/feedbacks/${myUuid}`);
        const feedbacks = await res.json();
        container.innerHTML = '';
        if (feedbacks.length === 0) {
            container.innerHTML = '<p style="color:#888;">暂无反馈记录</p>';
            return;
        }
        feedbacks.forEach(f => {
            const div = document.createElement('div');
            div.className = 'feedback-item';
            const statusMap = {
                '待处理': 'pending',
                '正在验证': 'verifying',
                '正在改进': 'improving',
                '改进中...': 'improving',
                '找不到问题': 'notfound',
                '已完成改进': 'done'
            };
            const statusClass = statusMap[f.status] || 'pending';
            const spinHtml = (f.status === '正在验证' || f.status === '正在改进' || f.status === '改进中...')
                ? '<span class="spinner"></span>'
                : '';
            div.innerHTML = `
                <strong>${f.title}</strong>
                <span class="status ${statusClass}">${f.status} ${spinHtml}</span>
                <br><small>类型：${f.type === 'virus' ? '病毒库' : f.type === 'bug' ? 'BUG' : '建议'}</small>
                <p style="margin:6px 0;">${f.content}</p>
                <small>${new Date(f.created_at).toLocaleString()}</small>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = '<p style="color:red;">加载失败，请稍后重试</p>';
    }
}

// ==================== 登录 ====================
function showLogin() {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('loginError').style.display = 'none';
}
function closeLogin() {
    document.getElementById('loginModal').classList.add('hidden');
}
async function login() {
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
        closeLogin();
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline';
        document.getElementById('messageBadge').style.display = 'inline';
        document.getElementById('adminNavLink').style.display = 'inline';
        alert('登录成功！');
        // 如果当前在后台页面，刷新数据
        if (!document.getElementById('admin-page').classList.contains('hidden')) {
            loadAdminFeedbacks();
        }
        checkUnreadMessages();
    } else {
        document.getElementById('loginError').textContent = data.error;
        document.getElementById('loginError').style.display = 'block';
    }
}
async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    document.getElementById('loginBtn').style.display = 'inline';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('messageBadge').style.display = 'none';
    document.getElementById('adminNavLink').style.display = 'none';
    alert('已退出');
    // 如果当前在后台页面，跳转到首页
    if (!document.getElementById('admin-page').classList.contains('hidden')) {
        switchPage('home');
    }
}

// ==================== 消息 ====================
let myMessages = [];

async function loadMessages() {
    try {
        const res = await fetch(`${API_BASE}/messages/${myUuid}`);
        const msgs = await res.json();
        myMessages = msgs;
        updateMessageBadge(msgs);
        if (!document.getElementById('messageModal').classList.contains('hidden')) {
            renderMessages(msgs);
        }
    } catch (e) {}
}

function updateMessageBadge(msgs) {
    const unread = msgs.filter(m => !m.is_read).length;
    const badge = document.getElementById('messageBadge');
    if (unread > 0) {
        badge.classList.add('has-unread');
        badge.title = `${unread}条未读消息`;
    } else {
        badge.classList.remove('has-unread');
    }
}

function renderMessages(msgs) {
    const container = document.getElementById('messageList');
    container.innerHTML = '';
    if (msgs.length === 0) {
        container.innerHTML = '<p style="color:#888;">暂无消息</p>';
        return;
    }
    msgs.forEach(m => {
        const div = document.createElement('div');
        div.className = 'feedback-item';
        div.innerHTML = `
            <strong>来自 ${m.sender}</strong>
            <p>${m.content}</p>
            <small>${new Date(m.created_at).toLocaleString()}</small>
        `;
        container.appendChild(div);
    });
}

function checkUnreadMessages() {
    // 已通过轮询处理
}

// 点击消息图标
document.getElementById('messageBadge').addEventListener('click', function() {
    document.getElementById('messageModal').classList.remove('hidden');
    renderMessages(myMessages);
});

function closeMessageModal() {
    document.getElementById('messageModal').classList.add('hidden');
}

async function clearMessages() {
    if (!confirm('确定清空所有消息？')) return;
    await fetch(`${API_BASE}/messages/${myUuid}`, { method: 'DELETE' });
    loadMessages();
    closeMessageModal();
}

// ==================== 登录状态检查 ====================
async function checkLoginStatus() {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    const adminLink = document.getElementById('adminNavLink');
    if (data.loggedIn) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline';
        document.getElementById('messageBadge').style.display = 'inline';
        if (adminLink) adminLink.style.display = 'inline';
    } else {
        document.getElementById('loginBtn').style.display = 'inline';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('messageBadge').style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
}

// ==================== 管理员后台 ====================
async function loadAdminFeedbacks() {
    const tbody = document.getElementById('admin-feedback-body');
    try {
        const res = await fetch('/api/admin/feedbacks');
        if (!res.ok) {
            if (res.status === 403) {
                tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:#d32f2f;">请先登录管理员账号</td></tr>`;
            } else {
                throw new Error('加载失败');
            }
            return;
        }
        const list = await res.json();
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:#888;">暂无反馈</td></tr>`;
            return;
        }
        tbody.innerHTML = '';
        list.forEach(f => {
            const statusMap = {
                '待处理': 'pending',
                '正在验证': 'verifying',
                '正在改进': 'improving',
                '改进中...': 'improving',
                '找不到问题': 'notfound',
                '已完成改进': 'done'
            };
            const statusClass = statusMap[f.status] || 'pending';
            const typeMap = { 'virus': '病毒库', 'bug': 'BUG', 'suggestion': '建议' };
            const typeLabel = typeMap[f.type] || f.type;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:12px 15px;">${f.id}</td>
                <td style="padding:12px 15px;">${f.nickname}</td>
                <td style="padding:12px 15px;"><span style="background:#eef2f6;padding:2px 10px;border-radius:12px;font-size:12px;">${typeLabel}</span></td>
                <td style="padding:12px 15px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${f.title}">${f.title}</td>
                <td style="padding:12px 15px;"><span class="status ${statusClass}">${f.status}</span></td>
                <td style="padding:12px 15px;">
                    <select onchange="updateFeedbackStatus(${f.id}, this.value)" style="padding:4px 8px; border-radius:4px; border:1px solid #ccc; background:white; font-size:13px;">
                        ${['待处理','正在验证','正在改进','改进中...','找不到问题','已完成改进'].map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:red;">加载失败：${e.message}</td></tr>`;
    }
}

// 更新反馈状态
async function updateFeedbackStatus(id, newStatus) {
    try {
        const res = await fetch(`/api/admin/feedback/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            loadAdminFeedbacks();
            if (!document.getElementById('my-page').classList.contains('hidden')) {
                loadMyFeedbacks();
            }
        } else {
            alert('更新失败：' + (data.error || '未知错误'));
        }
    } catch (e) {
        alert('网络错误，请重试');
    }
}

// ==================== 初始化 ====================
window.onload = function() {
    initCarousel();
    initVersionTabs();
    initChangelogTabs();
    checkLoginStatus();
    if (myUuid) {
        loadMessages();
    }
    // 轮询消息（每10秒）
    setInterval(() => {
        if (myUuid) loadMessages();
    }, 10000);
};