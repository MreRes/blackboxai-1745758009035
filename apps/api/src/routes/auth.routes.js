const express = require('express');
const { verifyToken, restrictTo } = require('../middleware/auth');
const {
  register,
  login,
  adminLogin,
  getMe,
  updatePassword
} = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);

// Protected routes
router.use(verifyToken); // All routes below this middleware require authentication

router.get('/me', getMe);
router.patch('/update-password', updatePassword);

// Admin only routes
router.use(restrictTo('ADMIN')); // All routes below this middleware require admin role

module.exports = router;
