import express from 'express'
import { connectDB } from './config/connect.js'
import dotenv from 'dotenv';
import { userrouter } from './routes/user.js';
import cors from 'cors'

const app = express();
const PORT = 8000;

//middlewares
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(cors({credentials:true}))

dotenv.config({quiet:true});

connectDB();

app.get('/', (req, res) => {
    res.end("This is test endpoint.")
});

app.use('/auth',userrouter)

app.listen(PORT, () => {
    console.log(`Server started at : http://localhost:${PORT}`)
});