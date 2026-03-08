import { Request, Response } from 'express';
import { ShippingAgencyModel } from '../../infrastructure/database/models/ShippingAgencyModel';

export const addShippingAgency = async (req: Request, res: Response) => {
    try {
        const { name, trackingUrlTemplate } = req.body;
        const newAgency = new ShippingAgencyModel({ name, trackingUrlTemplate });
        await newAgency.save();
        res.status(201).json({ success: true, message: 'Shipping agency added successfully', data: newAgency });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error adding shipping agency' });
    }
};

export const getAllShippingAgencies = async (req: Request, res: Response) => {
    try {
        const agencies = await ShippingAgencyModel.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: agencies });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error fetching shipping agencies' });
    }
};

export const updateShippingAgency = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, trackingUrlTemplate, isActive } = req.body;
        const agency = await ShippingAgencyModel.findByIdAndUpdate(id, { name, trackingUrlTemplate, isActive }, { new: true });
        if (!agency) {
            return res.status(404).json({ success: false, message: 'Shipping agency not found' });
        }
        res.status(200).json({ success: true, message: 'Shipping agency updated successfully', data: agency });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error updating shipping agency' });
    }
};

export const deleteShippingAgency = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const agency = await ShippingAgencyModel.findByIdAndDelete(id);
        if (!agency) {
            return res.status(404).json({ success: false, message: 'Shipping agency not found' });
        }
        res.status(200).json({ success: true, message: 'Shipping agency deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error deleting shipping agency' });
    }
};
