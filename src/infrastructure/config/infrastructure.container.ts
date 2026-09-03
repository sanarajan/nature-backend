import { container } from 'tsyringe';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserRepository } from '../database/repositories/UserRepository';
import { ICartRepository } from '../../domain/repositories/ICartRepository';
import { CartRepository } from '../database/repositories/CartRepository';
import { IWishlistRepository } from '../../domain/repositories/ICartRepository';
import { WishlistRepository } from '../database/repositories/WishlistRepository';
import { IStateRepository } from '../../domain/repositories/ILocationRepository';
import { StateRepository } from '../database/repositories/LocationRepository';
import { IWalletRepository } from '../../domain/repositories/IWalletRepository';
import { WalletRepository } from '../database/repositories/WalletRepository';
import { IWithdrawalRequestRepository } from '../../domain/repositories/IWithdrawalRequestRepository';
import { WithdrawalRequestRepository } from '../database/repositories/WithdrawalRequestRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderRepository } from '../database/repositories/OrderRepository';
import { ICouponRepository } from '../../domain/repositories/ICouponRepository';
import { CouponRepository } from '../database/repositories/CouponRepository';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { CategoryRepository } from '../database/repositories/CategoryRepository';
import { ISubCategoryRepository } from '../../domain/repositories/ISubCategoryRepository';
import { SubCategoryRepository } from '../database/repositories/SubCategoryRepository';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ProductRepository } from '../database/repositories/ProductRepository';
import { IOfferRepository } from '../../domain/repositories/IOfferRepository';
import { OfferRepository } from '../database/repositories/OfferRepository';
import { IComboOfferRepository } from '../../domain/repositories/IComboOfferRepository';
import { ComboOfferRepository } from '../database/repositories/ComboOfferRepository';
import { IUnitRepository } from '../../domain/repositories/IUnitRepository';
import { UnitRepository } from '../database/repositories/UnitRepository';
import { IShippingAgencyRepository } from '../../domain/repositories/IShippingAgencyRepository';
import { ShippingAgencyRepository } from '../database/repositories/ShippingAgencyRepository';
import { IShippingChargeRepository } from '../../domain/repositories/IShippingChargeRepository';
import { ShippingChargeRepository } from '../database/repositories/ShippingChargeRepository';
import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { AddressRepository } from '../database/repositories/AddressRepository';
import { IReferralSettingRepository } from '../../domain/repositories/IReferralSettingRepository';
import { ReferralSettingRepository } from '../database/repositories/ReferralSettingRepository';
import { IInfluencerSettingRepository } from '../../domain/repositories/IInfluencerSettingRepository';
import { InfluencerSettingRepository } from '../database/repositories/InfluencerSettingRepository';
import { IInfluencerReferralVisitRepository } from '../../domain/repositories/IInfluencerReferralVisitRepository';
import { InfluencerReferralVisitRepository } from '../database/repositories/InfluencerReferralVisitRepository';
import { IStaffRepository } from '../../domain/repositories/IStaffRepository';
import { StaffRepository } from '../database/repositories/StaffRepository';

import { EmailService } from '../services/EmailService';
import { JwtService } from '../services/JwtService';
import { PasswordService } from '../services/PasswordService';
import { RazorpayService } from '../services/RazorpayService';

// Register Infrastructure Dependencies
    container.registerSingleton<IUserRepository>('IUserRepository', UserRepository);
    container.registerSingleton<ICartRepository>('ICartRepository', CartRepository);
    container.registerSingleton<IWishlistRepository>('IWishlistRepository', WishlistRepository);
    container.registerSingleton<IStateRepository>('IStateRepository', StateRepository);
        container.registerSingleton<IWalletRepository>('IWalletRepository', WalletRepository);
    container.registerSingleton<IWithdrawalRequestRepository>('IWithdrawalRequestRepository', WithdrawalRequestRepository);
    container.registerSingleton<IOrderRepository>('IOrderRepository', OrderRepository);
    container.registerSingleton<ICouponRepository>('ICouponRepository', CouponRepository);
    container.registerSingleton<ICategoryRepository>('ICategoryRepository', CategoryRepository);
    container.registerSingleton<ISubCategoryRepository>('ISubCategoryRepository', SubCategoryRepository);
    container.registerSingleton<IProductRepository>('IProductRepository', ProductRepository);
    container.registerSingleton<IOfferRepository>('IOfferRepository', OfferRepository);
    container.registerSingleton<IComboOfferRepository>('IComboOfferRepository', ComboOfferRepository);
    container.registerSingleton<IUnitRepository>('IUnitRepository', UnitRepository);
    container.registerSingleton<IStaffRepository>('IStaffRepository', StaffRepository);

    container.registerSingleton<IShippingAgencyRepository>('IShippingAgencyRepository', ShippingAgencyRepository);
    container.registerSingleton<IShippingChargeRepository>('IShippingChargeRepository', ShippingChargeRepository);
    container.registerSingleton<IAddressRepository>('IAddressRepository', AddressRepository);
    container.registerSingleton<IReferralSettingRepository>('IReferralSettingRepository', ReferralSettingRepository);
    container.registerSingleton<IInfluencerSettingRepository>('IInfluencerSettingRepository', InfluencerSettingRepository);
    container.registerSingleton<IInfluencerReferralVisitRepository>('IInfluencerReferralVisitRepository', InfluencerReferralVisitRepository);

import { ISpinWheelRepository } from '../../domain/repositories/ISpinWheelRepository';
import { SpinWheelRepository } from '../database/repositories/SpinWheelRepository';

    container.registerSingleton<ISpinWheelRepository>('ISpinWheelRepository', SpinWheelRepository);

import { ICertificationRepository } from '../../domain/repositories/ICertificationRepository';
import { CertificationRepository } from '../database/repositories/CertificationRepository';
    container.registerSingleton<ICertificationRepository>('ICertificationRepository', CertificationRepository);

    // Services
    container.registerSingleton<EmailService>('IEmailService', EmailService);
    container.registerSingleton<JwtService>('IJwtService', JwtService);
    container.registerSingleton<PasswordService>('IPasswordService', PasswordService);
    container.registerSingleton<RazorpayService>('IRazorpayService', RazorpayService);
