import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import {
    IAddCouponUseCase,
    IGetAllCouponsUseCase,
    IGetCouponByIdUseCase,
    IUpdateCouponUseCase,
    IDeleteCouponUseCase,
    IToggleCouponStatusUseCase
} from '../../application/interfaces/admin/IAdminCouponUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

@injectable()
export class AdminCouponController {
    constructor(
        @inject('IAddCouponUseCase') private addCouponUseCase: IAddCouponUseCase,
        @inject('IGetAllCouponsUseCase') private getAllCouponsUseCase: IGetAllCouponsUseCase,
        @inject('IGetCouponByIdUseCase') private getCouponByIdUseCase: IGetCouponByIdUseCase,
        @inject('IUpdateCouponUseCase') private updateCouponUseCase: IUpdateCouponUseCase,
        @inject('IDeleteCouponUseCase') private deleteCouponUseCase: IDeleteCouponUseCase,
        @inject('IToggleCouponStatusUseCase') private toggleCouponStatusUseCase: IToggleCouponStatusUseCase
    ) {}

    async addCoupon(req: Request, res: Response): Promise<void> {
        try {
            const newCoupon = await this.addCouponUseCase.execute(req.body);
            res.status(STATUS_CODES.CREATED).json({ success: true, message: 'Coupon added successfully!', data: newCoupon });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Server error adding coupon' });
        }
    }

    async getAllCoupons(req: Request, res: Response): Promise<void> {
        try {
            const coupons = await this.getAllCouponsUseCase.execute();
            res.status(STATUS_CODES.OK).json({ success: true, data: coupons });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Server error fetching coupons' });
        }
    }

    async getCouponById(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const coupon = await this.getCouponByIdUseCase.execute(id);
            res.status(STATUS_CODES.OK).json({ success: true, data: coupon });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Server error fetching coupon' });
        }
    }

    async updateCoupon(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const coupon = await this.updateCouponUseCase.execute(id, req.body);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Coupon updated successfully!', data: coupon });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Server error updating coupon' });
        }
    }

    async deleteCoupon(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            await this.deleteCouponUseCase.execute(id);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Coupon deleted successfully!' });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Server error deleting coupon' });
        }
    }

    async toggleCouponStatus(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const coupon = await this.toggleCouponStatusUseCase.execute(id);
            res.status(STATUS_CODES.OK).json({ success: true, message: `Coupon ${coupon.status ? 'activated' : 'deactivated'} successfully`, data: coupon });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
}
