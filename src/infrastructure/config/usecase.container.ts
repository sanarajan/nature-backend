import { container } from 'tsyringe';
import { LoginUseCase } from '../../application/usecases/auth/LoginUseCase';
import { RegisterUseCase } from '../../application/usecases/auth/RegisterUseCase';
import { VerifyEmailUseCase } from '../../application/usecases/auth/VerifyEmailUseCase';
import { AuthService } from '../../application/services/AuthService';
import { SharedPricingService } from '../../application/services/SharedPricingService';
import {
    GetMeUseCase,
    UpdateProfileUseCase,
    GetUserAddressesUseCase,
    AddOrUpdateAddressUseCase,
    GetStatesUseCase
} from '../../application/usecases/user/UserUseCases';
import {
    GetCartUseCase,
    ToggleCartItemUseCase,
    UpdateCartItemQuantityUseCase,
    RemoveCartItemUseCase,
    SyncOfflineCartUseCase,
    CalculateCartTotalsUseCase
} from '../../application/usecases/cart/CartUseCases';
import {
    ToggleWishlistUseCase,
    GetWishlistUseCase,
    SyncWishlistUseCase
} from '../../application/usecases/cart/WishlistUseCases';
import {
    GetInfluencerDashboardUseCase,
    RequestWithdrawalUseCase,
    UpgradeToInfluencerUseCase,
    UpdateBankDetailsUseCase,
    GetWithdrawalHistoryUseCase,
    GetWithdrawalDetailsUseCase,
    GetUserNotificationsUseCase
} from '../../application/usecases/user/InfluencerUseCases';
import { TrackReferralVisitUseCase } from '../../application/usecases/user/TrackReferralVisitUseCase';
import { GetWalletUseCase } from '../../application/usecases/user/WalletUseCases';
import { GetActiveCouponsUseCase, ValidateCouponUseCase } from '../../application/usecases/coupon/CouponUseCases';
import {
    GetAllInfluencersUseCase,
    GetInfluencerStatsUseCase,
    UpdateInfluencerUseCase,
    GetWithdrawalRequestsUseCase,
    ProcessWithdrawalUseCase,
    ApproveWithdrawalUseCase,
    RejectWithdrawalUseCase,
    MarkWithdrawalPaidUseCase,
    GetInfluencerRequestsUseCase,
    ApproveInfluencerRequestUseCase,
    RejectInfluencerRequestUseCase as RejectInfluencerApplicationUseCase,
    GetInfluencerProductsUseCase,
    UpdateProductInfluencerDiscountUseCase
} from '../../application/usecases/admin/AdminInfluencerUseCases';
import {
    AddCouponUseCase,
    GetAllCouponsUseCase,
    GetCouponByIdUseCase,
    UpdateCouponUseCase,
    DeleteCouponUseCase,
    ToggleCouponStatusUseCase
} from '../../application/usecases/admin/AdminCouponUseCases';
import { GetCategoriesWithCountsUseCase, GetCategoryHierarchyUseCase } from '../../application/usecases/catalog/CategoryUseCases';
import { AddCategoryUseCase, GetAllCategoriesUseCase as AdminGetAllCategoriesUseCase, UpdateCategoryUseCase, DeleteCategoryUseCase } from '../../application/usecases/admin/AdminCategoryUseCases';

import { ForgotPasswordUseCase } from '../../application/usecases/auth/ForgotPasswordUseCase';
import { ResetPasswordUseCase } from '../../application/usecases/auth/ResetPasswordUseCase';
import { GoogleAuthService } from '../../application/services/GoogleAuthService';
import { GoogleAuthUseCase } from '../../application/usecases/auth/GoogleAuthUseCase';
import { SubmitContactFormUseCase } from '../../application/usecases/user/SubmitContactFormUseCase';

// Auth UseCases
container.registerSingleton<SharedPricingService>('ISharedPricingService', SharedPricingService);
container.registerSingleton<LoginUseCase>('ILoginUseCase', LoginUseCase);
container.registerSingleton<RegisterUseCase>('IRegisterUseCase', RegisterUseCase);
container.registerSingleton<VerifyEmailUseCase>('IVerifyEmailUseCase', VerifyEmailUseCase);
container.registerSingleton<ForgotPasswordUseCase>('IForgotPasswordUseCase', ForgotPasswordUseCase);
container.registerSingleton<ResetPasswordUseCase>('IResetPasswordUseCase', ResetPasswordUseCase);
container.registerSingleton<GoogleAuthService>('IGoogleAuthService', GoogleAuthService);
container.registerSingleton<GoogleAuthUseCase>('IGoogleAuthUseCase', GoogleAuthUseCase);

// Contact UseCases
container.registerSingleton<SubmitContactFormUseCase>('ISubmitContactFormUseCase', SubmitContactFormUseCase);

// User UseCases
container.registerSingleton<GetMeUseCase>('IGetMeUseCase', GetMeUseCase);
container.registerSingleton<UpdateProfileUseCase>('IUpdateProfileUseCase', UpdateProfileUseCase);
container.registerSingleton<GetUserAddressesUseCase>('IGetUserAddressesUseCase', GetUserAddressesUseCase);
container.registerSingleton<AddOrUpdateAddressUseCase>('IAddOrUpdateAddressUseCase', AddOrUpdateAddressUseCase);
container.registerSingleton<GetStatesUseCase>('IGetStatesUseCase', GetStatesUseCase);

// Cart UseCases
container.registerSingleton<GetCartUseCase>('IGetCartUseCase', GetCartUseCase);
container.registerSingleton<ToggleCartItemUseCase>('IToggleCartItemUseCase', ToggleCartItemUseCase);
container.registerSingleton<UpdateCartItemQuantityUseCase>('IUpdateCartItemQuantityUseCase', UpdateCartItemQuantityUseCase);
container.registerSingleton<RemoveCartItemUseCase>('IRemoveCartItemUseCase', RemoveCartItemUseCase);
container.registerSingleton<SyncOfflineCartUseCase>('ISyncOfflineCartUseCase', SyncOfflineCartUseCase);
container.registerSingleton<CalculateCartTotalsUseCase>('ICalculateCartTotalsUseCase', CalculateCartTotalsUseCase);

// Wishlist UseCases
container.registerSingleton<ToggleWishlistUseCase>('IToggleWishlistUseCase', ToggleWishlistUseCase);
container.registerSingleton<GetWishlistUseCase>('IGetWishlistUseCase', GetWishlistUseCase);
container.registerSingleton<SyncWishlistUseCase>('ISyncWishlistUseCase', SyncWishlistUseCase);

// Influencer UseCases
container.registerSingleton<GetInfluencerDashboardUseCase>('IGetInfluencerDashboardUseCase', GetInfluencerDashboardUseCase);
container.registerSingleton<RequestWithdrawalUseCase>('IRequestWithdrawalUseCase', RequestWithdrawalUseCase);
container.registerSingleton<UpgradeToInfluencerUseCase>('IUpgradeToInfluencerUseCase', UpgradeToInfluencerUseCase);
container.registerSingleton<TrackReferralVisitUseCase>('ITrackReferralVisitUseCase', TrackReferralVisitUseCase);
container.registerSingleton<UpdateBankDetailsUseCase>('IUpdateBankDetailsUseCase', UpdateBankDetailsUseCase);
container.registerSingleton<GetWithdrawalHistoryUseCase>('IGetWithdrawalHistoryUseCase', GetWithdrawalHistoryUseCase);
container.registerSingleton<GetWithdrawalDetailsUseCase>('IGetWithdrawalDetailsUseCase', GetWithdrawalDetailsUseCase);
container.registerSingleton<GetUserNotificationsUseCase>('IGetUserNotificationsUseCase', GetUserNotificationsUseCase);

// Wallet UseCases
container.registerSingleton<GetWalletUseCase>('IGetWalletUseCase', GetWalletUseCase);

// Coupon UseCases
container.registerSingleton<GetActiveCouponsUseCase>('IGetActiveCouponsUseCase', GetActiveCouponsUseCase);
container.registerSingleton<ValidateCouponUseCase>('IValidateCouponUseCase', ValidateCouponUseCase);

// Category UseCases
container.registerSingleton<GetCategoriesWithCountsUseCase>('IGetCategoriesWithCountsUseCase', GetCategoriesWithCountsUseCase);
container.registerSingleton<GetCategoryHierarchyUseCase>('IGetCategoryHierarchyUseCase', GetCategoryHierarchyUseCase);

// Admin Influencer UseCases
container.registerSingleton<GetAllInfluencersUseCase>('IGetAllInfluencersUseCase', GetAllInfluencersUseCase);
container.registerSingleton<GetInfluencerStatsUseCase>('IGetInfluencerStatsUseCase', GetInfluencerStatsUseCase);
container.registerSingleton<UpdateInfluencerUseCase>('IUpdateInfluencerUseCase', UpdateInfluencerUseCase);
container.registerSingleton<GetWithdrawalRequestsUseCase>('IGetWithdrawalRequestsUseCase', GetWithdrawalRequestsUseCase);
container.registerSingleton<ProcessWithdrawalUseCase>('IProcessWithdrawalUseCase', ProcessWithdrawalUseCase);
container.registerSingleton<ApproveWithdrawalUseCase>('IApproveWithdrawalUseCase', ApproveWithdrawalUseCase);
container.registerSingleton<RejectWithdrawalUseCase>('IRejectWithdrawalUseCase', RejectWithdrawalUseCase);
container.registerSingleton<MarkWithdrawalPaidUseCase>('IMarkWithdrawalPaidUseCase', MarkWithdrawalPaidUseCase);
container.registerSingleton<GetInfluencerRequestsUseCase>('IGetInfluencerRequestsUseCase', GetInfluencerRequestsUseCase);
container.registerSingleton<ApproveInfluencerRequestUseCase>('IApproveInfluencerRequestUseCase', ApproveInfluencerRequestUseCase);
container.registerSingleton<RejectInfluencerApplicationUseCase>('IRejectInfluencerRequestUseCase', RejectInfluencerApplicationUseCase);
container.registerSingleton<GetInfluencerProductsUseCase>('IGetInfluencerProductsUseCase', GetInfluencerProductsUseCase);
container.registerSingleton<UpdateProductInfluencerDiscountUseCase>('IUpdateProductInfluencerDiscountUseCase', UpdateProductInfluencerDiscountUseCase);

// Admin Coupon UseCases
container.registerSingleton<AddCouponUseCase>('IAddCouponUseCase', AddCouponUseCase);
container.registerSingleton<GetAllCouponsUseCase>('IGetAllCouponsUseCase', GetAllCouponsUseCase);
container.registerSingleton<GetCouponByIdUseCase>('IGetCouponByIdUseCase', GetCouponByIdUseCase);
container.registerSingleton<UpdateCouponUseCase>('IUpdateCouponUseCase', UpdateCouponUseCase);
container.registerSingleton<DeleteCouponUseCase>('IDeleteCouponUseCase', DeleteCouponUseCase);
container.registerSingleton<ToggleCouponStatusUseCase>('IToggleCouponStatusUseCase', ToggleCouponStatusUseCase);

// Admin Category UseCases
container.registerSingleton<AddCategoryUseCase>('IAddCategoryUseCase', AddCategoryUseCase);
container.registerSingleton<AdminGetAllCategoriesUseCase>('IGetAllCategoriesUseCase', AdminGetAllCategoriesUseCase);
container.registerSingleton<UpdateCategoryUseCase>('IUpdateCategoryUseCase', UpdateCategoryUseCase);
container.registerSingleton<DeleteCategoryUseCase>('IDeleteCategoryUseCase', DeleteCategoryUseCase);

// Admin Subcategory UseCases
import { AddSubcategoryUseCase, GetAllSubcategoriesUseCase, UpdateSubcategoryUseCase, DeleteSubcategoryUseCase } from '../../application/usecases/admin/AdminSubcategoryUseCases';
container.registerSingleton<AddSubcategoryUseCase>('IAddSubcategoryUseCase', AddSubcategoryUseCase);
container.registerSingleton<GetAllSubcategoriesUseCase>('IGetAllSubcategoriesUseCase', GetAllSubcategoriesUseCase);
container.registerSingleton<UpdateSubcategoryUseCase>('IUpdateSubcategoryUseCase', UpdateSubcategoryUseCase);
container.registerSingleton<DeleteSubcategoryUseCase>('IDeleteSubcategoryUseCase', DeleteSubcategoryUseCase);

// Admin Offer UseCases
import { AddOfferUseCase, GetAllOffersUseCase, UpdateOfferUseCase, DeleteOfferUseCase, ToggleOfferStatusUseCase } from '../../application/usecases/admin/AdminOfferUseCases';
container.registerSingleton<AddOfferUseCase>('IAddOfferUseCase', AddOfferUseCase);
container.registerSingleton<GetAllOffersUseCase>('IGetAllOffersUseCase', GetAllOffersUseCase);
container.registerSingleton<UpdateOfferUseCase>('IUpdateOfferUseCase', UpdateOfferUseCase);
container.registerSingleton<DeleteOfferUseCase>('IDeleteOfferUseCase', DeleteOfferUseCase);
container.registerSingleton<ToggleOfferStatusUseCase>('IToggleOfferStatusUseCase', ToggleOfferStatusUseCase);

// Admin ComboOffer UseCases
import { AddComboOfferUseCase, GetAllComboOffersUseCase, UpdateComboOfferUseCase, DeleteComboOfferUseCase, ToggleComboOfferStatusUseCase } from '../../application/usecases/admin/AdminComboOfferUseCases';
container.registerSingleton<AddComboOfferUseCase>('IAddComboOfferUseCase', AddComboOfferUseCase);
container.registerSingleton<GetAllComboOffersUseCase>('IGetAllComboOffersUseCase', GetAllComboOffersUseCase);
container.registerSingleton<UpdateComboOfferUseCase>('IUpdateComboOfferUseCase', UpdateComboOfferUseCase);
container.registerSingleton<DeleteComboOfferUseCase>('IDeleteComboOfferUseCase', DeleteComboOfferUseCase);
container.registerSingleton<ToggleComboOfferStatusUseCase>('IToggleComboOfferStatusUseCase', ToggleComboOfferStatusUseCase);

// Product UseCases
import { ProductUseCases } from '../../application/usecases/catalog/ProductUseCases';
container.registerSingleton<ProductUseCases>('IProductUseCases', ProductUseCases);

// Admin Product UseCases
import { GetProductOptionsUseCase, AddProductUseCase, AdminGetAllProductsUseCase, UpdateProductUseCase, DeleteProductUseCase, AdminGetProductByIdUseCase, ToggleProductHighlightUseCase } from '../../application/usecases/admin/AdminProductUseCases';
container.registerSingleton<GetProductOptionsUseCase>('IGetProductOptionsUseCase', GetProductOptionsUseCase);
container.registerSingleton<AddProductUseCase>('IAddProductUseCase', AddProductUseCase);
container.registerSingleton<AdminGetAllProductsUseCase>('IAdminGetAllProductsUseCase', AdminGetAllProductsUseCase);
container.registerSingleton<UpdateProductUseCase>('IUpdateProductUseCase', UpdateProductUseCase);
container.registerSingleton<DeleteProductUseCase>('IDeleteProductUseCase', DeleteProductUseCase);
container.registerSingleton<AdminGetProductByIdUseCase>('IAdminGetProductByIdUseCase', AdminGetProductByIdUseCase);
container.registerSingleton<ToggleProductHighlightUseCase>('IToggleProductHighlightUseCase', ToggleProductHighlightUseCase);

// Admin Shipping Agency UseCases
import { AddShippingAgencyUseCase, GetAllShippingAgenciesUseCase, UpdateShippingAgencyUseCase, DeleteShippingAgencyUseCase } from '../../application/usecases/admin/ShippingAgencyUseCases';
container.registerSingleton<AddShippingAgencyUseCase>('IAddShippingAgencyUseCase', AddShippingAgencyUseCase);
container.registerSingleton<GetAllShippingAgenciesUseCase>('IGetAllShippingAgenciesUseCase', GetAllShippingAgenciesUseCase);
container.registerSingleton<UpdateShippingAgencyUseCase>('IUpdateShippingAgencyUseCase', UpdateShippingAgencyUseCase);
container.registerSingleton<DeleteShippingAgencyUseCase>('IDeleteShippingAgencyUseCase', DeleteShippingAgencyUseCase);

// Admin Shipping Charge UseCases
import { GetShippingChargesUseCase, AddOrUpdateShippingChargeUseCase, DeleteShippingChargeUseCase, GetStatesUseCase as AdminGetStatesUseCase } from '../../application/usecases/admin/AdminShippingChargeUseCases';
container.registerSingleton<GetShippingChargesUseCase>('IGetShippingChargesUseCase', GetShippingChargesUseCase);
container.registerSingleton<AddOrUpdateShippingChargeUseCase>('IAddOrUpdateShippingChargeUseCase', AddOrUpdateShippingChargeUseCase);
container.registerSingleton<DeleteShippingChargeUseCase>('IDeleteShippingChargeUseCase', DeleteShippingChargeUseCase);
container.registerSingleton<AdminGetStatesUseCase>('IGetStatesUseCase', AdminGetStatesUseCase);

// Admin Order UseCases
import { GetAllOrdersUseCase, GetOrderByIdUseCase as AdminGetOrderByIdUseCase, UpdateOrderStatusUseCase, UpdatePaymentStatusUseCase, UpdateDeliveryDelayUseCase } from '../../application/usecases/admin/AdminOrderUseCases';
import { AdminReturnCancellationUseCases } from '../../application/usecases/admin/AdminReturnCancellationUseCases';
container.registerSingleton<GetAllOrdersUseCase>('IGetAllOrdersUseCase', GetAllOrdersUseCase);
container.registerSingleton<AdminGetOrderByIdUseCase>('IGetOrderByIdUseCase', AdminGetOrderByIdUseCase);
container.registerSingleton<UpdateOrderStatusUseCase>('IUpdateOrderStatusUseCase', UpdateOrderStatusUseCase);
container.registerSingleton<UpdateDeliveryDelayUseCase>('IUpdateDeliveryDelayUseCase', UpdateDeliveryDelayUseCase);
container.registerSingleton<UpdatePaymentStatusUseCase>('IUpdatePaymentStatusUseCase', UpdatePaymentStatusUseCase);
container.registerSingleton<AdminReturnCancellationUseCases>('IAdminReturnCancellationUseCases', AdminReturnCancellationUseCases);

// User Order UseCases
import { PlaceOrderUseCase, VerifyPaymentUseCase, HandleRazorpayWebhookUseCase, GetUserOrdersUseCase, GetUserOrderDetailsUseCase, RequestCancellationUseCase, RequestItemCancellationUseCase, RequestReturnUseCase, RequestItemReturnUseCase, GetShippingChargeUseCase } from '../../application/usecases/catalog/UserOrderUseCases';
import { CalculateCheckoutTotalsUseCase } from '../../application/usecases/catalog/CalculateCheckoutTotalsUseCase';
container.registerSingleton<PlaceOrderUseCase>('IPlaceOrderUseCase', PlaceOrderUseCase);
container.registerSingleton<VerifyPaymentUseCase>('IVerifyPaymentUseCase', VerifyPaymentUseCase);
container.registerSingleton<HandleRazorpayWebhookUseCase>('IHandleRazorpayWebhookUseCase', HandleRazorpayWebhookUseCase);
container.registerSingleton<GetUserOrdersUseCase>('IGetUserOrdersUseCase', GetUserOrdersUseCase);
container.registerSingleton<GetUserOrderDetailsUseCase>('IGetUserOrderDetailsUseCase', GetUserOrderDetailsUseCase);
container.registerSingleton<RequestCancellationUseCase>('IRequestCancellationUseCase', RequestCancellationUseCase);
container.registerSingleton<RequestItemCancellationUseCase>('IRequestItemCancellationUseCase', RequestItemCancellationUseCase);
container.registerSingleton<RequestReturnUseCase>('IRequestReturnUseCase', RequestReturnUseCase);
container.registerSingleton<RequestItemReturnUseCase>('IRequestItemReturnUseCase', RequestItemReturnUseCase);
container.registerSingleton<GetShippingChargeUseCase>('IGetShippingChargeUseCase', GetShippingChargeUseCase);
container.registerSingleton<CalculateCheckoutTotalsUseCase>('ICalculateCheckoutTotalsUseCase', CalculateCheckoutTotalsUseCase);

// Application Services
container.registerSingleton<AuthService>('IAuthService', AuthService);

// Admin Influencer Settings UseCases
import { GetInfluencerSettingsUseCase, UpdateInfluencerSettingsUseCase } from '../../application/usecases/admin/InfluencerSettingUseCases';
container.registerSingleton<GetInfluencerSettingsUseCase>('IGetInfluencerSettingsUseCase', GetInfluencerSettingsUseCase);
container.registerSingleton<UpdateInfluencerSettingsUseCase>('IUpdateInfluencerSettingsUseCase', UpdateInfluencerSettingsUseCase);

// Staff UseCases
import {
    CreateStaffUseCase,
    GetStaffListUseCase,
    GetStaffDetailsUseCase,
    UpdateStaffUseCase,
    ActivateStaffUseCase,
    DeactivateStaffUseCase,
    BlockStaffUseCase,
    UnblockStaffUseCase
} from '../../application/usecases/admin/AdminStaffUseCases';

container.registerSingleton(CreateStaffUseCase);
container.registerSingleton(GetStaffListUseCase);
container.registerSingleton(GetStaffDetailsUseCase);
container.registerSingleton(UpdateStaffUseCase);
container.registerSingleton(ActivateStaffUseCase);
container.registerSingleton(DeactivateStaffUseCase);
container.registerSingleton(BlockStaffUseCase);
container.registerSingleton(UnblockStaffUseCase);

// Spin Wheel UseCases
import { AdminSpinWheelUseCases } from '../../application/usecases/admin/AdminSpinWheelUseCases';
import { UserSpinWheelUseCases } from '../../application/usecases/user/UserSpinWheelUseCases';
container.registerSingleton(AdminSpinWheelUseCases);
container.registerSingleton(UserSpinWheelUseCases);

// Certification UseCases
import { AdminCertificationUseCases } from '../../application/usecases/admin/AdminCertificationUseCases';
import { UserCertificationUseCases } from '../../application/usecases/user/UserCertificationUseCases';
container.registerSingleton(AdminCertificationUseCases);
container.registerSingleton(UserCertificationUseCases);

