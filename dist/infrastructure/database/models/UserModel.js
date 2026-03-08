"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserRole_1 = require("../../../constants/enums/UserRole");
const userSchema = new mongoose_1.Schema({
    username: { type: String, required: false, unique: true, sparse: true },
    email: { type: String, required: false, unique: true, sparse: true },
    displayName: { type: String },
    password: { type: String, required: false },
    phoneNumber: { type: String, required: false, unique: true, sparse: true, default: null },
    googleId: { type: String, unique: true, sparse: true },
    userType: { type: Number, default: 2 }, // 1 for admin, 2 for regular users
    isActive: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    imageUrl: { type: String, required: false },
    address_ids: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Address' }],
    referralId: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: Object.values(UserRole_1.UserRole), default: UserRole_1.UserRole.USER } // Keep for backward compatibility
}, { timestamps: true });
// Hash password before saving
userSchema.pre('save', function (next) {
    if (!this.isModified('password') || !this.password)
        return next();
    const salt = bcryptjs_1.default.genSaltSync(10);
    this.password = bcryptjs_1.default.hashSync(this.password, salt);
    next();
});
exports.UserModel = mongoose_1.default.model('User', userSchema);
