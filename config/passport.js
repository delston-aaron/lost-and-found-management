const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const db = require("../db");

module.exports = (passport) => {
    passport.use(new LocalStrategy(
        { usernameField: "email" },
        async (email, password, done) => {
            try {
                const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
                if (users.length === 0) return done(null, false, { message: "No user found" });

                const user = users[0];
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return done(null, false, { message: "Incorrect password" });

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    ));

    passport.serializeUser((user, done) => done(null, user.user_id));
    passport.deserializeUser(async (id, done) => {
        try {
            const [users] = await db.query("SELECT * FROM users WHERE user_id = ?", [id]);
            done(null, users[0]);
        } catch (error) {
            done(error);
        }
    });
};
