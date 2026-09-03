import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { UserCertificationUseCases } from '../../application/usecases/user/UserCertificationUseCases';

@injectable()
export class UserCertificationController {
    constructor(
        @inject(UserCertificationUseCases) private userCertificationUseCases: UserCertificationUseCases
    ) {}

    getAllCertifications = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.userCertificationUseCases.getAllCertifications();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };
}
