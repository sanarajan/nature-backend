"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const tsyringe_1 = require("tsyringe");
const WalletModel_1 = require("../../infrastructure/database/models/WalletModel");
let WalletController = class WalletController {
    async getWallet(req, res) {
        try {
            const userId = req.user.id;
            const wallet = await WalletModel_1.WalletModel.findOne({ userId });
            if (!wallet) {
                res.status(404).json({ success: false, message: 'Wallet not found' });
                return;
            }
            res.status(200).json({
                success: true,
                data: { wallet }
            });
        }
        catch (error) {
            console.error('Get Wallet Error:', error);
            res.status(500).json({ success: false, message: 'Server Error Fetching Wallet' });
        }
    }
};
exports.WalletController = WalletController;
exports.WalletController = WalletController = __decorate([
    (0, tsyringe_1.injectable)()
], WalletController);
