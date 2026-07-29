const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const env = require('../../config/env');
const googleAuthService = require('./auth-google.service');

passport.use(new GoogleStrategy({
  clientID: env.googleClientId,
  clientSecret: env.googleClientSecret,
  callbackURL: env.googleCallbackUrl,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const result = await googleAuthService.findOrCreateGoogleUser(profile);
    done(null, result);
  } catch (err) {
    done(err, null);
  }
}));

function authenticateGoogle(req, res, next) {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
}

function authenticateGoogleCallback(req, res, next) {
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${env.clientUrl}/login?error=google_auth_failed`,
  }, (err, result) => {
    if (err) {
      return res.redirect(`${env.clientUrl}/login?error=google_auth_failed`);
    }
    if (!result) {
      return res.redirect(`${env.clientUrl}/login?error=no_user`);
    }

    const redirectUrl = result.isNew
      ? `${env.clientUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&newUser=true`
      : `${env.clientUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;

    res.redirect(redirectUrl);
  })(req, res, next);
}

module.exports = { authenticateGoogle, authenticateGoogleCallback };
