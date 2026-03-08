import { Request, Response } from 'express';
import { ShippingChargeModel } from '../../infrastructure/database/models/ShippingChargeModel';
import { StateModel } from '../../infrastructure/database/models/StateModel';

export class AdminShippingChargeController {
    public async getShippingCharges(req: Request, res: Response): Promise<void> {
        try {
            const charges = await ShippingChargeModel.find().populate('stateId').sort({ state: 1 });
            res.status(200).json({ success: true, data: charges });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public async addOrUpdateShippingCharge(req: Request, res: Response): Promise<void> {
        try {
            const { state, stateId, charge, isActive } = req.body;

            // Look for existing state entry by stateId
            let shippingCharge = await ShippingChargeModel.findOne({ stateId });

            if (shippingCharge) {
                shippingCharge.state = state;
                shippingCharge.charge = charge;
                shippingCharge.isActive = isActive !== undefined ? isActive : true;
                await shippingCharge.save();
            } else {
                shippingCharge = new ShippingChargeModel({
                    state,
                    stateId,
                    charge,
                    isActive: isActive !== undefined ? isActive : true
                });
                await shippingCharge.save();
            }

            res.status(200).json({ success: true, message: 'Shipping charge updated successfully', data: shippingCharge });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public async deleteShippingCharge(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await ShippingChargeModel.findByIdAndDelete(id);
            res.status(200).json({ success: true, message: 'Shipping charge deleted' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public async getStates(req: Request, res: Response): Promise<void> {
        try {
            const states = await StateModel.find({ isActive: true }).sort({ name: 1 });
            res.status(200).json({ success: true, data: states });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
