import express from 'express'
import { acceptReq, getFriendInfo, getFriends, incomingRequests, rejectReq, sendReq } from '../controllers/friends.js'



export const friendRouter = express.Router()

friendRouter.post("/incoming-req", incomingRequests)
friendRouter.post("/getFriends",getFriends)
friendRouter.post("/acceptReq",acceptReq)
friendRouter.post("/rejectReq",rejectReq)
friendRouter.post("/getInfo",getFriendInfo)
friendRouter.post("/sendRequest",sendReq)