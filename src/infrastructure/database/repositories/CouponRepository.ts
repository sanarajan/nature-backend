import { injectable } from 'tsyringe';
import { ICouponRepository } from '../../../domain/repositories/ICouponRepository';
import { CouponModel } from '../models/CouponModel';

@injectable()
export class CouponRepository implements ICouponRepository {
    async findActiveCoupons(currentDate: Date): Promise<any[]> {
        return CouponModel.find({
            status: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        }).sort({ endDate: 1 }).exec();
    }

    async findActiveCouponByCode(code: string, currentDate: Date): Promise<any | null> {
        return CouponModel.findOne({
            couponName: { $regex: new RegExp(`^${code}$`, 'i') },
            status: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        }).exec();
    }

    async findAll(): Promise<any[]> {
        return CouponModel.find().sort({ createdAt: -1 }).exec();
    }

    async findById(id: string): Promise<any | null> {
        return CouponModel.findById(id).exec();
    }

    async findByName(name: string): Promise<any | null> {
        return CouponModel.findOne({
            couponName: { $regex: new RegExp(`^${name}$`, 'i') }
        }).exec();
    }

    async findByNameExcludeId(name: string, excludeId: string): Promise<any | null> {
        return CouponModel.findOne({
            _id: { $ne: excludeId },
            couponName: { $regex: new RegExp(`^${name}$`, 'i') }
        }).exec();
    }

    async save(coupon: any): Promise<any> {
        return coupon.save();
    }

    async create(couponData: any): Promise<any> {
        const coupon = new CouponModel(couponData);
        return coupon.save();
    }

    async deleteById(id: string): Promise<any | null> {
        return CouponModel.findByIdAndDelete(id).exec();
    }
}
