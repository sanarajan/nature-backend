import nodemailer from 'nodemailer';
import { injectable } from 'tsyringe';
import { IEmailService } from '../../domain/services/IEmailService';

@injectable()
export class EmailService implements IEmailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: Number(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER || 'test@example.com',
                pass: process.env.EMAIL_PASS || 'password',
            },
        });
    }

    async sendVerificationEmail(email: string, otp: string): Promise<void> {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const safeOtp = typeof otp === 'number' ? String(otp).padStart(6, '0') : String(otp || '').trim();
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@nature.com',
            to: email,
            subject: 'Your Naturalayam Verification OTP',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #2e7d32; text-align: center;">Account Verification</h2>
                    <p style="font-size: 16px; color: #333;">Thank you for registering with Naturalayam.</p>
                    <p style="font-size: 16px; color: #333;">Your Naturalayam verification OTP is:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2e7d32; background: #e8f5e9; padding: 12px 24px; border-radius: 6px; user-select: all; -webkit-user-select: all;">${safeOtp}</span>
                        <div style="margin-top: 14px;">
                            <a
                                href="${clientUrl}/verify-otp?email=${encodeURIComponent(email)}&otp=${safeOtp}"
                                target="_blank"
                                id="copy-otp-btn"
                                onclick="(function(b){function s(){b.innerText='Copied!';setTimeout(function(){b.innerText='Copy code';},2000);}function f(){var t=document.createElement('textarea');t.value='${safeOtp}';t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.focus();t.select();try{document.execCommand('copy');s();}catch(e){}document.body.removeChild(t);}if(navigator.clipboard&amp;&amp;navigator.clipboard.writeText){navigator.clipboard.writeText('${safeOtp}').then(s).catch(f);}else{f();}})(this);if(window.event){window.event.preventDefault();}"
                                style="display: inline-block; padding: 6px 16px; font-size: 13px; font-weight: 600; color: #2e7d32; background-color: #ffffff; border: 1px solid #2e7d32; border-radius: 4px; cursor: pointer; text-decoration: none;"
                            >Copy code</a>
                        </div>
                    </div>
                    <p style="font-size: 14px; color: #666; text-align: center;">This OTP is valid for <strong>10 minutes</strong>.</p>
                    <p style="font-size: 14px; color: #666; text-align: center;">Please enter this OTP on the verification page to verify your account.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">If you did not request this verification code, please ignore this email.</p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Verification email sent to ${email}`);
            } else {
                console.log(`Verification email prepared for ${email}`);
            }
        } catch (error) {
            console.error('Error sending verification email:', error);
            // In dev mode gracefully fallback to avoid failing if test smtp credentials fail
            if (process.env.NODE_ENV !== 'production') {
                return;
            }
            throw new Error('Failed to send verification email');
        }
    }

    async sendWelcomeWithReferralEmail(email: string, referralId: string, offerPercentage: number, joiningDiscount: number): Promise<void> {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        //  <div style="font-family: Arial, sans-serif; padding: 20px;">
        //             <h2>Welcome to Naturalayam!</h2>
        //             <p>Your email has been successfully verified.</p>
        //             //  <p>We are excited to share your unique referral code:</p> 
        //             // <h3 style="background-color: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px; color: #333;">${referralId}</h3>
        //             // <p>Share this code with your friends!</p>
        //             // <p>When they use your code, <strong>they get ${joiningDiscount}% off</strong> their first order, and <strong>you earn a ${offerPercentage}%</strong> reward!</p>
        //            <a href="${clientUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Start Shopping</a>
        //         </div>
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@nature.com',
            to: email,
            subject: 'Welcome to Naturalayam - Your registration is successful!',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Welcome to Naturalayam!</h2>
                    <p>Your email has been successfully verified.</p>
                    <a href="${clientUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Start Shopping</a>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Welcome/Referral email sent to ${email}`);
            } else {
                console.log(`[DEV MODE] Welcome/Referral email for ${email}:\n Referral Code => ${referralId} with ${offerPercentage}%`);
            }
        } catch (error) {
            console.error('Error sending welcome/referral email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Welcome/Referral email for ${email}:\n Referral Code => ${referralId} with ${offerPercentage}%`);
                return;
            }
            throw new Error('Failed to send welcome/referral email');
        }
    }

    async sendShippingEmail(email: string, orderId: string, productName: string, agencyName: string, trackingNumber: string, trackingUrl?: string): Promise<void> {
        const trackingHtml = trackingUrl ? `
            <p>You can track your package using the link below:</p>
            <a href="${trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Your Order</a>
            
            <p style="margin-top: 20px;">Or copy and paste this link into your browser:<br/>
            <a href="${trackingUrl}">${trackingUrl}</a></p>
        ` : `<p>Your package is on its way. Please contact the shipping agency for more details.</p>`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@nature.com',
            to: email,
            subject: `Your order item has been shipped - ${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4CAF50;">Good News! Your Item is on its Way</h2>
                    <p>Hello,</p>
                    <p>We are happy to inform you that an item from your order <strong>${orderId}</strong> has been shipped.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Product:</strong> ${productName}</p>
                        <p style="margin: 5px 0 0 0;"><strong>Shipping Agency:</strong> ${agencyName}</p>
                        <p style="margin: 5px 0 0 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
                    </div>

                    ${trackingHtml}
                    
                    <p>Thank you for shopping with Naturalayam!</p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Shipping email sent to ${email} for order ${orderId}`);
            } else {
                console.log(`[DEV MODE] Shipping Email for ${email}:\n Product => ${productName}\n Agency => ${agencyName}\n Tracking => ${trackingNumber}\n URL => ${trackingUrl}`);
            }
        } catch (error) {
            console.error('Error sending shipping email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Shipping Email for ${email}:\n Product => ${productName}\n Agency => ${agencyName}\n Tracking => ${trackingNumber}\n URL => ${trackingUrl}`);
                return;
            }
            throw new Error('Failed to send shipping email');
        }
    }

    async sendInfluencerApprovalEmail(email: string, userName: string): Promise<void> {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const dashboardUrl = `${clientUrl}/account/influencer`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@nature.com',
            to: email,
            subject: 'Your Naturalayam Influencer Request Has Been Approved!',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4CAF50;">Congratulations, ${userName}!</h2>
                    <p>We are delighted to inform you that your request to become a Naturalayam Influencer has been <strong>APPROVED</strong>.</p>
                    <p>You now have full access to the Influencer Dashboard, where you can find your unique referral code, track your earnings, and manage your commissions.</p>
                    <div style="margin: 25px 0;">
                        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Influencer Dashboard</a>
                    </div>
                    <p>Thank you for partnering with Naturalayam to spread wellness and natural living!</p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Influencer approval email sent to ${email}`);
            } else {
                console.log(`[DEV MODE] Influencer Approval Email for ${email}:\n User => ${userName}\n Dashboard => ${dashboardUrl}`);
            }
        } catch (error) {
            console.error('Error sending influencer approval email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Influencer Approval Email for ${email}:\n User => ${userName}\n Dashboard => ${dashboardUrl}`);
                return;
            }
            throw new Error('Failed to send influencer approval email');
        }
    }

    async sendInfluencerRejectionEmail(email: string, userName: string, reason?: string): Promise<void> {
        const reasonHtml = reason ? `
            <div style="background-color: #f8d7da; border-left: 4px solid #f5c6cb; padding: 12px; margin: 15px 0; border-radius: 4px; color: #721c24;">
                <strong>Reason:</strong> ${reason}
            </div>
        ` : '';

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@nature.com',
            to: email,
            subject: 'Update on Your Naturalayam Influencer Request',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Hello, ${userName}</h2>
                    <p>Thank you for your interest in becoming a Naturalayam Influencer. After careful review, our team has decided not to approve your request at this time.</p>
                    ${reasonHtml}
                    <p>Don't worry! Your normal user account status remains completely active and unchanged. You can continue shopping, earning regular rewards, and enjoying our products as usual.</p>
                    <p>If you have questions or update your social channels in the future, you are welcome to submit a new request from your account profile.</p>
                    <p>Thank you for being part of the Naturalayam family!</p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Influencer rejection email sent to ${email}`);
            } else {
                console.log(`[DEV MODE] Influencer Rejection Email for ${email}:\n User => ${userName}\n Reason => ${reason || 'N/A'}`);
            }
        } catch (error) {
            console.error('Error sending influencer rejection email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Influencer Rejection Email for ${email}:\n User => ${userName}\n Reason => ${reason || 'N/A'}`);
                return;
            }
            throw new Error('Failed to send influencer rejection email');
        }
    }

    async sendStaffCredentialsEmail(email: string, name: string, password: string): Promise<void> {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const loginUrl = `${clientUrl}/admin`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@naturalayam.com',
            to: email,
            subject: 'Naturalayam Staff Account Registered',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                    <h2 style="color: #4CAF50;">Welcome to Naturalayam!</h2>
                    <p>Dear ${name},</p>
                    <p>Congratulations! You have been successfully registered as a Staff member of Naturalayam.</p>
                    <p>You can log in to the admin panel using the following credentials:</p>
                    <table style="width: 100%; max-width: 450px; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9; width: 150px;">Login URL:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;"><a href="${loginUrl}" target="_blank">${loginUrl}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Username (Email):</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Password:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;"><code style="font-size: 1.1rem; background-color: #f1f1f1; padding: 2px 6px; border-radius: 4px; color: #d32f2f;">${password}</code></td>
                        </tr>
                    </table>
                    <p>Please note that your email address is your login username.</p>
                    <p>Best regards,<br/>The Naturalayam Team</p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Staff credentials email sent to ${email}`);
            } else {
                console.log(`[DEV MODE] Staff Credentials Email for ${email}:\n Username => ${email}\n Password => ${password}\n URL => ${loginUrl}`);
            }
        } catch (error) {
            console.error('Error sending staff credentials email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Staff Credentials Email for ${email}:\n Username => ${email}\n Password => ${password}\n URL => ${loginUrl}`);
                return;
            }
            throw new Error('Failed to send staff registration credentials email');
        }
    }

    async sendForgotPasswordEmail(email: string, token: string): Promise<void> {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetLink = `${clientUrl}/reset-password?token=${encodeURIComponent(token)}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@nature.com',
            to: email,
            subject: 'Password Reset Request - Naturalayam',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4CAF50;">Password Reset Request</h2>
                    <p>We received a request to reset your password for your Naturalayam account.</p>
                    <p>Click the button below to set a new password:</p>
                    <div style="margin: 25px 0;">
                        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link in your browser:</p>
                    <p><a href="${resetLink}">${resetLink}</a></p>
                    <p>This link will expire in 30 minutes.</p>
                    <p>If you did not request a password reset, please ignore this email.</p>
                    <p>Best regards,<br/>The Naturalayam Team</p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Password reset email sent to ${email}`);
            } else {
                console.log(`[DEV MODE] Password Reset Link for ${email}:\n => ${resetLink}`);
            }
        } catch (error) {
            console.error('Error sending password reset email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Password Reset Link for ${email}:\n => ${resetLink}`);
                return;
            }
            throw new Error('Failed to send password reset email');
        }
    }

    async sendContactEmail(name: string, email: string, preference: string, message: string): Promise<void> {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@naturalayam.com',
            to: 'sales@naturalayam.com',
            replyTo: email,
            subject: 'New Contact Enquiry - Naturalayam',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                    <h2 style="color: #4CAF50;">New enquiry received from Naturalayam website</h2>
                    <table style="width: 100%; max-width: 600px; border-collapse: collapse; margin-top: 15px;">
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9; width: 150px;">Name:</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Email:</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">What You Prefer:</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${preference}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Message:</td>
                            <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${message}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Submitted At:</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Contact email sent from ${email}`);
            } else {
                console.log(`[DEV MODE] Contact Email from ${email}:\n Name => ${name}\n Preference => ${preference}\n Message => ${message}`);
            }
        } catch (error) {
            console.error('Error sending contact email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Contact Email from ${email}:\n Name => ${name}\n Preference => ${preference}\n Message => ${message}`);
                return;
            }
            throw new Error('Failed to send contact email');
        }
    }

    async sendOrderConfirmationEmail(data: {
        email: string;
        customerName: string;
        orderId: string;
        orderDate?: Date;
        items: Array<{ productName: string; quantity?: number; price?: number }>;
        totalAmount: number;
        shippingAddress: {
            house?: string;
            place?: string;
            city?: string;
            district?: string;
            state?: string;
            pincode?: number;
        };
        deliveryEstimate?: string;
        paymentMethod?: string;
    }): Promise<void> {
        const { email, customerName, orderId, orderDate, items, totalAmount, shippingAddress, deliveryEstimate, paymentMethod } = data;
        const formattedDate = orderDate ? new Date(orderDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const addressParts = [
            shippingAddress?.house,
            shippingAddress?.place,
            shippingAddress?.city,
            shippingAddress?.district,
            shippingAddress?.state ? `${shippingAddress.state} - ${shippingAddress.pincode || ''}` : (shippingAddress?.pincode ? String(shippingAddress.pincode) : '')
        ].filter(Boolean).join(', ');

        const itemsRows = (items || []).map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productName}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price !== undefined ? `₹${item.price.toFixed(2)}` : '-'}</td>
            </tr>
        `).join('');

        const estimateText = deliveryEstimate
            ? deliveryEstimate
            : 'Standard delivery (Tracking details will be shared once your order is shipped)';

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@naturalayam.com',
            to: email,
            subject: `Your Naturalayam Order is Confirmed! - ${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 650px; margin: 0 auto; line-height: 1.6;">
                    <div style="text-align: center; border-bottom: 2px solid #4CAF50; padding-bottom: 15px; margin-bottom: 20px;">
                        <h1 style="color: #4CAF50; margin: 0; font-size: 24px;">NATURALAYAM</h1>
                        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Pure • Organic • Natural</p>
                    </div>

                    <h2 style="color: #2e7d32; margin-top: 0;">Order Confirmed!</h2>
                    <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
                    <p>Thank you for shopping with Naturalayam! We have received your order and are getting it ready for processing.</p>

                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 4px 0; color: #666; width: 40%;"><strong>Order ID:</strong></td>
                                <td style="padding: 4px 0; font-weight: bold; color: #333;">${orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0; color: #666;"><strong>Order Date:</strong></td>
                                <td style="padding: 4px 0;">${formattedDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0; color: #666;"><strong>Payment Method:</strong></td>
                                <td style="padding: 4px 0;">${paymentMethod || 'Online'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0; color: #666;"><strong>Delivery Estimate:</strong></td>
                                <td style="padding: 4px 0; color: #2e7d32; font-weight: bold;">${estimateText}</td>
                            </tr>
                        </table>
                    </div>

                    <h3 style="color: #333; margin-bottom: 10px; font-size: 16px;">Order Summary</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #f1f8e9; color: #333;">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #c8e6c9;">Item</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #c8e6c9; width: 60px;">Qty</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #c8e6c9; width: 100px;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="padding: 12px 10px; text-align: right; font-weight: bold; border-top: 2px solid #333;">Total Paid / Payable:</td>
                                <td style="padding: 12px 10px; text-align: right; font-weight: bold; color: #2e7d32; font-size: 16px; border-top: 2px solid #333;">₹${Number(totalAmount).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
                        <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">Shipping Address</h4>
                        <p style="margin: 0; font-size: 14px; color: #555;">${addressParts || 'Standard Shipping Address on File'}</p>
                    </div>

                    <p style="margin-top: 25px; color: #555; font-size: 14px;">
                        We will notify you again with tracking details as soon as your order has been dispatched.
                    </p>
                    <p style="margin-top: 20px; font-size: 14px; color: #333;">
                        Warm regards,<br/>
                        <strong>The Naturalayam Team</strong>
                    </p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Order confirmation email sent to ${email} for order ${orderId}`);
            } else {
                console.log(`[DEV MODE] Order Confirmation Email for ${email}:\n Order ID => ${orderId}\n Total => ₹${totalAmount}\n Items => ${items?.length}`);
            }
        } catch (error) {
            console.error('Error sending order confirmation email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Order Confirmation Email for ${email}:\n Order ID => ${orderId}\n Total => ₹${totalAmount}`);
                return;
            }
            throw new Error('Failed to send order confirmation email');
        }
    }

    async sendDeliveryConfirmationEmail(data: {
        email: string;
        customerName: string;
        orderId: string;
        items: Array<{ productName: string; quantity?: number }>;
    }): Promise<void> {
        const { email, customerName, orderId, items } = data;

        const itemsListHtml = (items || []).map(item => `
            <li style="margin-bottom: 6px;"><strong>${item.productName}</strong> ${item.quantity ? `(Qty: ${item.quantity})` : ''}</li>
        `).join('');

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@naturalayam.com',
            to: email,
            subject: `Your Naturalayam Order Has Been Delivered! - ${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 650px; margin: 0 auto; line-height: 1.6;">
                    <div style="text-align: center; border-bottom: 2px solid #4CAF50; padding-bottom: 15px; margin-bottom: 20px;">
                        <h1 style="color: #4CAF50; margin: 0; font-size: 24px;">NATURALAYAM</h1>
                        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Pure • Organic • Natural</p>
                    </div>

                    <h2 style="color: #2e7d32; margin-top: 0;">Your Order Has Arrived!</h2>
                    <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
                    <p>Good news! Your order <strong>${orderId}</strong> has been marked as delivered. Thank you for shopping with Naturalayam. We hope you enjoy your purchase.</p>

                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Delivered Item(s):</p>
                        <ul style="margin: 0; padding-left: 20px; color: #555;">
                            ${itemsListHtml}
                        </ul>
                    </div>

                    <p style="color: #555; font-size: 14px;">
                        If you have any feedback or questions regarding your order, feel free to reply or visit your account portal.
                    </p>

                    <p style="margin-top: 25px; font-size: 14px; color: #333;">
                        Thank you for being part of the Naturalayam family!<br/>
                        <strong>The Naturalayam Team</strong>
                    </p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Delivery confirmation email sent to ${email} for order ${orderId}`);
            } else {
                console.log(`[DEV MODE] Delivery Confirmation Email for ${email}:\n Order ID => ${orderId}\n Items => ${items?.map(i => i.productName).join(', ')}`);
            }
        } catch (error) {
            console.error('Error sending delivery confirmation email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Delivery Confirmation Email for ${email}:\n Order ID => ${orderId}`);
                return;
            }
            throw new Error('Failed to send delivery confirmation email');
        }
    }

    async sendOrderCancellationEmail(data: {
        email: string;
        customerName: string;
        orderId: string;
        items: Array<{ productName: string; quantity?: number }>;
        reason?: string;
        refundInfo?: string;
    }): Promise<void> {
        const { email, customerName, orderId, items, reason, refundInfo } = data;

        const itemsListHtml = (items || []).map(item => `
            <li style="margin-bottom: 6px;"><strong>${item.productName}</strong> ${item.quantity ? `(Qty: ${item.quantity})` : ''}</li>
        `).join('');

        const reasonHtml = reason ? `
            <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; margin: 15px 0; border-radius: 4px; color: #e65100;">
                <strong>Cancellation Reason:</strong> ${reason}
            </div>
        ` : '';

        const refundHtml = refundInfo ? `
            <div style="background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 12px; margin: 15px 0; border-radius: 4px; color: #2e7d32;">
                <strong>Refund Details:</strong> ${refundInfo}
            </div>
        ` : '';

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@naturalayam.com',
            to: email,
            subject: `Your Naturalayam Order Has Been Cancelled - ${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 650px; margin: 0 auto; line-height: 1.6;">
                    <div style="text-align: center; border-bottom: 2px solid #d32f2f; padding-bottom: 15px; margin-bottom: 20px;">
                        <h1 style="color: #333; margin: 0; font-size: 24px;">NATURALAYAM</h1>
                        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Pure • Organic • Natural</p>
                    </div>

                    <h2 style="color: #d32f2f; margin-top: 0;">Order Cancellation Confirmation</h2>
                    <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
                    <p>This is to confirm that the cancellation for your order <strong>${orderId}</strong> has been processed.</p>

                    ${reasonHtml}

                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Cancelled Item(s):</p>
                        <ul style="margin: 0; padding-left: 20px; color: #555;">
                            ${itemsListHtml}
                        </ul>
                    </div>

                    ${refundHtml}

                    <p style="color: #555; font-size: 14px; margin-top: 20px;">
                        If you have any questions regarding this cancellation, please feel free to contact our customer support.
                    </p>

                    <p style="margin-top: 25px; font-size: 14px; color: #333;">
                        Best regards,<br/>
                        <strong>The Naturalayam Team</strong>
                    </p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Order cancellation email sent to ${email} for order ${orderId}`);
            } else {
                console.log(`[DEV MODE] Order Cancellation Email for ${email}:\n Order ID => ${orderId}\n Reason => ${reason || 'N/A'}`);
            }
        } catch (error) {
            console.error('Error sending order cancellation email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Order Cancellation Email for ${email}:\n Order ID => ${orderId}`);
                return;
            }
            throw new Error('Failed to send order cancellation email');
        }
    }

    async sendReturnRefundConfirmationEmail(data: {
        email: string;
        customerName: string;
        orderId: string;
        items: Array<{ productName: string; quantity?: number }>;
        refundAmount: number;
        paymentMethod: string;
        transactionReference?: string;
    }): Promise<void> {
        const { email, customerName, orderId, items, refundAmount, paymentMethod, transactionReference } = data;

        const itemsListHtml = (items || []).map(item => `
            <li style="margin-bottom: 6px;"><strong>${item.productName}</strong> ${item.quantity ? `(Qty: ${item.quantity})` : ''}</li>
        `).join('');

        const txHtml = transactionReference ? `
            <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Reference / Txn ID:</strong></td>
                <td style="padding: 6px 0; color: #333;">${transactionReference}</td>
            </tr>
        ` : '';

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@naturalayam.com',
            to: email,
            subject: `Your Naturalayam Return and Refund Confirmation - ${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 650px; margin: 0 auto; line-height: 1.6;">
                    <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px;">
                        <h1 style="color: #4CAF50; margin: 0; font-size: 24px;">NATURALAYAM</h1>
                        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Pure • Organic • Natural</p>
                    </div>

                    <h2 style="color: #0284c7; margin-top: 0;">Return & Refund Confirmation</h2>
                    <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
                    <p>We are pleased to inform you that the return and refund for your order <strong>${orderId}</strong> has been successfully processed.</p>

                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 6px 0; color: #666; width: 45%;"><strong>Order ID:</strong></td>
                                <td style="padding: 6px 0; font-weight: bold; color: #333;">${orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #666;"><strong>Refund Amount:</strong></td>
                                <td style="padding: 6px 0; font-weight: bold; color: #2e7d32; font-size: 16px;">₹${Number(refundAmount).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #666;"><strong>Original Payment Method:</strong></td>
                                <td style="padding: 6px 0; color: #333;">${paymentMethod || 'Original Method'}</td>
                            </tr>
                            ${txHtml}
                        </table>
                    </div>

                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Returned Item(s):</p>
                        <ul style="margin: 0; padding-left: 20px; color: #555;">
                            ${itemsListHtml}
                        </ul>
                    </div>

                    <p style="color: #555; font-size: 14px;">
                        The refund will be credited back to your original payment method / source account within <strong>5–7 business days</strong>, depending on your bank's processing cycle.
                    </p>

                    <p style="margin-top: 25px; font-size: 14px; color: #333;">
                        Thank you for your patience and for choosing Naturalayam.<br/>
                        <strong>The Naturalayam Team</strong>
                    </p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Return & refund confirmation email sent to ${email} for order ${orderId}`);
            } else {
                console.log(`[DEV MODE] Return & Refund Email for ${email}:\n Order ID => ${orderId}\n Refund Amount => ₹${refundAmount}`);
            }
        } catch (error) {
            console.error('Error sending return & refund confirmation email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Return & Refund Email for ${email}:\n Order ID => ${orderId}`);
                return;
            }
            throw new Error('Failed to send return & refund confirmation email');
        }

    }
async sendCancellationApprovedEmail(data: {
    email: string;
    customerName: string;
    orderId: string;
    items: Array<{ productName: string; quantity?: number }>;
}): Promise<void> {
    const itemsHtml = data.items.map(item =>
        `<li>${item.productName} (Qty: ${item.quantity ?? 1})</li>`
    ).join('');

    await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: data.email,
        subject: `Cancellation Approved Successfully - ${data.orderId}`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <h2>Cancellation Approved Successfully</h2>
                <p>Dear ${data.customerName},</p>
                <p>Your cancellation request has been approved.</p>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <ul>${itemsHtml}</ul>
                <p>If you paid online, your refund will be processed separately
                after it is confirmed.</p>
                <p>Thank you for shopping with Naturalayam.</p>
            </div>
        `
    });
}

async sendReturnConfirmedEmail(data: {
    email: string;
    customerName: string;
    orderId: string;
    items: Array<{ productName: string; quantity?: number }>;
}): Promise<void> {
    const itemsHtml = data.items.map(item =>
        `<li>${item.productName} (Qty: ${item.quantity ?? 1})</li>`
    ).join('');

    await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: data.email,
        subject: `Return Confirmed Successfully - ${data.orderId}`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <h2>Return Confirmed Successfully</h2>
                <p>Dear ${data.customerName},</p>
                <p>Your returned item has been confirmed successfully.</p>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <ul>${itemsHtml}</ul>
                <p>If a refund is applicable, it will be communicated separately
                after the refund is confirmed.</p>
                <p>Thank you for shopping with Naturalayam.</p>
            </div>
        `
    });
}

async sendPaymentRefundedEmail(data: {
    email: string;
    customerName: string;
    orderId: string;
    items: Array<{ productName: string; quantity?: number }>;
    refundAmount: number;
    paymentMethod: string;
    transactionReference?: string;
}): Promise<void> {
    const itemsHtml = data.items.map(item =>
        `<li>${item.productName} (Qty: ${item.quantity ?? 1})</li>`
    ).join('');

    const transactionHtml = data.transactionReference
        ? `<p><strong>Transaction Reference:</strong> ${data.transactionReference}</p>`
        : '';

    await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: data.email,
        subject: `Your Payment Has Been Refunded Successfully - ${data.orderId}`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <h2>Payment Refunded Successfully</h2>
                <p>Dear ${data.customerName},</p>
                <p>Your payment refund has been confirmed successfully.</p>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <ul>${itemsHtml}</ul>
                <p><strong>Refund Amount:</strong> ₹${Number(data.refundAmount).toFixed(2)}</p>
                <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
                ${transactionHtml}
                <p>The amount may take 5–7 business days to reflect,
                depending on your payment provider.</p>
                <p>Thank you for shopping with Naturalayam.</p>
            </div>
        `
    });
}

    }



