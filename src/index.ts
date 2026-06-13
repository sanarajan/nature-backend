import 'dotenv/config';
import 'reflect-metadata';
import './infrastructure/config/infrastructure.container';
import './infrastructure/config/usecase.container';
import './infrastructure/config/container';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { connectDB } from './infrastructure/config/database';
import { seedUnits } from './infrastructure/database/seed/seedUnits';
import { seedReferralSettings } from './infrastructure/database/seed/seedReferralSettings';
import { seedLocations } from './utils/seedLocations';
import adminAuthRoutes from './interface/routes/admin/adminAuthRoutes';
import adminCategoryRoutes from './interface/routes/admin/adminCategoryRoutes';
import adminProductRoutes from './interface/routes/admin/adminProductRoutes';
import adminSubcategoryRoutes from './interface/routes/admin/adminSubcategoryRoutes';
import adminCouponRoutes from './interface/routes/admin/adminCouponRoutes';
import adminOrderRoutes from './interface/routes/admin/adminOrderRoutes';
import adminShippingAgencyRoutes from './interface/routes/admin/adminShippingAgencyRoutes';
import adminShippingChargeRoutes from './interface/routes/admin/adminShippingChargeRoutes';
import adminOfferRoutes from './interface/routes/admin/adminOfferRoutes';
import adminComboOfferRoutes from './interface/routes/admin/adminComboOfferRoutes';
import adminUserRoutes from './interface/routes/admin/adminUserRoutes';
import userAuthRoutes from './interface/routes/user/userAuthRoutes';
import userCategoryRoutes from './interface/routes/user/categoryRoutes';
import userProductRoutes from './interface/routes/user/productRoutes';
import userWishlistRoutes from './interface/routes/user/wishlistRoutes';
import userCartRoutes from './interface/routes/user/cartRoutes';
import userOrderRoutes from './interface/routes/user/userOrderRoutes';
import userWalletRoutes from './interface/routes/user/walletRoutes';
import userCouponRoutes from './interface/routes/user/couponRoutes';
import adminInfluencerRoutes from './interface/routes/admin/adminInfluencerRoutes';
import userInfluencerRoutes from './interface/routes/user/userInfluencerRoutes';
import { errorHandler } from './middleware/errorMiddleware';
import { startCommissionCron } from './infrastructure/jobs/CommissionCron';

// Exported models to ensure registration
import './infrastructure/database/models/CategoryModel';
import './infrastructure/database/models/SubCategoryModel';
import './infrastructure/database/models/ProductModel';
import './infrastructure/database/models/UnitModel';
import './infrastructure/database/models/CountryModel';
import './infrastructure/database/models/StateModel';
import './infrastructure/database/models/UserModel';
import './infrastructure/database/models/OrderModel';
import './infrastructure/database/models/CartModel';
import './infrastructure/database/models/WishlistModel';
import './infrastructure/database/models/AddressModel';
import './infrastructure/database/models/CouponModel';
import './infrastructure/database/models/OfferModel';
import './infrastructure/database/models/ComboOfferModel';
import './infrastructure/database/models/UserOTPVerificationModel';
import './infrastructure/database/models/WalletModel';
import './infrastructure/database/models/ReferralSettingModel';
import './infrastructure/database/models/ShippingChargeModel';
import './infrastructure/database/models/ShippingAgencyModel';



const app = express();

// Connect to Database
connectDB().then(() => {
    seedUnits();
    seedReferralSettings();
    seedLocations();
});

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
const corsOptions = {
    origin: [
        process.env.CLIENT_URL || "http://localhost:5173",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://nature-frontend-puce.vercel.app",
        "https://www.naturalayam.com"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization", "role"],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Note: app.use(cors()) already handles OPTIONS preflight automatically.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Universal Debug Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/subcategories', adminSubcategoryRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/coupon', adminCouponRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/shipping-agencies', adminShippingAgencyRoutes);
app.use('/api/admin/offers', adminOfferRoutes);
app.get('/api/admin/ping', (req, res) => res.json({ success: true, message: 'Server is reachable' }));
app.use('/api/admin/combo-listing', adminComboOfferRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/influencers', adminInfluencerRoutes);
app.use('/api/admin', adminShippingChargeRoutes);
app.use('/api/user/auth', userAuthRoutes);
app.use('/api/user/categories', userCategoryRoutes);
app.use('/api/user/products', userProductRoutes);
app.use('/api/user/wishlist', userWishlistRoutes);
app.use('/api/user/cart', userCartRoutes);
app.use('/api/user/order', userOrderRoutes);
app.use('/api/user/wallet', userWalletRoutes);
app.use('/api/user/coupon', userCouponRoutes);
app.use('/api/user/influencer', userInfluencerRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    
    // Start background jobs
    startCommissionCron();
});
