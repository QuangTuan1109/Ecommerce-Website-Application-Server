const passport = require('passport')
const JwtStratery = require('passport-jwt').Strategy
const LocalStrategy = require('passport-local').Strategy
const GooglePlusTokenStratery = require('passport-google-plus-token')
const FacebookTokenStratery = require('passport-facebook-token')
const ExtractJwt = require('passport-jwt').ExtractJwt
const bcrypt = require('bcryptjs')

const { JWT_SECRET, Auth } = require('../index');
const User = require('../../app/Model/User/user.Model')

//Passport JWT
passport.use(new JwtStratery({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken('Authorization'),
    secretOrKey: JWT_SECRET
}, async (payload, done) => {
    try {
        const user = await User.findById(payload.sub)

        if (!user) return done(null, false)
        done(null, user)
    } catch (error) {
        done(error, false)
    }
}))

//Passport local
passport.use(new LocalStrategy({
    usernameField: 'Email',
    passwordField: 'Password'
}, async (Email, Password, done) =>{
    try {
        const user = await User.findOne({Email})

        if (!user) return done(null, false)
    
        //Check password    
        const isCorrectPassword = await user.isValidPassword(Password)

        if (!isCorrectPassword){
            return done(null, false)
        }else {
            done(null, user)
        }

    } catch (error) {
        done(error, false)
    }
}))

// //Passport Google
// passport.use(new GooglePlusTokenStratery({
//     clientID: Auth.google.CLIENT_ID,
//     clientSecret: Auth.google.CLIENT_SECRET
// }, async (accessToken, refreshToken, profile, done) => {
//     try {
//        //Check whether this current user exist in  our database.
//         const isExistUser = await User.findOne({
//             AuthGoogleID: profile.id,
//             AuthType: 'google'
//             })

//         if (isExistUser) return done(null, isExistUser)
        
//         //Create new account
//         const newUser = new User({
//             AuthType: 'google',
//             AuthGoogleID: profile.id,
//             Firstname: profile.name.givenName,
//             Lastname: profile.name.familyName,
//             email: profile.emails[0].value,
//         })
//         await newUser.save()
//         done(null, newUser) 

//     } catch (error) {
//         done(error, false)
//     }
// }))

// //Passport facebook
// passport.use(new FacebookTokenStratery({
//     clientID: Auth.facebook.CLIENT_ID,
//     clientSecret: Auth.facebook.CLIENT_SECRET
// }, async (accessToken, refreshToken, profile, done) => {
//     try {
//        //Check whether this current user exist in  our database.
//         const isExistUser = await User.findOne({
//             AuthFacebookID: profile.id,
//             AuthType: 'facebook'
//             })

//         if (isExistUser) return done(null, isExistUser)
        
//         //Create new account
//         const newUser = new User({
//             AuthType: 'facebook',
//             AuthFacebookID: profile.id,
//             Firstname: profile.name.givenName,
//             Lastname: profile.name.familyName,
//             email: profile.emails[0].value,
//         })
//         await newUser.save()
//         done(null, newUser) 

//     } catch (error) {
//         done(error, false)
//     }
// }))