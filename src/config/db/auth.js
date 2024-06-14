import jwt from 'jsonwebtoken';
import User from '../../app/Model/user.Model.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import Role from '../../app/Model/role.Model.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import { JWT_SECRET } from '../index.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`

const verifyToken = (req, res, next) => {
    let token = req.header("Authorization");

    if (!token) {
        return res.status(403).send({ message: "No token provided!" });
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized!" });
        }
        req.userId = decoded.sub;
        next();
    });
};

const isAdmin = (req, res, next) => {
    User.findById(req.userId).exec((err, user) => {
        if (err) {
            res.status(500).send({
                message: err
            });
            return;
        }
        Role.find({
            _id: {
                $in: user.Role[0]
            }
        }, (err, roles) => {
            if (err) {
                res.status(500).send({
                    message: err
                });
                return;
            }
            if (roles[0].name === "admin"){
                next();
                return;
            }

            res.status(403).send({
                message: "Require admin role!!"
            });
        });
    });
};

const isSeller = (req, res, next) => {
    User.findById(req.userId).exec((err, user) => {
        if (err) {
            res.status(500).send({
                message: err
            });
            return;
        }

        Role.find({
            _id: {
                $in: user.Role[1]
            }
        }, (err, roles) => {
            if (err) {
                res.status(500).send({
                    message: err
                });
                return;
            }
            if (roles[0].name === "seller"){
                next();
                return;
            }

            res.status(403).send({
                message: "Require seller role!!"
            });
        });
    });
};

export { verifyToken, isAdmin, isSeller };
