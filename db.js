const { LocalStorage } = require('node-localstorage');
const path = require('path');
const bcrypt = require('bcryptjs');

// 数据存储目录（在项目根目录下创建 data 文件夹）
const dataDir = path.join(__dirname, 'data');
const localStorage = new LocalStorage(dataDir);

// ------------------ 工具函数 ------------------
function getData(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function setData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ------------------ 初始化数据 ------------------
// 初始化用户（管理员）
let users = getData('users') || [];
if (!users.find(u => u.username === 'admin')) {
    const adminPass = process.env.ADMIN_PASSWORD || '9x!K#pQ$2wVz';
    const hashed = bcrypt.hashSync(adminPass, 10);
    users.push({ id: 1, username: 'admin', password: hashed, is_admin: 1 });
    setData('users', users);
}

// 初始化匿名用户
let anonymousUsers = getData('anonymous_users') || [];
function getAnonymousUsers() { return getData('anonymous_users') || []; }
function setAnonymousUsers(data) { setData('anonymous_users', data); }

// 初始化反馈
let feedbacks = getData('feedbacks') || [];
function getFeedbacks() { return getData('feedbacks') || []; }
function setFeedbacks(data) { setData('feedbacks', data); }

// 初始化消息
let messages = getData('messages') || [];
function getMessages() { return getData('messages') || []; }
function setMessages(data) { setData('messages', data); }

// ------------------ 导出数据库对象（模拟 SQL 接口） ------------------
const db = {
    // 用户表
    users: {
        get: (sql, params) => {
            // 简单查找：SELECT * FROM users WHERE username = ?
            if (sql.includes('username = ?')) {
                const username = params[0];
                return users.find(u => u.username === username) || null;
            }
            return users;
        },
        run: (sql, params) => {
            // INSERT OR IGNORE
            if (sql.includes('INSERT OR IGNORE')) {
                const username = params[0];
                const password = params[1];
                if (!users.find(u => u.username === username)) {
                    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
                    users.push({ id: newId, username, password, is_admin: 1 });
                    setData('users', users);
                    return { changes: 1 };
                }
                return { changes: 0 };
            }
            return { changes: 0 };
        }
    },
    // 匿名用户表
    anonymous_users: {
        get: (sql, params) => {
            if (sql.includes('uuid = ?')) {
                const uuid = params[0];
                return getAnonymousUsers().find(u => u.uuid === uuid) || null;
            }
            if (sql.includes('nickname = ?')) {
                const nickname = params[0];
                return getAnonymousUsers().find(u => u.nickname === nickname) || null;
            }
            return null;
        },
        run: (sql, params) => {
            if (sql.includes('INSERT INTO')) {
                const uuid = params[0];
                const nickname = params[1];
                const list = getAnonymousUsers();
                if (!list.find(u => u.uuid === uuid)) {
                    list.push({ uuid, nickname, created_at: new Date().toISOString() });
                    setAnonymousUsers(list);
                    return { changes: 1 };
                }
                return { changes: 0 };
            }
            return { changes: 0 };
        }
    },
    // 反馈表
    feedbacks: {
        get: (sql, params) => {
            const list = getFeedbacks();
            if (sql.includes('uuid = ?')) {
                const uuid = params[0];
                return list.filter(f => f.uuid === uuid);
            }
            if (sql.includes('ORDER BY created_at DESC')) {
                return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            return list;
        },
        run: (sql, params) => {
            if (sql.includes('INSERT INTO')) {
                const uuid = params[0];
                const nickname = params[1];
                const type = params[2];
                const title = params[3];
                const content = params[4];
                const list = getFeedbacks();
                const newId = list.length > 0 ? Math.max(...list.map(f => f.id)) + 1 : 1;
                list.push({
                    id: newId,
                    uuid,
                    nickname,
                    type,
                    title,
                    content,
                    status: '待处理',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                setFeedbacks(list);
                return { changes: 1 };
            }
            if (sql.includes('UPDATE')) {
                const status = params[0];
                const id = params[1];
                const list = getFeedbacks();
                const item = list.find(f => f.id === id);
                if (item) {
                    item.status = status;
                    item.updated_at = new Date().toISOString();
                    setFeedbacks(list);
                    return { changes: 1 };
                }
                return { changes: 0 };
            }
            return { changes: 0 };
        }
    },
    // 消息表
    messages: {
        get: (sql, params) => {
            const list = getMessages();
            if (sql.includes('receiver_uuid = ?')) {
                const uuid = params[0];
                return list.filter(m => m.receiver_uuid === uuid).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            return list;
        },
        run: (sql, params) => {
            if (sql.includes('INSERT INTO')) {
                const sender = params[0];
                const receiver_uuid = params[1];
                const receiver_nickname = params[2];
                const content = params[3];
                const list = getMessages();
                const newId = list.length > 0 ? Math.max(...list.map(m => m.id)) + 1 : 1;
                list.push({
                    id: newId,
                    sender,
                    receiver_uuid,
                    receiver_nickname,
                    content,
                    is_read: 0,
                    created_at: new Date().toISOString()
                });
                setMessages(list);
                return { changes: 1 };
            }
            if (sql.includes('DELETE')) {
                const uuid = params[0];
                const list = getMessages().filter(m => m.receiver_uuid !== uuid);
                setMessages(list);
                return { changes: 1 };
            }
            return { changes: 0 };
        }
    },
    // 通用方法
    prepare: (sql) => {
        // 返回一个模拟 statement 对象，拥有 run/get/all 方法
        // 这里简单实现，因为我们的 sql 都是固定模式
        return {
            get: (...params) => {
                // 根据 sql 决定查哪个表
                if (sql.includes('users') && sql.includes('username')) {
                    return db.users.get(sql, params);
                }
                if (sql.includes('anonymous_users')) {
                    return db.anonymous_users.get(sql, params);
                }
                if (sql.includes('feedbacks')) {
                    return db.feedbacks.get(sql, params);
                }
                if (sql.includes('messages')) {
                    return db.messages.get(sql, params);
                }
                return null;
            },
            run: (...params) => {
                if (sql.includes('users')) {
                    return db.users.run(sql, params);
                }
                if (sql.includes('anonymous_users')) {
                    return db.anonymous_users.run(sql, params);
                }
                if (sql.includes('feedbacks')) {
                    return db.feedbacks.run(sql, params);
                }
                if (sql.includes('messages')) {
                    return db.messages.run(sql, params);
                }
                return { changes: 0 };
            },
            all: (...params) => {
                if (sql.includes('feedbacks')) {
                    return db.feedbacks.get(sql, params);
                }
                if (sql.includes('messages')) {
                    return db.messages.get(sql, params);
                }
                return [];
            }
        };
    },
    // exec 方法（用于建表）
    exec: (sql) => {
        // 初始化时不需要建表，因为数据已经通过 localStorage 持久化了
        return;
    }
};

module.exports = db;