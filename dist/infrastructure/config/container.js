"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
require("reflect-metadata");
const tsyringe_1 = require("tsyringe");
Object.defineProperty(exports, "container", { enumerable: true, get: function () { return tsyringe_1.container; } });
const UserRepository_1 = require("../database/repositories/UserRepository");
const LoginUseCase_1 = require("../../application/usecases/LoginUseCase");
const RegisterUseCase_1 = require("../../application/usecases/RegisterUseCase");
const VerifyEmailUseCase_1 = require("../../application/usecases/VerifyEmailUseCase");
const AuthService_1 = require("../../application/services/AuthService");
const EmailService_1 = require("../services/EmailService");
// Infrastructure
tsyringe_1.container.registerSingleton('IUserRepository', UserRepository_1.UserRepository);
tsyringe_1.container.registerSingleton('EmailService', EmailService_1.EmailService);
// Application
tsyringe_1.container.registerSingleton('ILoginUseCase', LoginUseCase_1.LoginUseCase);
tsyringe_1.container.registerSingleton('RegisterUseCase', RegisterUseCase_1.RegisterUseCase);
tsyringe_1.container.registerSingleton('VerifyEmailUseCase', VerifyEmailUseCase_1.VerifyEmailUseCase);
tsyringe_1.container.registerSingleton('AuthService', AuthService_1.AuthService);
