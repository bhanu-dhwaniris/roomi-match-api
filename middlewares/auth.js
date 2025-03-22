const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        console.log(req.headers.origin);
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.Unauthorized({}, 'Authentication required');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.userId, isDeleted: false });

        if (!user) {
            return res.BadRequest({}, 'User not found');
        }

        req.user = user;
        next();
    } catch (error) {
        return res.BadRequest({}, 'Invalid token');
    }
};

module.exports = auth; 