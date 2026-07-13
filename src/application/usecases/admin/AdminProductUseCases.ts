import { inject, injectable } from 'tsyringe';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';
import { ISubCategoryRepository } from '../../../domain/repositories/ISubCategoryRepository';
import { IUnitRepository } from '../../../domain/repositories/IUnitRepository';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';
import cloudinary from '../../../infrastructure/config/cloudinary';

@injectable()
export class GetProductOptionsUseCase {
    constructor(
        @inject('ICategoryRepository') private categoryRepository: ICategoryRepository,
        @inject('ISubCategoryRepository') private subCategoryRepository: ISubCategoryRepository,
        @inject('IUnitRepository') private unitRepository: IUnitRepository
    ) {}

    async execute() {
        const categories = await this.categoryRepository.findAll();
        const activeCategories = categories.filter((c: any) => c.isActive).map((c: any) => ({ _id: c._id, categoryName: c.categoryName }));
        
        const subcategories = await this.subCategoryRepository.findAllWithCategory();
        const activeSubcategories = subcategories.filter((s: any) => s.isActive).map((s: any) => ({ _id: s._id, subcategoryName: s.subcategoryName, categoryId: s.categoryId }));

        const units = await this.unitRepository.findAllUnits();

        return { categories: activeCategories, subcategories: activeSubcategories, units };
    }
}

@injectable()
export class AddProductUseCase {
    constructor(
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute(data: any) {
        const {
            productName, categoryId, subcategoryId, unitId, quantity, stock, price,
            description, specifications, images,
            featured, isPopular, isTrending, isBestSeller
        } = data;

        if (!productName || !categoryId || !unitId || quantity === undefined || stock === undefined || price === undefined) {
            throw new AppError('Missing required fields', STATUS_CODES.BAD_REQUEST);
        }

        if (images && images.length > 4) {
            throw new AppError('Maximum 4 images allowed', STATUS_CODES.BAD_REQUEST);
        }

        const existingProduct = await this.productRepository.findProduct({
            productName: { $regex: new RegExp(`^${productName.trim()}$`, 'i') },
            categoryId,
            subcategoryId: subcategoryId || null,
            unitId,
            quantity: Number(quantity)
        });

        if (existingProduct) {
            throw new AppError('A product with this exact Name, Category, Subcategory, Unit, and Quantity already exists!', STATUS_CODES.BAD_REQUEST);
        }

        // Generate unique SKU
        const words = productName.trim().split(' ').filter((w: string) => w.length > 0);
        let prefix = words.length >= 3
            ? words.slice(0, 3).map((w: string) => w[0].toUpperCase()).join('')
            : words.map((w: string) => w[0].toUpperCase()).join('').padEnd(3, 'X');

        prefix = prefix.replace(/[^A-Z]/g, 'X').slice(0, 3);

        const lastProduct = await this.productRepository.findProductBySkuPattern(prefix);

        let sequence = 1;
        if (lastProduct && lastProduct.sku) {
            const parts = lastProduct.sku.split('-');
            if (parts.length > 1) {
                const lastSeq = parseInt(parts[1], 10);
                if (!isNaN(lastSeq)) {
                    sequence = lastSeq + 1;
                }
            }
        }

        const sku = `${prefix}-${sequence.toString().padStart(3, '0')}`;

        const uploadedImages: string[] = [];
        if (images && Array.isArray(images)) {
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    try {
                        const uploadRes = await cloudinary.uploader.upload(img, {
                            folder: 'natural_ayam/products',
                        });
                        uploadedImages.push(uploadRes.secure_url);
                    } catch (error) {
                        throw new AppError('Error uploading image', STATUS_CODES.INTERNAL_SERVER_ERROR);
                    }
                }
            }
        }

        const newProductData = {
            productName: productName.trim(),
            sku,
            categoryId,
            subcategoryId: subcategoryId || null,
            unitId,
            quantity: Number(quantity),
            stock: Number(stock),
            price: Number(price),
            description: description?.trim(),
            specifications: specifications || {},
            images: uploadedImages,
            featured: featured === true || featured === 'true',
            isPopular: isPopular === true || isPopular === 'true',
            isTrending: isTrending === true || isTrending === 'true',
            isBestSeller: isBestSeller === true || isBestSeller === 'true',
            isActive: true
        };

        try {
            return await this.productRepository.createProduct(newProductData);
        } catch (error: any) {
            if (error.code === 11000) {
                throw new AppError('Product already exists with this name and specification.', STATUS_CODES.BAD_REQUEST);
            }
            throw error;
        }
    }
}

@injectable()
export class AdminGetAllProductsUseCase {
    constructor(
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute(search?: string) {
        let query: any = {};
        if (search) {
            query = {
                $or: [
                    { productName: { $regex: search, $options: 'i' } },
                    { sku: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const populateOptions = [
            { path: 'categoryId', select: 'categoryName' },
            { path: 'subcategoryId', select: 'subcategoryName' },
            { path: 'unitId', select: 'unitName' }
        ];

        return await this.productRepository.findProducts(query, undefined, { createdAt: -1 }, populateOptions);
    }
}

@injectable()
export class UpdateProductUseCase {
    constructor(
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute(id: string, data: any) {
        const {
            productName, categoryId, subcategoryId, unitId, quantity, stock, price,
            description, specifications, images,
            featured, isPopular, isTrending, isBestSeller
        } = data;

        if (!productName || !categoryId || !unitId || quantity === undefined || stock === undefined || price === undefined) {
            throw new AppError('Missing required fields', STATUS_CODES.BAD_REQUEST);
        }

        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new AppError('Product not found', STATUS_CODES.NOT_FOUND);
        }

        const existingProduct = await this.productRepository.findProduct({
            _id: { $ne: id },
            productName: { $regex: new RegExp(`^${productName.trim()}$`, 'i') },
            categoryId,
            subcategoryId: subcategoryId || null,
            unitId,
            quantity: Number(quantity)
        });

        if (existingProduct) {
            throw new AppError('Another product with this exact Name, Category, Subcategory, Unit, and Quantity already exists!', STATUS_CODES.BAD_REQUEST);
        }

        const updateData: any = {
            productName: productName.trim(),
            categoryId,
            subcategoryId: subcategoryId || null,
            unitId,
            quantity: Number(quantity),
            stock: Number(stock),
            price: Number(price),
            description: description?.trim(),
            specifications: specifications || {},
            featured: featured === true || featured === 'true',
            isPopular: isPopular === true || isPopular === 'true',
            isTrending: isTrending === true || isTrending === 'true',
            isBestSeller: isBestSeller === true || isBestSeller === 'true'
        };

        if (images && Array.isArray(images)) {
            const updatedImages: string[] = [];
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    try {
                        const uploadRes = await cloudinary.uploader.upload(img, {
                            folder: 'natural_ayam/products',
                        });
                        updatedImages.push(uploadRes.secure_url);
                    } catch (error) {
                        throw new AppError('Error uploading image', STATUS_CODES.INTERNAL_SERVER_ERROR);
                    }
                } else if (img.startsWith('http')) {
                    updatedImages.push(img);
                }
            }
            updateData.images = updatedImages;
        }

        return await this.productRepository.updateProduct(id, updateData);
    }
}

@injectable()
export class DeleteProductUseCase {
    constructor(
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute(id: string) {
        const product = await this.productRepository.deleteProduct(id);
        if (!product) {
            throw new AppError('Product not found', STATUS_CODES.NOT_FOUND);
        }
    }
}

@injectable()
export class AdminGetProductByIdUseCase {
    constructor(
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute(id: string) {
        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new AppError('Product not found', STATUS_CODES.NOT_FOUND);
        }
        return product;
    }
}

@injectable()
export class ToggleProductHighlightUseCase {
    constructor(
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute(id: string, field: string, value: boolean) {
        const allowedFields = ['featured', 'isPopular', 'isTrending', 'isBestSeller'];
        if (!allowedFields.includes(field)) {
            throw new AppError('Invalid highlight field', STATUS_CODES.BAD_REQUEST);
        }

        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new AppError('Product not found', STATUS_CODES.NOT_FOUND);
        }

        const updateData = { [field]: !!value };
        return await this.productRepository.updateProduct(id, updateData);
    }
}
