const User = require('../../Model/User/user.Model');
// const db = require('../../Model')
// const ROLES = db.ROLES;
const Roles = require('../../Model/User/role.Model')

function a(req, res) {
    const newUser = new User({Fullname: 'Tuan'});
    newUser.save();
    console.log(newUser);
}

module.exports= {
    a
}