import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "./database";

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = process.env.GOOGLE_CALLBACK_URL;

if (!clientID || !clientSecret || !callbackURL) {
  throw new Error("Google OAuth configuration is missing");
}

passport.use(
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(
            new Error("Google account does not provide an email")
          );
        }

        const name =
          profile.displayName ||
          profile.name?.givenName ||
          "Google User";

        const avatarUrl =
          profile.photos?.[0]?.value || null;

        let user = await prisma.user.findUnique({
          where: {
            googleId: profile.id,
          },
        });

        if (!user) {
          user = await prisma.user.findUnique({
            where: {
              email,
            },
          });
        }

        if (user) {
          user = await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              googleId: profile.id,
              email,
              name,
              avatarUrl,
            },
          });
        } else {
          user = await prisma.user.create({
            data: {
              googleId: profile.id,
              email,
              name,
              avatarUrl,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

export default passport;