import express from 'express'
import { connectDB } from './config/connect.js'
import dotenv from 'dotenv';
import { userrouter } from './routes/user.js';
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { airouter } from './routes/ai.js';

const app = express();
const PORT = 8000;

//middlewares
app.use(cors({credentials:true, origin:["https://leetracer-frontend.vercel.app","http://localhost:5173","http://192.168.1.41:5173"]}))
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(cookieParser())

dotenv.config({quiet:true});

connectDB();

app.get('/', (req, res) => {
    res.end("This is test endpoint.")
});

app.use('/auth',userrouter)
app.use('/ai',airouter)

app.listen(PORT, () => {
    console.log(`Server started at : http://localhost:${PORT}`)
});