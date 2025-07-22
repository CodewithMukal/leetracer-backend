import express from 'express'
import { createUser, getInfo, linkLeetcode, login, logout, sendOTP } from '../controllers/user.js';

export const userrouter = express.Router();

userrouter.get('/',(req,res)=>{
    res.send("this is user")
})
userrouter.post('/signup', sendOTP)
userrouter.post('/verify-otp', createUser)
userrouter.post('/login', login)
userrouter.post('/info', getInfo)
userrouter.post('/logout',logout)
userrouter.get('/verify-leetcode',linkLeetcode)