import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './infrastructure/config/database';
import { seedUnits } from './infrastructure/database/seed/seedUnits';
import { seedReferralSettings } from './infrastructure/database/seed/seedReferralSettings';
import { seedLocations } from './seedLocations';
import adminAuthRoutes from './interface/routes/admin/adminAuthRoutes';
import adminCategoryRoutes from './interface/routes/admin/adminCategoryRoutes';
import adminProductRoutes from './interface/routes/admin/adminProductRoutes';
import adminSubcategoryRoutes from './interface/routes/admin/adminSubcategoryRoutes';
import adminCouponRoutes from './interface/routes/admin/adminCouponRoutes';
import adminOrderRoutes from './interface/routes/admin/adminOrderRoutes';
import adminShippingAgencyRoutes from './interface/routes/admin/adminShippingAgencyRoutes';
import adminShippingChargeRoutes from './interface/routes/admin/adminShippingChargeRoutes';
import userAuthRoutes from './interface/routes/user/userAuthRoutes';
import userCategoryRoutes from './interface/routes/user/categoryRoutes';
import userProductRoutes from './interface/routes/user/productRoutes';
import userWishlistRoutes from './interface/routes/user/wishlistRoutes';
import userCartRoutes from './interface/routes/user/cartRoutes';
import userOrderRoutes from './interface/routes/user/userOrderRoutes';
import userWalletRoutes from './interface/routes/user/walletRoutes';
import userCouponRoutes from './interface/routes/user/couponRoutes';
import { errorHandler } from './middleware/errorMiddleware';

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
import './infrastructure/database/models/UserOTPVerificationModel';
import './infrastructure/database/models/WalletModel';
import './infrastructure/database/models/ReferralSettingModel';
import './infrastructure/database/models/ShippingChargeModel';
import './infrastructure/database/models/ShippingAgencyModel';

dotenv.config();

const app = express();

// Connect to Database
connectDB().then(() => {
    seedUnits();
    seedReferralSettings();
    seedLocations();
});

// Middleware
app.use(helmet());
const corsOptions = {
  origin: [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://nature-frontend-puce.vercel.app"
  ],
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","role"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());
// Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/subcategories', adminSubcategoryRoutes);
app.use('/api/admin/coupon', adminCouponRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/shipping-agencies', adminShippingAgencyRoutes);
app.use('/api/admin', adminShippingChargeRoutes);
app.use('/api/user/auth', userAuthRoutes);
app.use('/api/user/categories', userCategoryRoutes);
app.use('/api/user/products', userProductRoutes);
app.use('/api/user/wishlist', userWishlistRoutes);
app.use('/api/user/cart', userCartRoutes);
app.use('/api/user/order', userOrderRoutes);
app.use('/api/user/wallet', userWalletRoutes);
app.use('/api/user/coupon', userCouponRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
