import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { AdminSpinWheelUseCases } from '../../application/usecases/admin/AdminSpinWheelUseCases';
import { STATUS_CODES } from '../../shared/constants/statusCodes';

@injectable()
export class AdminSpinWheelController {
    constructor(
        @inject(AdminSpinWheelUseCases) private adminSpinWheelUseCases: AdminSpinWheelUseCases
    ) {}

    async getSettings(req: Request, res: Response): Promise<void> {
        try {
            const settings = await this.adminSpinWheelUseCases.getSettings();
            res.status(STATUS_CODES.OK).json({ success: true, data: { settings } });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to fetch spin wheel settings'
            });
        }
    }

    async updateSettings(req: Request, res: Response): Promise<void> {
        try {
            const settings = await this.adminSpinWheelUseCases.updateSettings(req.body);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Settings updated successfully', data: { settings } });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to update spin wheel settings'
            });
        }
    }

    async getSegments(req: Request, res: Response): Promise<void> {
        try {
            const segments = await this.adminSpinWheelUseCases.getSegments();
            res.status(STATUS_CODES.OK).json({ success: true, data: { segments } });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to fetch segments'
            });
        }
    }

    async createSegment(req: Request, res: Response): Promise<void> {
        try {
            const segment = await this.adminSpinWheelUseCases.createSegment(req.body);
            res.status(STATUS_CODES.CREATED).json({ success: true, message: 'Segment created successfully', data: { segment } });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to create segment'
            });
        }
    }

    async updateSegment(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const segment = await this.adminSpinWheelUseCases.updateSegment(id, req.body);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Segment updated successfully', data: { segment } });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to update segment'
            });
        }
    }

    async deleteSegment(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            await this.adminSpinWheelUseCases.deleteSegment(id);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Segment deleted successfully' });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to delete segment'
            });
        }
    }


    async reorderSegments(req: Request, res: Response): Promise<void> {
        try {
            await this.adminSpinWheelUseCases.reorderSegments(req.body.orders);
            res.status(STATUS_CODES.OK).json({ success: true, message: 'Segments reordered successfully' });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to reorder segments'
            });
        }
    }

    async getReportStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = await this.adminSpinWheelUseCases.getReportStats();
            res.status(STATUS_CODES.OK).json({ success: true, data: { stats } });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to fetch report stats'
            });
        }
    }
}
