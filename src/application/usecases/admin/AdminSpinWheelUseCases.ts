import { inject, injectable } from 'tsyringe';
import { ISpinWheelRepository } from '../../../domain/repositories/ISpinWheelRepository';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

@injectable()
export class AdminSpinWheelUseCases {
    constructor(
        @inject('ISpinWheelRepository') private spinWheelRepository: ISpinWheelRepository
    ) {}

    async getSettings() {
        return await this.spinWheelRepository.getSettings();
    }

    async updateSettings(data: any) {
        if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
            throw new AppError('Start date cannot be after end date', STATUS_CODES.BAD_REQUEST);
        }
        return await this.spinWheelRepository.updateSettings(data);
    }

    async getSegments() {
        return await this.spinWheelRepository.getSegments(false);
    }

    async createSegment(data: any) {
        if (!data.segmentName || !data.displayText || !data.rewardType) {
            throw new AppError('Name, display text and reward type are required', STATUS_CODES.BAD_REQUEST);
        }
        return await this.spinWheelRepository.createSegment(data);
    }

    async updateSegment(id: string, data: any) {
        const updated = await this.spinWheelRepository.updateSegment(id, data);
        if (!updated) {
            throw new AppError('Segment not found', STATUS_CODES.NOT_FOUND);
        }
        return updated;
    }

    async deleteSegment(id: string) {
        const deleted = await this.spinWheelRepository.deleteSegment(id);
        if (!deleted) {
            throw new AppError('Segment not found', STATUS_CODES.NOT_FOUND);
        }
        return deleted;
    }

    async reorderSegments(orders: { id: string; order: number }[]) {
        return await this.spinWheelRepository.reorderSegments(orders);
    }

    async getReportStats() {
        return await this.spinWheelRepository.getReportStats();
    }
}
