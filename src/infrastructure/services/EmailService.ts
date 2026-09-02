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
        const verificationLink = `${clientUrl}/verify-email?email=${encodeURIComponent(email)}&token=${otp}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@nature.com',
            to: email,
            subject: 'Verify Your Email Address',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Email Verification</h2>
                    <p>Thank you for registering. Please click the button below to verify your email address:</p>
                    <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
                    <p>Or copy and paste this link in your browser: <br/> <a href="${verificationLink}">${verificationLink}</a></p>
                    <p>This link will expire in 5 minutes.</p>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
            `,
        };

        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Verification email sent to ${email}`);
            } else {
                console.log(`[DEV MODE] Verification Link for ${email}:\n => ${verificationLink}`);
            }
        } catch (error) {
            console.error('Error sending verification email:', error);
            // In dev mode gracefully fallback to console
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Verification Link for ${email}:\n => ${verificationLink}`);
                return;
            }
            throw new Error('Failed to send verification email');
        }
    }

    async sendWelcomeWithReferralEmail(email: string, referralId: string, offerPercentage: number, joiningDiscount: number): Promise<void> {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@nature.com',
            to: email,
            subject: 'Welcome to Naturalayam - Here is your Referral Code!',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Welcome to Naturalayam!</h2>
                    <p>Your email has been successfully verified.</p>
                    <p>We are excited to share your unique referral code:</p>
                    <h3 style="background-color: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px; color: #333;">${referralId}</h3>
                    <p>Share this code with your friends!</p>
                    <p>When they use your code, <strong>they get ${joiningDiscount}% off</strong> their first order, and <strong>you earn a ${offerPercentage}%</strong> reward!</p>
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
            to: 'info@naturalayam.com',
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
}

