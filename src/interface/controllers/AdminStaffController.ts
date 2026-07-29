import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
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
import { STATUS_CODES } from '../../shared/constants/statusCodes';

@injectable()
export class AdminStaffController {
    constructor(
        private createStaffUseCase: CreateStaffUseCase,
        private getStaffListUseCase: GetStaffListUseCase,
        private getStaffDetailsUseCase: GetStaffDetailsUseCase,
        private updateStaffUseCase: UpdateStaffUseCase,
        private activateStaffUseCase: ActivateStaffUseCase,
        private deactivateStaffUseCase: DeactivateStaffUseCase,
        private blockStaffUseCase: BlockStaffUseCase,
        private unblockStaffUseCase: UnblockStaffUseCase
    ) {}

    async createStaff(req: Request, res: Response): Promise<void> {
        try {
            const { name, email, phone, profilePhoto } = req.body;
            const staff = await this.createStaffUseCase.execute({ name, email, phone, profilePhoto });
            res.status(STATUS_CODES.CREATED).json({
                success: true,
                message: 'Staff created successfully',
                data: staff
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message
            });
        }
    }

    async getStaffList(req: Request, res: Response): Promise<void> {
        try {
            const list = await this.getStaffListUseCase.execute();
            res.status(STATUS_CODES.OK).json({
                success: true,
                data: list
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    async getStaffDetails(req: Request, res: Response): Promise<void> {
        try {
            const staff = await this.getStaffDetailsUseCase.execute(req.params.id as string);
            res.status(STATUS_CODES.OK).json({
                success: true,
                data: staff
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.NOT_FOUND).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateStaff(req: Request, res: Response): Promise<void> {
        try {
            const { name, email, phone, profilePhoto, status, password } = req.body;
            const staff = await this.updateStaffUseCase.execute(req.params.id as string, {
                name,
                email,
                phone,
                profilePhoto,
                status,
                password
            });
            res.status(STATUS_CODES.OK).json({
                success: true,
                message: 'Staff updated successfully',
                data: staff
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message
            });
        }
    }

    async activateStaff(req: Request, res: Response): Promise<void> {
        try {
            const staff = await this.activateStaffUseCase.execute(req.params.id as string);
            res.status(STATUS_CODES.OK).json({
                success: true,
                message: 'Staff activated successfully',
                data: staff
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message
            });
        }
    }

    async deactivateStaff(req: Request, res: Response): Promise<void> {
        try {
            const staff = await this.deactivateStaffUseCase.execute(req.params.id as string);
            res.status(STATUS_CODES.OK).json({
                success: true,
                message: 'Staff deactivated successfully',
                data: staff
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message
            });
        }
    }

    async blockStaff(req: Request, res: Response): Promise<void> {
        try {
            const staff = await this.blockStaffUseCase.execute(req.params.id as string);
            res.status(STATUS_CODES.OK).json({
                success: true,
                message: 'Staff blocked successfully',
                data: staff
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message
            });
        }
    }

    async unblockStaff(req: Request, res: Response): Promise<void> {
        try {
            const staff = await this.unblockStaffUseCase.execute(req.params.id as string);
            res.status(STATUS_CODES.OK).json({
                success: true,
                message: 'Staff unblocked successfully',
                data: staff
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message
            });
        }
    }
}
