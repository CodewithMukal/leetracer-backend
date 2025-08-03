import express from "express"
import { handleSearch } from "../controllers/search.js"

export const searchRouter = express.Router()

searchRouter.post("/",handleSearch)