import express from 'express'
import { createUser, getData, getInfo, getLeetcodeData, linkLeetcode, login, logout, sendOTP, verifyLeetcode } from '../controllers/user.js';

export const userrouter = express.Router();

userrouter.get('/',(req,res)=>{
    res.send("this is user")
})
userrouter.post('/signup', sendOTP)
userrouter.post('/verify-otp', createUser)
userrouter.post('/login', login)
userrouter.post('/info', getInfo)
userrouter.post('/logout',logout)
userrouter.post('/linkLeetcode',linkLeetcode)
userrouter.post('/checkLeetcode', verifyLeetcode)
userrouter.post("/getData", getData)
userrouter.post("/allData", getLeetcodeData)