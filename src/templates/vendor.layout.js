export const VendorHeader = (storeName = "", logoUrl = "") => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${storeName} Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <tr>
            <td style="padding: 20px; text-align: center; border-bottom: 1px solid #eee;">
                ${
                    logoUrl
                        ? `<img src="${logoUrl}" alt="${storeName}" style="max-height: 50px;" />`
                        : `<h2 style="margin: 0; color: #333;">${storeName}</h2>`
                }
            </td>
        </tr>
`;

export const VendorFooter = ({
    storeName = "",
    websiteUrl = "#",
    year = new Date().getFullYear(),
} = {}) => `
        <tr>
            <td style="padding: 25px; background-color: #fafafa; text-align: center;">
                <h3 style="margin-bottom: 10px; color: #222;">
                    Thank you for shopping with ${storeName}
                </h3>

                <p style="color: #666; font-size: 14px;">
                    Discover multiple vendors, great deals, and seamless transactions all in one place.
                </p>

                <p>
                    <a href="${websiteUrl}" 
                       style="background-color: #02042D; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 14px;">
                        Visit Marketplace
                    </a>
                </p>

                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />

                <p style="font-size: 12px; color: #999;">
                    &copy; ${year} ${storeName}. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
`;

export default {
    VendorHeader,
    VendorFooter,
};