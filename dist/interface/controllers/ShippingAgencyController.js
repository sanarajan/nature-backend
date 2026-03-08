"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShippingAgency = exports.updateShippingAgency = exports.getAllShippingAgencies = exports.addShippingAgency = void 0;
const ShippingAgencyModel_1 = require("../../infrastructure/database/models/ShippingAgencyModel");
const addShippingAgency = async (req, res) => {
    try {
        const { name, trackingUrlTemplate } = req.body;
        const newAgency = new ShippingAgencyModel_1.ShippingAgencyModel({ name, trackingUrlTemplate });
        await newAgency.save();
        res.status(201).json({ success: true, message: 'Shipping agency added successfully', data: newAgency });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error adding shipping agency' });
    }
};
exports.addShippingAgency = addShippingAgency;
const getAllShippingAgencies = async (req, res) => {
    try {
        const agencies = await ShippingAgencyModel_1.ShippingAgencyModel.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: agencies });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error fetching shipping agencies' });
    }
};
exports.getAllShippingAgencies = getAllShippingAgencies;
const updateShippingAgency = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, trackingUrlTemplate, isActive } = req.body;
        const agency = await ShippingAgencyModel_1.ShippingAgencyModel.findByIdAndUpdate(id, { name, trackingUrlTemplate, isActive }, { new: true });
        if (!agency) {
            return res.status(404).json({ success: false, message: 'Shipping agency not found' });
        }
        res.status(200).json({ success: true, message: 'Shipping agency updated successfully', data: agency });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error updating shipping agency' });
    }
};
exports.updateShippingAgency = updateShippingAgency;
const deleteShippingAgency = async (req, res) => {
    try {
        const { id } = req.params;
        const agency = await ShippingAgencyModel_1.ShippingAgencyModel.findByIdAndDelete(id);
        if (!agency) {
            return res.status(404).json({ success: false, message: 'Shipping agency not found' });
        }
        res.status(200).json({ success: true, message: 'Shipping agency deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error deleting shipping agency' });
    }
};
exports.deleteShippingAgency = deleteShippingAgency;
