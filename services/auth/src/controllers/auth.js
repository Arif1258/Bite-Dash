import User from "../model/User.js";
import jwt from "jsonwebtoken";
import TryCatch from "../middlewares/trycatch.js";
import { oauth2client } from "../config/googleConfig.js";
import axios from "axios";
import { hashPassword, verifyPassword } from "../utils/password.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const issueToken = (user) => jwt.sign({ user }, process.env.JWT_SEC, { expiresIn: "15d" });

const validateCredentials = ({ name, email, password }, needsName = false) => {
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanName = typeof name === "string" ? name.trim() : "";
  if ((needsName && (cleanName.length < 2 || cleanName.length > 100)) || !emailPattern.test(cleanEmail) || typeof password !== "string" || password.length < 8 || password.length > 128) return null;
  return { name: cleanName, email: cleanEmail, password };
};

const sendAuthenticatedUser = (res, user, message) => {
  const safeUser = user.toObject ? user.toObject() : user;
  delete safeUser.passwordHash;
  res.status(200).json({ message, token: issueToken(safeUser), user: safeUser });
};

export const signupUser = TryCatch(async (req, res) => {
  const credentials = validateCredentials(req.body, true);
  if (!credentials) return res.status(400).json({ message: "Name, a valid email, and a password of 8-128 characters are required" });
  if (await User.exists({ email: credentials.email })) return res.status(409).json({ message: "An account with this email already exists" });
  const user = await User.create({ name: credentials.name, email: credentials.email, passwordHash: await hashPassword(credentials.password) });
  return sendAuthenticatedUser(res, user, "Account created successfully");
});

export const loginUser = TryCatch(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    const credentials = validateCredentials(req.body);
    if (!credentials) return res.status(400).json({ message: "Valid email and password are required" });
    const user = await User.findOne({ email: credentials.email }).select("+passwordHash");
    if (!user || !user.passwordHash || !(await verifyPassword(credentials.password, user.passwordHash))) return res.status(401).json({ message: "Invalid email or password" });
    return sendAuthenticatedUser(res, user, "Logged in successfully");
  }

  const googleRes = await oauth2client.getToken(code);

  oauth2client.setCredentials(googleRes.tokens);

  const userRes = await axios.get(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`,
  );
  const { email, name, picture } = userRes.data;

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      image: picture,
    });
  }

  return sendAuthenticatedUser(res, user, "Logged in successfully");
});

const allowedRoles = ["customer", "rider", "seller"];

export const addUserRole = TryCatch(async (req, res) => {
  if (!req.user?._id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { role } = req.body;

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      message: "Invalid role",
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { role },
    { new: true },
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  return sendAuthenticatedUser(res, user, "Role updated successfully");
});

export const myProfile = TryCatch(async (req, res) => {
  const user = req.user;
  res.json(user);
});
