import passport from 'passport';
import JwtStrategy from 'passport-jwt';
import LocalStrategy from 'passport-local';
// import GooglePlusTokenStrategy from 'passport-google-plus-token';
// import FacebookTokenStrategy from 'passport-facebook-token';
import { ExtractJwt } from 'passport-jwt';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../index.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`
import User from '../../app/Model/user.Model.js'; // Đảm bảo đường dẫn đúng và phần mở rộng `.js`

// Passport JWT
passport.use(new JwtStrategy.Strategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken('Authorization'),
    secretOrKey: JWT_SECRET
}, async (payload, done) => {
    try {
        const user = await User.findById(payload.sub);

        if (!user) return done(null, false);
        done(null, user);
    } catch (error) {
        done(error, false);
    }
}));

// Passport Local
passport.use(new LocalStrategy.Strategy({
    usernameField: 'Email',
    passwordField: 'Password'
}, async (Email, Password, done) =>{
    try {
        const user = await User.findOne({Email});

        if (!user) return done(null, false);

        // Check password    
        const isCorrectPassword = await user.isValidPassword(Password);

        if (!isCorrectPassword){
            return done(null, false);
        } else {
            done(null, user);
        }
    } catch (error) {
        done(error, false);
    }
}));

// // Passport Google
// passport.use(new GooglePlusTokenStrategy({
//     clientID: Auth.google.CLIENT_ID,
//     clientSecret: Auth.google.CLIENT_SECRET
// }, async (accessToken, refreshToken, profile, done) => {
//     try {
//         // Check whether this current user exists in our database.
//         const isExistUser = await User.findOne({
//             AuthGoogleID: profile.id,
//             AuthType: 'google'
//         });

//         if (isExistUser) return done(null, isExistUser);
        
//         // Create new account
//         const newUser = new User({
//             AuthType: 'google',
//             AuthGoogleID: profile.id,
//             Firstname: profile.name.givenName,
//             Lastname: profile.name.familyName,
//             email: profile.emails[0].value,
//         });
//         await newUser.save();
//         done(null, newUser);
//     } catch (error) {
//         done(error, false);
//     }
// }));

// // Passport Facebook
// passport.use(new FacebookTokenStrategy({
//     clientID: Auth.facebook.CLIENT_ID,
//     clientSecret: Auth.facebook.CLIENT_SECRET
// }, async (accessToken, refreshToken, profile, done) => {
//     try {
//         // Check whether this current user exists in our database.
//         const isExistUser = await User.findOne({
//             AuthFacebookID: profile.id,
//             AuthType: 'facebook'
//         });

//         if (isExistUser) return done(null, isExistUser);
        
//         // Create new account
//         const newUser = new User({
//             AuthType: 'facebook',
//             AuthFacebookID: profile.id,
//             Firstname: profile.name.givenName,
//             Lastname: profile.name.familyName,
//             email: profile.emails[0].value,
//         });
//         await newUser.save();
//         done(null, newUser);
//     } catch (error) {
//         done(error, false);
//     }
// }));

export default passport;
