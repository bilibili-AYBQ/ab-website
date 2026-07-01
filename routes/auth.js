const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  req.session.user = { id: user.id, username: user.username, isAdmin: true };
  res.json({ success: true, username: user.username });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/status', (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
    res.json({ loggedIn: true, username: req.session.user.username });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;