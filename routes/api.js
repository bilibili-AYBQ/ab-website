const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router();

// ------------------ 匿名用户 ---------------
router.post('/user/register', (req, res) => {
  const { uuid, nickname } = req.body;
  if (!uuid || !nickname) return res.status(400).json({ error: '缺少参数' });
  // 检查是否已存在该uuid
  const exist = db.prepare('SELECT * FROM anonymous_users WHERE uuid = ?').get(uuid);
  if (exist) {
    // 已存在则不允许再改昵称（除非昵称相同）
    if (exist.nickname !== nickname) {
      return res.status(403).json({ error: '昵称已设置，无法更改' });
    }
    return res.json({ success: true, nickname: exist.nickname });
  }
  // 检查昵称是否被占用
  const nickUsed = db.prepare('SELECT * FROM anonymous_users WHERE nickname = ?').get(nickname);
  if (nickUsed) {
    return res.status(409).json({ error: '该昵称已被使用' });
  }
  const stmt = db.prepare('INSERT INTO anonymous_users (uuid, nickname) VALUES (?, ?)');
  stmt.run(uuid, nickname);
  res.json({ success: true, nickname });
});

// 获取用户信息（通过uuid）
router.get('/user/:uuid', (req, res) => {
  const stmt = db.prepare('SELECT uuid, nickname FROM anonymous_users WHERE uuid = ?');
  const user = stmt.get(req.params.uuid);
  if (user) res.json(user);
  else res.status(404).json({ error: '用户不存在' });
});

// ------------------ 反馈 ---------------
router.post('/feedback', (req, res) => {
  const { uuid, nickname, type, title, content } = req.body;
  if (!uuid || !nickname || !type || !title || !content) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  // 验证用户存在
  const user = db.prepare('SELECT * FROM anonymous_users WHERE uuid = ?').get(uuid);
  if (!user) {
    return res.status(404).json({ error: '用户未注册' });
  }
  const stmt = db.prepare(`
    INSERT INTO feedbacks (uuid, nickname, type, title, content)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(uuid, nickname, type, title, content);
  res.json({ success: true, message: '反馈已提交' });
});

// 获取某个用户的所有反馈
router.get('/feedbacks/:uuid', (req, res) => {
  const stmt = db.prepare('SELECT * FROM feedbacks WHERE uuid = ? ORDER BY created_at DESC');
  const rows = stmt.all(req.params.uuid);
  res.json(rows);
});

// 管理员获取所有反馈（需登录）
router.get('/admin/feedbacks', (req, res) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  const stmt = db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC');
  const rows = stmt.all();
  res.json(rows);
});

// 更新反馈状态（管理员）
router.put('/admin/feedback/:id', (req, res) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  const { status } = req.body;
  const validStatus = ['待处理', '正在验证', '正在改进', '改进中...', '找不到问题', '已完成改进'];
  if (!validStatus.includes(status)) {
    return res.status(400).json({ error: '无效的状态' });
  }
  const stmt = db.prepare('UPDATE feedbacks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const info = stmt.run(status, req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '反馈不存在' });
  }
  res.json({ success: true });
});

// ------------------ 消息 ---------------
// 发送消息（管理员）
router.post('/admin/message', (req, res) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  const { receiver_nickname, content } = req.body;
  if (!receiver_nickname || !content) {
    return res.status(400).json({ error: '缺少接收者昵称或内容' });
  }
  // 查找该昵称对应的最新用户（取最近注册的，或者按唯一昵称）
  const user = db.prepare('SELECT uuid, nickname FROM anonymous_users WHERE nickname = ? ORDER BY created_at DESC LIMIT 1').get(receiver_nickname);
  if (!user) {
    return res.status(404).json({ error: '未找到该昵称的用户' });
  }
  const stmt = db.prepare(`
    INSERT INTO messages (sender, receiver_uuid, receiver_nickname, content)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(req.session.user.username, user.uuid, user.nickname, content);
  res.json({ success: true, message: '消息已发送' });
});

// 获取某个用户的消息
router.get('/messages/:uuid', (req, res) => {
  const stmt = db.prepare('SELECT * FROM messages WHERE receiver_uuid = ? ORDER BY created_at DESC');
  const rows = stmt.all(req.params.uuid);
  res.json(rows);
});

// 清空某个用户的消息
router.delete('/messages/:uuid', (req, res) => {
  const stmt = db.prepare('DELETE FROM messages WHERE receiver_uuid = ?');
  stmt.run(req.params.uuid);
  res.json({ success: true });
});

// 标记消息为已读（可选）
router.put('/message/:id/read', (req, res) => {
  const stmt = db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

module.exports = router;