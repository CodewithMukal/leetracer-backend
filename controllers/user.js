import { User } from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Verify } from "../models/emailVerify.js";
import { sendMail } from "../config/mailer.js";

export const sendOTP = async (req, res) => {
  const { fullName, email, password } = req.body;
  if (!fullName || !email || !password) {
    return res.json({ status: "failed", message: "Missing Credentials" });
  }
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.json({
        status: "failed",
        message: "User with email already exists",
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);
    const hashedPass = await bcrypt.hash(password, 10);

    await Verify.deleteMany({ email });
    const newOtp = new Verify({
      email,
      otp: hashedOTP,
      password: hashedPass,
      fullName: fullName,
    });
    await newOtp.save();
    await sendMail(email, otp);
    res.json({
      status: "Success",
      message: `OTP generated for : ${email}`,
      email: email,
    });
  } catch (err) {
    return res.json({ status: "failed", message: `Error: ${err.message}` });
  }
};

export const createUser = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.json({ status: "failed", message: "Missing Credentials" });
  }
  const user = await Verify.findOne({ email });
  if (!user) {
    res.json({
      status: "failed",
      message: "Generate OTP again or email not Found!",
    });
  }
  const hashedOTP = user.otp;
  const match = await bcrypt.compare(otp, hashedOTP);

  if (match) {
    try {
      const newuser = await User.create({
        email,
        fullName: user.fullName,
        password: user.password,
      });
      await Verify.deleteMany({ email });
      const token = jwt.sign({ id: newuser._id }, process.env.JWT_SECRET);
      res.cookie("token", token, {
        maxAge: 10 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      return res.json({
        status: "success",
        message: "User created successfully!",
      });
    } catch (err) {
      res.json({ status: "failed", message: `Error: ${err.message}` });
    }
  } else {
    return res.json({ status: "failed", message: "Incorrect OTP" });
  }
};

export const login = async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    return res.json({ status: "failed", message: "Invalid Credentials" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        status: "failed",
        message: "User not found, Signup first",
      });
    }
    const hashedPass = user.password;
    const match = await bcrypt.compare(password, hashedPass);
    if (match) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.cookie("token", token, {
        maxAge: rememberMe == "on" ? 10 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      return res.json({
        status: "success",
        message: "User login successfully!",
      });
    } else {
      return res.json({ status: "failed", message: "Invalid Password" });
    }
  } catch (err) {
    return res.json({ status: "failed", message: `Error: ${err.message}` });
  }
};

export const getInfo = async (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.json({ status: "failed", message: "invalid request" });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.json({ status: "failed", message: "User doesnt exist" });
    }
    const email = user.email;
    const fullName = user.fullName;
    const leetcodeID = user.leetcodeID;
    return res.json({
      status: "success",
      loggedIn: true,
      email: email,
      fullName: fullName,
      leetcodeID: leetcodeID,
    });
  } catch (err) {
    return res.json({ status: "failed", message: `Error: ${err.message}` });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token", {
    maxAge: 10 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return res.json({ status: "success", message: "User logged out!" });
};

export const linkLeetcode = async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.json({ status: "failed", message: "username missing!" });
  }
  const url = `https://leetscan.vercel.app/${username}`;
  const existingUser = await User.findOne({leetcodeID: username})
  if(existingUser)
    {
      return res.json({status:"failed",message:"Account already linked with another ID."})
    }
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) {
      return res.json({ status: "failed", message: "user doesnt exist or API error" });
    }
    const random = crypto.randomBytes(4).toString("hex");
    const uniqueID = "leetracer-" + random;
    return res.json({status:"success",data, uniqueID: uniqueID});
  } catch (err) {
    return res.json({
      status: "failed",
      message: "User doesnt exist or API error, try again!",
    });
  }
};

export const verifyLeetcode = async (req, res) => {
  const { username, email, uniqueID } = req.body;
  if (!username || !email || !uniqueID) {
    return res.json({ status: "failed", message: "details missing!" });
  }
  const url = `https://leetscan.vercel.app/${username}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if(data.error)
      {
        return res.json({status:"failed",message:"something went wrong!"})
      }
    if(data.aboutMe.includes(uniqueID))
      {
        const user = await User.findOne({email})
        if(user.leetcodeID===username)
          {
            res.json({status:"success",message:"Already Linked!"})
          }
        if(!user.leetcodeID)
          {
            user.leetcodeID = username;
            user.uniqueID = uniqueID;
            await user.save();
            return res.json({status:"success",message:"added leetcode ID"})
          }
        else
        {
          return res.json({status:"failed",message:"Add ID in summary of your leetcode account!"})
        }
      }
    else{
      return res.json({status:"failed",message:"Summary doesnt contain the code!"})
    }
  } catch (err) {
    return res.json({
      status: "failed",
      message: "User doesnt exist or API error, try again!",
    });
  }
};
