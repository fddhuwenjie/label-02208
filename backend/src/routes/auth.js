const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, queryOne, run } = require('../database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = queryOne('SELECT id, username, role, name, department FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 修改密码
router.post('/change-password', authenticateToken, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(400).json({ message: '原密码错误' });
    }

    // 密码复杂度验证
    if (newPassword.length < 8) {
      return res.status(400).json({ message: '密码长度至少8位' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新个人信息
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, department } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: '姓名不能为空' });
    }

    run('UPDATE users SET name = ?, department = ? WHERE id = ?', 
      [name, department, req.user.id]);

    res.json({ message: '个人信息更新成功' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
