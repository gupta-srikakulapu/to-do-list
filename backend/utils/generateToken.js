const jwt = require('jsonwebtoken');

/**
 * Generate JWT and set HTTP-only cookie on response
 * @param {Object} res - Express response object
 * @param {string} userId - User ID to sign in token payload
 * @returns {string} token - Generated JWT string
 */
const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res.cookie('token', token, cookieOptions);

  return token;
};

module.exports = generateTokenAndSetCookie;
