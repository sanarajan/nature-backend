"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const UserRole_1 = require("../../constants/enums/UserRole");
class User {
    id;
    email;
    displayName;
    username;
    phoneNumber;
    password;
    role;
    verified;
    imageUrl;
    referralId;
    referredBy;
    addresses;
    createdAt;
    updatedAt;
    constructor(id, email, displayName, username, phoneNumber, password, role = UserRole_1.UserRole.USER, verified = false, imageUrl, referralId, referredBy, addresses = [], createdAt = new Date(), updatedAt = new Date()) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
        this.username = username;
        this.phoneNumber = phoneNumber;
        this.password = password;
        this.role = role;
        this.verified = verified;
        this.imageUrl = imageUrl;
        this.referralId = referralId;
        this.referredBy = referredBy;
        this.addresses = addresses;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
exports.User = User;
