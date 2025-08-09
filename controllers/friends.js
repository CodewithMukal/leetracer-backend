import { User } from "../models/user.js";
import jwt from "jsonwebtoken";

export const incomingRequests = async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ status: "failed", message: "Not logged in" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.json({ status: "failed", message: "Error!" });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.json({ status: "failed", message: "User not found!" });
    }
    const requests = user.recReq;
    return res.json({ status: "success", requests: requests });
  } catch (err) {
    return res.json({ status: "failed", message: err.message });
  }
};
export const acceptReq = async (req, res) => {
  const token = req.cookies.token;
  const { UID } = req.body;
  if (!token) {
    return res.json({ status: "failed", message: "Not logged in" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.json({ status: "failed", message: "Error!" });
    }
    if (UID == decoded.id) {
      return res.json({
        status: "failed",
        message: "Cant send request to yourself.",
      });
    }
    const user = await User.findById(decoded.id);
    const friend = await User.findById(UID);
    if (!user) {
      return res.json({ status: "failed", message: "User not found!" });
    }
    if (!friend) {
      return res.json({ status: "failed", message: "Friend not found!" });
    }
    if (!user.friends.includes(UID)) {
      user.friends.push(UID);
    }
    if (!friend.friends.includes(user._id.toString())) {
      friend.friends.push(user._id);
    }

    const index = user.recReq.indexOf(UID);
    if (index > -1) user.recReq.splice(index, 1);

    await user.save();
    await friend.save();

    const sender = await User.findById(UID);
    if (sender) {
      const sentIndex = sender.sentReq.indexOf(user._id.toString());
      if (sentIndex > -1) sender.sentReq.splice(sentIndex, 1);
      await sender.save();
    }
    return res.json({ status: "success", message: "User added in Friends" });
  } catch (err) {
    return res.json({ status: "failed", message: err.message });
  }
};

export const rejectReq = async (req, res) => {
  const token = req.cookies.token;
  const { UID } = req.body;
  if (!token) {
    return res.json({ status: "failed", message: "Not logged in" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.json({ status: "failed", message: "Error!" });
    }
    if (UID == decoded.id) {
      return res.json({
        status: "failed",
        message: "Cant send request to yourself.",
      });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.json({ status: "failed", message: "User not found!" });
    }
    const index = user.recReq.indexOf(UID);
    user.recReq.splice(index, 1);
    const sender = await User.findById(UID);
    if (sender) {
      const sentIndex = sender.sentReq.indexOf(user._id.toString());
      if (sentIndex > -1) sender.sentReq.splice(sentIndex, 1);
      await sender.save();
    }
    await user.save();
    return res.json({ status: "success", message: "User request removed" });
  } catch (err) {
    return res.json({ status: "failed", message: err.message });
  }
};

export const sendReq = async (req, res) => {
  const token = req.cookies.token;
  const { UID } = req.body;
  if (!token) {
    return res.json({ status: "failed", message: "Not logged in" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.json({ status: "failed", message: "Error!" });
    }
    if (UID == decoded.id) {
      return res.json({
        status: "failed",
        message: "Cant send request to yourself.",
      });
    }
    const user = await User.findById(decoded.id);
    if(user.friends.includes(UID))
      {
        return res.json({status:"failed",message:"Already friends with user!"})
      }
    const friend = await User.findById(UID);
    if (!user) {
      return res.json({ status: "failed", message: "User not found!" });
    }
    if (!friend) {
      return res.json({ status: "failed", message: "Friend not found!" });
    }
    if (
      user.sentReq.includes(UID) ||
      friend.recReq.includes(user._id.toString())
    ) {
      return res.json({ status: "failed", message: "Request already sent!" });
    }

    user.sentReq.push(UID);
    friend.recReq.push(user._id);

    await user.save();
    await friend.save();
    return res.json({ status: "success", message: "Request Sent!" });
  } catch (err) {
    return res.json({ status: "failed", message: err.message });
  }
};

export const getFriends = async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ status: "failed", message: "Not logged in" });
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded) {
    return res.json({ status: "failed", message: "Unable to verify" });
  }
  const user = await User.findById(decoded.id);
  if (!user) {
    return res.json({ status: "failed", message: "User doesnt exist!" });
  }
  const friends = user.friends;
  return res.json({ status: "success", friends: friends });
};

const baseUrl =
  process.env.NODE_ENV === "production"
    ? "https://leetracer-backend.onrender.com"
    : "http://localhost:8000";

export const getFriendInfo = async (req, res) => {
  const { UID } = req.body;
  console.log("UID received:",UID)
  const friend = await User.findById(UID);
  if (!friend) {
    return res.json({ status: "failed", message: "Friend doesn't exist" });
  }
  const response = await fetch(`${baseUrl}/auth/allData`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({username:friend.leetcodeID}),
  });
  const data = await response.json();
  return res.json({
    status: "success",
    fullName: friend.fullName,
    leetcodeID: friend.leetcodeID,
    data: data,
  });
};

export const removeFriend = async (req, res) => {
  const token = req.cookies.token;
  const { UID } = req.body;

  if (!token) return res.json({ status: "failed", message: "User not logged in!" });
  if (!UID) return res.json({ status: "failed", message: "Friend UID needed!" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) return res.json({ status: "failed", message: "Unable to decode JWT!" });

    const user = await User.findById(decoded.id);
    const friend = await User.findById(UID);

    if (!user) return res.json({ status: "failed", message: "User doesn't exist!" });
    if (!friend) return res.json({ status: "failed", message: "Can't find friend!" });

    // Ensure arrays exist
    user.friends = user.friends || [];
    friend.friends = friend.friends || [];

    // Remove friend from both lists
    user.friends = user.friends.filter(f => f.toString() !== UID);
    friend.friends = friend.friends.filter(f => f.toString() !== decoded.id);

    await friend.save();
    await user.save();

    return res.json({ status: "success", message: `Removed ${UID} from ${decoded.id}` });
  } catch (err) {
    return res.json({ status: "failed", message: err.message });
  }
};
