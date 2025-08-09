import { User } from "../models/user.js";

export const handleSearch = async (req, res) => {
  const { query } = req.query;
  const {user} = req.body
  const match = [];
  if (!query) {
    return res.json([]);
  }

  try {
    const orConditions = [
      { fullName: { $regex: query, $options: "i" } },
      { leetcodeID: { $regex: query, $options: "i" } },
    ];

    if (/^[0-9a-fA-F]{24}$/.test(query)) {
      orConditions.push({ _id: query });
    }

    const users = await User.find({
        $and: [
          { leetcodeID: { $ne: user } },
          {leetcodeID: {$ne: ""}},
          { $or: orConditions }
        ]
      });
      

    for (const user of users) {
      match.push({
        fullName: user.fullName,
        leetcodeID: user.leetcodeID,
        UID: user._id,
      });
    }

    res.json(match);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
