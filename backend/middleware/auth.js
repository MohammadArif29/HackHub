const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        console.log('Auth middleware - headers:', req.headers);
        console.log('Auth middleware - cookies:', req.cookies);

        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            console.log('No token found');
            return res.redirect('/pages/login.html');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.redirect('/pages/login.html');
    }
}; 