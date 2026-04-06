import { emailVerification } from "#templates/account.activation.js";
import transporter from "#services/mail_transporter.js";

export const sendEmailVerificationLink = async (user, verificationLink, vendor) => {
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Account Verification Link',
        html: emailVerification(user, verificationLink, vendor)
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
    sendEmailVerificationLink,
};
