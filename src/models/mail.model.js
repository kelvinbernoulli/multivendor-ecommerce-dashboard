import { registerOTP } from "#emailTemplates/account.activation.js";
import transporter from "#services/mail_transporter.js";

export const sendEmailVerificationOTP = async (user, otp) => {
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Account Verification OTP',
        html: registerOTP(user, otp)
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("info", info)
        return true;
    } catch (error) {
        console.error('Error sending verification OTP:', error);
        return false
    }
};

export default {
    sendEmailVerificationOTP,
};
