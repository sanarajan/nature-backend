import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import {
    GetProductOptionsUseCase,
    AddProductUseCase,
    AdminGetAllProductsUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    AdminGetProductByIdUseCase,
    ToggleProductHighlightUseCase
} from '../../application/usecases/admin/AdminProductUseCases';

@injectable()
export class AdminProductController {
    constructor(
        @inject('IGetProductOptionsUseCase') private getProductOptionsUseCase: GetProductOptionsUseCase,
        @inject('IAddProductUseCase') private addProductUseCase: AddProductUseCase,
        @inject('IAdminGetAllProductsUseCase') private adminGetAllProductsUseCase: AdminGetAllProductsUseCase,
        @inject('IUpdateProductUseCase') private updateProductUseCase: UpdateProductUseCase,
        @inject('IDeleteProductUseCase') private deleteProductUseCase: DeleteProductUseCase,
        @inject('IAdminGetProductByIdUseCase') private adminGetProductByIdUseCase: AdminGetProductByIdUseCase,
        @inject('IToggleProductHighlightUseCase') private toggleProductHighlightUseCase: ToggleProductHighlightUseCase
    ) {}

    getProductOptions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.getProductOptionsUseCase.execute();
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error);
        }
    };

    addProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newProduct = await this.addProductUseCase.execute(req.body);
            res.status(201).json({ success: true, message: 'Product added successfully!', data: newProduct });
        } catch (error: any) {
            next(error);
        }
    };

    getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { search } = req.query;
            const products = await this.adminGetAllProductsUseCase.execute(search as string);
            res.status(200).json({ success: true, data: products });
        } catch (error: any) {
            next(error);
        }
    };

    updateProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const updatedProduct = await this.updateProductUseCase.execute(id, req.body);
            res.status(200).json({ success: true, message: 'Product updated successfully!', data: updatedProduct });
        } catch (error: any) {
            next(error);
        }
    };

    deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            await this.deleteProductUseCase.execute(id);
            res.status(200).json({ success: true, message: 'Product deleted successfully!' });
        } catch (error: any) {
            next(error);
        }
    };

    getProductById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const product = await this.adminGetProductByIdUseCase.execute(id);
            res.status(200).json({ success: true, data: product });
        } catch (error: any) {
            next(error);
        }
    };

    toggleProductHighlight = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const { field, value } = req.body;
            const product = await this.toggleProductHighlightUseCase.execute(id, field, value);
            res.status(200).json({ success: true, message: `Product ${field} updated successfully`, data: product });
        } catch (error: any) {
            next(error);
        }
    };
}

