const jwt = require('jsonwebtoken');
const User = require("../models/User");
function auth(request, response, next) {
    const token = request.headers.authorization;

    
    if (!token) return response.status(401).send('Access Denied');

    try {
        const verified = jwt.verify(token, process.env.TOKEN_SECRET);
        next();
    } catch (err) {
        return response.status(400).send('Invalid Token');
    }
}


async function cookieAuth(req, res, next) {
    if(!req.headers.cookie) {
        return res.redirect("/login")
    }
    const token = req.headers.cookie.replace("token_id=","");
    if (!token) return res.status(401).send('Access Denied').redirect("/login");

    try {
        const user = await User.findOne({ _id: token });
        if(!user) {
            return res.status(400)
            .clearCookie("token_id")
            .redirect("/login");
        }
        next();
    } catch (err) {
        return res.status(400).send('Invalid Token').redirect("/login");
    }
}
module.exports = {
    auth,
    cookieAuth
};
