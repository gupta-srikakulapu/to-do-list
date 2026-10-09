const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Check Authorization Header (Bearer token)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to req.user (excluding password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user no longer exists'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(`[Auth Middleware Error] ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token invalid or expired'
    });
  }
};

module.exports = { protect };
