import { GeneralFooter, GeneralHeader } from "./general.layout.js";

export const registerOTP = (user, otp) => {
        return `
            ${GeneralHeader()}

                <tr>
                    <td style="padding: 20px 30px 0 30px; text-align: center;">
                    <h2 style="margin: 0; font-weight: 600; color: #222;">
                        Welcome ${user.firstname} 👋
                    </h2>
                    </td>
                </tr>

                <tr>
                <td style="padding: 20px 30px;">
                    <p style="text-align: center; margin-bottom: 20px;">
                    <img src="" height="100" alt="Verify Account" />
                    </p>

                    <p style="text-align: center; font-size: 15px; line-height: 1.6; color: #555;">
                        Please verify your email address to activate your account and continue securely.
                    </p>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

                    <p style="text-align: center; font-size: 14px; color: #666;">
                    Use the verification code below:
                    </p>

                    <h1 style="
                    text-align: center;
                    font-size: 34px;
                    letter-spacing: 6px;
                    color: #02042D;
                    margin: 15px 0;
                    ">
                    ${otp}
                    </h1>

                    <p style="text-align: center; font-size: 13px; color: #888;">
                    This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
                    </p>

                    <p style="text-align: center; font-size: 13px; color: #999; margin-top: 20px;">
                    If you didn’t create an account, you can safely ignore this email.
                    </p>
                </td>
                </tr>

                ${GeneralFooter({
                    platformName: "ShopManager",
                    websiteUrl: "https://shopmanager.com",
                    supportEmail: "support@shopmanager.com",
                })}
        `;
    

};