"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const tsyringe_1 = require("tsyringe");
let EmailService = class EmailService {
    transporter;
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: Number(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER || 'test@example.com',
                pass: process.env.EMAIL_PASS || 'password',
            },
        });
    }
    async sendVerificationEmail(email, otp) {
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
            }
            else {
                console.log(`[DEV MODE] Verification Link for ${email}:\n => ${verificationLink}`);
            }
        }
        catch (error) {
            console.error('Error sending verification email:', error);
            // In dev mode gracefully fallback to console
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Verification Link for ${email}:\n => ${verificationLink}`);
                return;
            }
            throw new Error('Failed to send verification email');
        }
    }
    async sendWelcomeWithReferralEmail(email, referralId, offerPercentage, joiningDiscount) {
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
            }
            else {
                console.log(`[DEV MODE] Welcome/Referral email for ${email}:\n Referral Code => ${referralId} with ${offerPercentage}%`);
            }
        }
        catch (error) {
            console.error('Error sending welcome/referral email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Welcome/Referral email for ${email}:\n Referral Code => ${referralId} with ${offerPercentage}%`);
                return;
            }
            throw new Error('Failed to send welcome/referral email');
        }
    }
    async sendShippingEmail(email, orderId, productName, agencyName, trackingNumber, trackingUrl) {
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

                    <p>You can track your package using the link below:</p>
                    <a href="${trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Your Order</a>
                    
                    <p style="margin-top: 20px;">Or copy and paste this link into your browser:<br/>
                    <a href="${trackingUrl}">${trackingUrl}</a></p>
                    
                    <p>Thank you for shopping with Naturalayam!</p>
                </div>
            `,
        };
        try {
            if (process.env.EMAIL_USER) {
                await this.transporter.sendMail(mailOptions);
                console.log(`Shipping email sent to ${email} for order ${orderId}`);
            }
            else {
                console.log(`[DEV MODE] Shipping Email for ${email}:\n Product => ${productName}\n Agency => ${agencyName}\n Tracking => ${trackingNumber}\n URL => ${trackingUrl}`);
            }
        }
        catch (error) {
            console.error('Error sending shipping email:', error);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[DEV MODE] Shipping Email for ${email}:\n Product => ${productName}\n Agency => ${agencyName}\n Tracking => ${trackingNumber}\n URL => ${trackingUrl}`);
                return;
            }
            throw new Error('Failed to send shipping email');
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
