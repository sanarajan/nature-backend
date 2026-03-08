"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./infrastructure/config/database");
const seedUnits_1 = require("./infrastructure/database/seed/seedUnits");
const seedReferralSettings_1 = require("./infrastructure/database/seed/seedReferralSettings");
const seedLocations_1 = require("./seedLocations");
const adminAuthRoutes_1 = __importDefault(require("./interface/routes/admin/adminAuthRoutes"));
const adminCategoryRoutes_1 = __importDefault(require("./interface/routes/admin/adminCategoryRoutes"));
const adminProductRoutes_1 = __importDefault(require("./interface/routes/admin/adminProductRoutes"));
const adminSubcategoryRoutes_1 = __importDefault(require("./interface/routes/admin/adminSubcategoryRoutes"));
const adminCouponRoutes_1 = __importDefault(require("./interface/routes/admin/adminCouponRoutes"));
const adminOrderRoutes_1 = __importDefault(require("./interface/routes/admin/adminOrderRoutes"));
const adminShippingAgencyRoutes_1 = __importDefault(require("./interface/routes/admin/adminShippingAgencyRoutes"));
const userAuthRoutes_1 = __importDefault(require("./interface/routes/user/userAuthRoutes"));
const categoryRoutes_1 = __importDefault(require("./interface/routes/user/categoryRoutes"));
const productRoutes_1 = __importDefault(require("./interface/routes/user/productRoutes"));
const wishlistRoutes_1 = __importDefault(require("./interface/routes/user/wishlistRoutes"));
const cartRoutes_1 = __importDefault(require("./interface/routes/user/cartRoutes"));
const userOrderRoutes_1 = __importDefault(require("./interface/routes/user/userOrderRoutes"));
const walletRoutes_1 = __importDefault(require("./interface/routes/user/walletRoutes"));
const couponRoutes_1 = __importDefault(require("./interface/routes/user/couponRoutes"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
// Exported models to ensure registration
require("./infrastructure/database/models/CategoryModel");
require("./infrastructure/database/models/SubCategoryModel");
require("./infrastructure/database/models/ProductModel");
require("./infrastructure/database/models/UnitModel");
require("./infrastructure/database/models/CountryModel");
require("./infrastructure/database/models/StateModel");
require("./infrastructure/database/models/UserModel");
require("./infrastructure/database/models/OrderModel");
require("./infrastructure/database/models/CartModel");
require("./infrastructure/database/models/WishlistModel");
require("./infrastructure/database/models/AddressModel");
require("./infrastructure/database/models/CouponModel");
require("./infrastructure/database/models/OfferModel");
require("./infrastructure/database/models/UserOTPVerificationModel");
require("./infrastructure/database/models/WalletModel");
require("./infrastructure/database/models/ReferralSettingModel");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Connect to Database
(0, database_1.connectDB)().then(() => {
    (0, seedUnits_1.seedUnits)();
    (0, seedReferralSettings_1.seedReferralSettings)();
    (0, seedLocations_1.seedLocations)();
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        process.env.CLIENT_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'http://localhost:5174'
    ],
    credentials: true
}));
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
app.use((0, cookie_parser_1.default)());
// Routes
app.use('/api/admin/auth', adminAuthRoutes_1.default);
app.use('/api/admin/categories', adminCategoryRoutes_1.default);
app.use('/api/admin/products', adminProductRoutes_1.default);
app.use('/api/admin/subcategories', adminSubcategoryRoutes_1.default);
app.use('/api/admin/coupon', adminCouponRoutes_1.default);
app.use('/api/admin/orders', adminOrderRoutes_1.default);
app.use('/api/admin/shipping-agencies', adminShippingAgencyRoutes_1.default);
app.use('/api/user/auth', userAuthRoutes_1.default);
app.use('/api/user/categories', categoryRoutes_1.default);
app.use('/api/user/products', productRoutes_1.default);
app.use('/api/user/wishlist', wishlistRoutes_1.default);
app.use('/api/user/cart', cartRoutes_1.default);
app.use('/api/user/order', userOrderRoutes_1.default);
app.use('/api/user/wallet', walletRoutes_1.default);
app.use('/api/user/coupon', couponRoutes_1.default);
// Error Handler
app.use(errorMiddleware_1.errorHandler);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
