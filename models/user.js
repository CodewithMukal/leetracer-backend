import mongoose, { mongo } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      unique: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      unique: false,
    },
    isBan: {
      type: Boolean,
      default: false,
    },
    leetcodeID: {
        type: String,
        default: ""
    },
    uniqueID: {
        type: String,
        default: ""
    },
    data: 
    {
      type: Object,

    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    sentReq: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    recReq: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("user", userSchema);
