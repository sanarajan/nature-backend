import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { GetMeUseCase as IGetMeUseCase, UpdateProfileUseCase as IUpdateProfileUseCase, GetUserAddressesUseCase as IGetUserAddressesUseCase, AddOrUpdateAddressUseCase as IAddOrUpdateAddressUseCase, GetStatesUseCase as IGetStatesUseCase } from '../../../application/usecases/user/UserUseCases';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';
import { AUTH_MESSAGES } from '../../../shared/constants/messages/authMessages';

@injectable()
export class UserController {
    constructor(
        @inject('IGetMeUseCase') private getMeUseCase: IGetMeUseCase,
        @inject('IUpdateProfileUseCase') private updateProfileUseCase: IUpdateProfileUseCase,
        @inject('IGetUserAddressesUseCase') private getUserAddressesUseCase: IGetUserAddressesUseCase,
        @inject('IAddOrUpdateAddressUseCase') private addOrUpdateAddressUseCase: IAddOrUpdateAddressUseCase,
        @inject('IGetStatesUseCase') private getStatesUseCase: IGetStatesUseCase
    ) {}

    async getMe(req: Request, res: Response): Promise<void> {
        try {
            const payload = (req as any).user;
            const user = await this.getMeUseCase.execute(payload.id);

            res.status(STATUS_CODES.OK).json({
                success: true,
                data: { user },
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    async updateProfile(req: Request, res: Response): Promise<void> {
        try {
            const payload = (req as any).user;
            const { username, password, avatar } = req.body;

            const user = await this.updateProfileUseCase.execute(payload.id, { username, password, avatar });

            res.status(STATUS_CODES.OK).json({
                success: true,
                message: 'Profile updated successfully!',
                data: { user },
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message || 'Server error updating profile' 
            });
        }
    }

    async getUserAddresses(req: Request, res: Response): Promise<void> {
        try {
            const payload = (req as any).user;
            const addresses = await this.getUserAddressesUseCase.execute(payload.id);

            res.status(STATUS_CODES.OK).json({
                success: true,
                data: { addresses },
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    async addOrUpdateAddress(req: Request, res: Response): Promise<void> {
        try {
            const payload = (req as any).user;
            const address = await this.addOrUpdateAddressUseCase.execute(payload.id, req.body);

            res.status(STATUS_CODES.OK).json({
                success: true,
                message: 'Address saved successfully!',
                data: { address },
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    async getStates(req: Request, res: Response): Promise<void> {
        try {
            const states = await this.getStatesUseCase.execute();
            res.status(STATUS_CODES.OK).json({
                success: true,
                data: { states }
            });
        } catch (error: any) {
            res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message 
            });
        }
    }
}
