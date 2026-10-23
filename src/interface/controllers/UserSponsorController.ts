import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { UserSponsorUseCases } from '../../application/usecases/user/UserSponsorUseCases';

@injectable()
export class UserSponsorController {
    constructor(
        @inject(UserSponsorUseCases) private userSponsorUseCases: UserSponsorUseCases
    ) {}

    getActiveSponsors = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.userSponsorUseCases.getActiveSponsors();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };
}
