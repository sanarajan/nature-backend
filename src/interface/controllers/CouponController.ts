import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { IGetActiveCouponsUseCase, IValidateCouponUseCase } from '../../application/interfaces/coupon/ICouponUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

@injectable()
export class CouponController {
    constructor(
        @inject('IGetActiveCouponsUseCase') private getActiveCouponsUseCase: IGetActiveCouponsUseCase,
        @inject('IValidateCouponUseCase') private validateCouponUseCase: IValidateCouponUseCase
    ) {}

    async getActiveCoupons(req: Request, res: Response): Promise<void> {
        try {
            const coupons = await this.getActiveCouponsUseCase.execute();

            res.status(STATUS_CODES.OK).json({
                success: true,
                data: { coupons }
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message || 'Server error' 
            });
        }
    }

    async validateCoupon(req: Request, res: Response): Promise<void> {
        try {
            const { code, amount } = req.body;
            const purchaseAmount = Number(amount);

            const coupon = await this.validateCouponUseCase.execute(code, purchaseAmount);

            res.status(STATUS_CODES.OK).json({
                success: true,
                data: { coupon }
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message || 'Server error' 
            });
        }
    }
}
