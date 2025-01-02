import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/user.model.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_AUTH_REDIRECT,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            fullName: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
            username: profile.emails[0].value.split("@")[0],
            refreshToken: refreshToken,
          });
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);
