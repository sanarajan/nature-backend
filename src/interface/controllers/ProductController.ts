import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { ProductUseCases } from '../../application/usecases/catalog/ProductUseCases';

@injectable()
export class ProductController {
    constructor(
        @inject('IProductUseCases') private productUseCases: ProductUseCases
    ) {}

    getFeaturedProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const products = await this.productUseCases.getFeaturedProducts();
            res.status(200).json({ success: true, data: products });
        } catch (error: any) {
            next(error);
        }
    };

    getFilteredProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const products = await this.productUseCases.getFilteredProducts(req.query);
            res.status(200).json({ success: true, data: products });
        } catch (error: any) {
            next(error);
        }
    };

    getPopularProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const products = await this.productUseCases.getPopularProducts();
            res.status(200).json({ success: true, data: products });
        } catch (error: any) {
            next(error);
        }
    };

    getProductById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const product = await this.productUseCases.getProductById(id);
            res.status(200).json({ success: true, data: product });
        } catch (error: any) {
            next(error);
        }
    };

    getComboOffers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const combos = await this.productUseCases.getComboOffers(req.query);
            res.status(200).json({ success: true, data: combos });
        } catch (error: any) {
            next(error);
        }
    };

    getOfferProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.productUseCases.getOfferProducts();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };
}
