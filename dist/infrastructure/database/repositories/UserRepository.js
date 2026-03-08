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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const tsyringe_1 = require("tsyringe");
const User_1 = require("../../../domain/entities/User");
const UserModel_1 = require("../models/UserModel");
const BaseRepository_1 = require("./BaseRepository");
let UserRepository = class UserRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(UserModel_1.UserModel);
    }
    async findByEmail(email) {
        return this.findOne({ email });
    }
    async findByPhoneNumber(phoneNumber) {
        return this.findOne({ phoneNumber });
    }
    async findById(id) {
        const userDoc = await UserModel_1.UserModel.findById(id).populate('address_ids').exec();
        return userDoc ? this.mapToEntity(userDoc) : null;
    }
    mapToEntity(userDoc) {
        return new User_1.User(userDoc._id.toString(), userDoc.email || '', userDoc.displayName, userDoc.username, userDoc.phoneNumber, userDoc.password, userDoc.role, userDoc.verified || false, userDoc.imageUrl, userDoc.referralId, userDoc.referredBy?.toString(), (userDoc.address_ids || []).map((addr) => ({
            id: addr._id.toString(),
            ...addr.toObject ? addr.toObject() : addr
        })), userDoc.createdAt, userDoc.updatedAt);
    }
    mapToDocument(user) {
        return {
            email: user.email,
            displayName: user.displayName,
            username: user.username,
            phoneNumber: user.phoneNumber,
            password: user.password,
            role: user.role,
            verified: user.verified,
            imageUrl: user.imageUrl,
            referralId: user.referralId,
            referredBy: user.referredBy,
        };
    }
    // Override save for custom email-based upsert logic
    async save(user) {
        let query = {};
        if (user.id) {
            query = { _id: user.id };
        }
        else if (user.email) {
            query = { email: user.email };
        }
        else if (user.phoneNumber) {
            query = { phoneNumber: user.phoneNumber };
        }
        const userDoc = await UserModel_1.UserModel.findOneAndUpdate(query, this.mapToDocument(user), { upsert: true, new: true });
        return this.mapToEntity(userDoc);
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], UserRepository);
