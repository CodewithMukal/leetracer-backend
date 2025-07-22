import nodemailer from 'nodemailer'

export const sendMail = async (email,otp)=> 
    {
        const transporter = nodemailer.createTransport({
            service: "Gmail", // or SMTP settings
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });
        
          await transporter.sendMail({
            from: `"Leetracer" <${process.env.EMAIL}>`,
            to: email,
            subject: "Your OTP Code",
            html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
          });
    }