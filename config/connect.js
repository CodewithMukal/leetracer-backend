import mongoose from "mongoose";

export const connectDB = async () => {
  console.log(process.env.MONGO_URI);
  await mongoose
    .connect(`${process.env.MONGO_URI}leetracer`)
    .then(() => console.log("Connected to DB!"));
};
