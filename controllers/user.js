import { User } from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Verify } from "../models/emailVerify.js";
import { sendMail } from "../config/mailer.js";
import fetch from "node-fetch";

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
      status: "success",
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
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
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
  console.log("📩 Login Request Received:");
  console.log("  📍 IP:", req.ip);
  console.log("  📧 Email:", email);
  console.log("  🔒 Remember Me:", rememberMe);
  console.log("Node Enviornment:", process.env.NODE_ENV);

  if (!email || !password) {
    console.warn("❌ Missing email or password");
    return res.json({ status: "failed", message: "Invalid Credentials" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      console.warn("❌ User not found:", email);
      return res.json({
        status: "failed",
        message: "User not found, Signup first",
      });
    }

    const hashedPass = user.password;
    const match = await bcrypt.compare(password, hashedPass);

    if (!match) {
      console.warn("❌ Invalid password for:", email);
      return res.json({ status: "failed", message: "Invalid Password" });
    }

    // ✅ Password matched
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    console.log("🔑 JWT Token Generated:", token.slice(0, 20) + "...");

    // Cookie settings
    const cookieOptions = {
      maxAge: rememberMe ? 10 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000, // 10d or 1h
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    res.cookie("token", token, cookieOptions);
    console.log("🍪 Cookie Set with Options:", cookieOptions);

    return res.json({
      status: "success",
      message: "User login successfully!",
    });
  } catch (err) {
    console.error("🔥 Error in login:", err.message);
    return res.json({ status: "failed", message: `Error: ${err.message}` });
  }
};

export const getInfo = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res
        .status(401)
        .json({ status: "failed", message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res
        .status(401)
        .json({ status: "failed", message: "Invalid token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(404)
        .json({ status: "failed", message: "User doesn't exist" });
    }

    return res.status(200).json({
      status: "success",
      loggedIn: true,
      email: user.email,
      fullName: user.fullName,
      leetcodeID: user.leetcodeID,
      uid: user._id
    });
  } catch (err) {
    console.error("🔥 JWT error:", err.message);
    return res
      .status(401)
      .json({ status: "failed", message: `Error: ${err.message}` });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  });
  return res.json({ status: "success", message: "User logged out!" });
};

export const linkLeetcode = async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.json({ status: "failed", message: "username missing!" });
  }
  const url = `https://leetscan.vercel.app/${username}`;
  const existingUser = await User.findOne({ leetcodeID: username });
  if (existingUser) {
    return res.json({
      status: "failed",
      message: "Account already linked with another ID.",
    });
  }
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) {
      return res.json({
        status: "failed",
        message: "user doesnt exist or API error",
      });
    }
    const random = crypto.randomBytes(4).toString("hex");
    const uniqueID = "leetracer-" + random;
    return res.json({ status: "success", uniqueID: uniqueID });
  } catch (err) {
    return res.json({
      status: "failed",
      message: "User doesnt exist or API error, try again!",
    });
  }
};

export const verifyLeetcode = async (req, res) => {
  const { username, uniqueID } = req.body;
  const token = req.cookies.token;
  if (!username || !uniqueID) {
    return res.json({ status: "failed", message: "details missing!" });
  }
  const url = `https://leetscan.vercel.app/${username}`;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const response = await fetch(url);
    const data = await response.json();
    if (data.error) {
      return res.json({ status: "failed", message: "something went wrong!" });
    }
    if (data.profile.aboutMe.includes(uniqueID)) {
      const user = await User.findById(decoded.id);
      if (user.leetcodeID === username) {
        res.json({ status: "success", message: "Already Linked!" });
      }
      if (!user.leetcodeID) {
        user.leetcodeID = username;
        user.uniqueID = uniqueID;
        await user.save();
        return res.json({ status: "success", message: "added leetcode ID" });
      } else {
        return res.json({
          status: "failed",
          message: "Add ID in summary of your leetcode account!",
        });
      }
    } else {
      return res.json({
        status: "failed",
        message: "Summary doesnt contain the code!",
      });
    }
  } catch (err) {
    return res.json({
      status: "failed",
      message: err.message,
    });
  }
};

const formatData = (data) => {
  let sendData = {
    username: data.matchedUser.username,
    totalSolved: data.matchedUser.submitStats.acSubmissionNum[0].count,
    totalSubmissions: data.matchedUser.submitStats.totalSubmissionNum[0].count,
    totalQuestions: data.allQuestionsCount[0].count,
    easySolved: data.matchedUser.submitStats.acSubmissionNum[1].count,
    totalEasy: data.allQuestionsCount[1].count,
    mediumSolved: data.matchedUser.submitStats.acSubmissionNum[2].count,
    totalMedium: data.allQuestionsCount[2].count,
    hardSolved: data.matchedUser.submitStats.acSubmissionNum[3].count,
    totalHard: data.allQuestionsCount[3].count,
    ranking: data.matchedUser.profile.ranking,
    contributionPoints: data.matchedUser.contributions.points,
    reputation: data.matchedUser.profile.reputation,
    submissionCalendar: JSON.parse(data.matchedUser.submissionCalendar),
    recentSubmissions: data.recentSubmissionList,
    profile: {
      realName: data.matchedUser.profile.realName,
      aboutMe: data.matchedUser.profile.aboutMe,
      userAvatar: data.matchedUser.profile.userAvatar,
      location: data.matchedUser.profile.location,
      skillTags: data.matchedUser.profile.skillTags,
      websites: data.matchedUser.profile.websites,
      company: data.matchedUser.profile.company,
      school: data.matchedUser.profile.school,
      starRating: data.matchedUser.profile.starRating,
    },
    badges: data.matchedUser.badges,
    contestRanking: data.userContestRanking,
    submitStats: data.matchedUser.submitStats,
  };
  return sendData;
};

export const getData = async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.json({ status: "failed", message: "username required" });
  }
  const url = `https://leetscan.vercel.app/${username}`;
  const response = await fetch(url);
  const data = await response.json();
  return res.json({ data });
};

export const getLeetcodeData = async (req, res) => {
  const { username } = req.body;
  console.log("Username is:",username)
  const userQuery = `
    query getUserProfile($username: String!) {
      allQuestionsCount {
        difficulty
        count
      }
      matchedUser(username: $username) {
        username
        contributions { points }
        profile {
          reputation
          ranking
          realName
          aboutMe
          userAvatar
          location
          skillTags
          websites
          company
          school
          starRating
        }
        submissionCalendar
        submitStats {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
          totalSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        badges {
          id
          displayName
          icon
          creationDate
        }
      }
      recentSubmissionList(username: $username, limit: 20) {
        title
        titleSlug
        timestamp
        statusDisplay
        lang
        runtime
        memory
        url
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
        badge {
          name
          icon
        }
      }
    }
  `;

  const dailyChallengeQuery = `
    query questionOfTodayV2 {
      activeDailyCodingChallengeQuestion {
        date
        userStatus
        link
        question {
          questionId
          titleSlug
          title
          translatedTitle
          questionFrontendId
          isPaidOnly
          difficulty
          topicTags {
            name
            slug
            translatedName
          }
          status
          isFavor
          acRate
          freqBar
        }
      }
    }
  `;

  try {
    const [userRes, dailyRes] = await Promise.all([
      fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://leetcode.com",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        body: JSON.stringify({ query: userQuery, variables: { username } }),
      }),
      fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://leetcode.com",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        body: JSON.stringify({
          query: dailyChallengeQuery,
          operationName: "questionOfTodayV2",
          variables: {},
        }),
      }),
    ]);

    if (!userRes.ok) {
      const text = await userRes.text(); // so we can debug the response
      console.error("LeetCode userRes failed:", text);
      return res.status(500).json({
        status: "failed",
        message: "LeetCode user request failed",
      });
    }
    
    const userData = await userRes.json();
    const dailyData = await dailyRes.json();

    if (userData.errors) {
      return res.status(400).json({
        status: "failed",
        message: "User not found or API error",
        details: userData.errors,
      });
    }

    const formattedUser = formatData(userData.data); // your existing formatter

    const raw = dailyData?.data?.activeDailyCodingChallengeQuestion;
    const question = raw?.question;
    const formattedDaily = question
      ? {
          date: raw.date,
          isCompleted: raw.userStatus === "FINISH",
          title: question.title,
          translatedTitle: question.translatedTitle || null,
          id: question.questionFrontendId,
          slug: question.titleSlug,
          link: `https://leetcode.com${raw.link}`,
          difficulty: question.difficulty,
          isPaidOnly: question.isPaidOnly,
          acRate: `${question.acRate.toFixed(2)}%`,
          frequency: question.freqBar,
          tags: question.topicTags.map((tag) => ({
            name: tag.name,
            slug: tag.slug,
            translatedName: tag.translatedName || null,
          })),
          isFavorite: question.isFavor || false,
        }
      : null;

    return res.json({
      status: "success",
      data: {
        ...formattedUser,
        dailyChallenge: formattedDaily,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      status: "failed",
      message: "Internal server error",
      details: err.message,
    });
  }
};

export const unlinkLeetcode = async (req,res) => 
  {
    const token = req.cookies.token
    if(!token)
      {
        return res.json({status:"failed",message:"Token not found"});
      }
    try{
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if(!decoded)
        {
          return res.json({status:"failed",message:"Cant verify ID"})
        }
      const user = await User.findById(decoded.id)
      if(!user)
        {
          return res.json({status:"failed",message:"User not found!"})
        }
      user.leetcodeID = "";
      await user.save();
      return res.json({status:"success",message:"Leetcode ID unlinked"})
    }
    catch(err)
    {
      return res.json({status:"failed",message:"Some error occured, try again later..."})
    }
  }
export const changeUsername = async (req,res) => 
  {
    const { fullName } = req.body
    if(!fullName)
      {
        return res.json({status:"failed",message:"Missing field"})
      }
    const token = req.cookies.token
    if(!token)
      {
        return res.json({status:"failed",message:"Token not found"});
      }
    try{
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if(!decoded)
        {
          return res.json({status:"failed",message:"Cant verify ID"})
        }
      const user = await User.findById(decoded.id)
      if(!user)
        {
          return res.json({status:"failed",message:"User not found!"})
        }
      user.fullName = fullName;
      await user.save();
      return res.json({status:"success",message:"Full Name Updated!"})
    }
    catch(err)
    {
      return res.json({status:"failed",message:"Some error occured, try again later..."})
    }
  }

