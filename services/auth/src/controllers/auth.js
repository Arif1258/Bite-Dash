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

const normalizeRole = (role) => {
  if (!role) return null;
  const r = role.toLowerCase().trim();
  if (r === "restaurant" || r === "seller") return "seller";
  if (r === "rider") return "rider";
  if (r === "customer") return "customer";
  return null;
};

const getRoleDisplayName = (r) => {
  if (r === "seller" || r === "restaurant") return "Restaurant";
  if (r === "rider") return "Rider";
  return "Customer";
};

export const signupUser = TryCatch(async (req, res) => {
  const credentials = validateCredentials(req.body, true);
  if (!credentials) return res.status(400).json({ message: "Name, a valid email, and a password of 8-128 characters are required" });
  if (await User.exists({ email: credentials.email })) return res.status(409).json({ message: "An account with this email already exists" });

  const assignedRole = normalizeRole(req.body.role) || "customer";

  const user = await User.create({
    name: credentials.name,
    email: credentials.email,
    passwordHash: await hashPassword(credentials.password),
    role: assignedRole,
  });

  return sendAuthenticatedUser(res, user, `Account created successfully as ${getRoleDisplayName(assignedRole)}`);
});

export const loginUser = TryCatch(async (req, res) => {
  const { code, role: requestedRole } = req.body;
  const targetRole = normalizeRole(requestedRole);

  if (!code) {
    const credentials = validateCredentials(req.body);
    if (!credentials) return res.status(400).json({ message: "Valid email and password are required" });
    const user = await User.findOne({ email: credentials.email }).select("+passwordHash");
    if (!user || !user.passwordHash || !(await verifyPassword(credentials.password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Assign role if user has no role yet
    if (!user.role && targetRole) {
      user.role = targetRole;
      await user.save();
    } else if (targetRole && user.role !== targetRole && user.role !== "admin") {
      return res.status(403).json({
        message: `Account role mismatch: This account is registered as a ${getRoleDisplayName(user.role)}, not a ${getRoleDisplayName(targetRole)}. Please switch to the ${getRoleDisplayName(user.role)} tab.`,
      });
    }

    return sendAuthenticatedUser(res, user, "Logged in successfully");
  }

  // Google OAuth flow
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
      role: targetRole || "customer",
    });
  } else {
    if (!user.role && targetRole) {
      user.role = targetRole;
      await user.save();
    } else if (targetRole && user.role !== targetRole && user.role !== "admin") {
      return res.status(403).json({
        message: `Account role mismatch: This account is registered as a ${getRoleDisplayName(user.role)}, not a ${getRoleDisplayName(targetRole)}. Please switch to the ${getRoleDisplayName(user.role)} tab.`,
      });
    }
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

  const role = normalizeRole(req.body.role);

  if (!role || !allowedRoles.includes(role)) {
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
