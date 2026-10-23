import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { UserNewsUseCases } from '../../application/usecases/user/UserNewsUseCases';

@injectable()
export class UserNewsController {
    constructor(
        @inject(UserNewsUseCases) private userNewsUseCases: UserNewsUseCases
    ) {}

    getActiveNews = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.userNewsUseCases.getActiveNews();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };
}
