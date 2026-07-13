import { inject, injectable } from 'tsyringe';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { IOfferRepository } from '../../../domain/repositories/IOfferRepository';
import { IComboOfferRepository } from '../../../domain/repositories/IComboOfferRepository';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

@injectable()
export class ProductUseCases {
    constructor(
        @inject('IProductRepository') private productRepository: IProductRepository,
        @inject('IOfferRepository') private offerRepository: IOfferRepository,
        @inject('IComboOfferRepository') private comboOfferRepository: IComboOfferRepository
    ) {}

    private async applyOffers(products: any[]) {
        const now = new Date();
        const offers = await this.offerRepository.findAllOffers();
        const activeOffers = offers.filter((o: any) => 
            o.status && o.startDate <= now && o.endDate >= now
        );

        return products.map(product => {
            const productObj = product.toObject ? product.toObject() : product;
            
            let bestDiscount = 0;
            let appliedOffer = null;

            activeOffers.forEach((offer: any) => {
                let isApplicable = false;
                const prodCatId = productObj.categoryId?._id ? productObj.categoryId._id.toString() : productObj.categoryId?.toString();

                const offerProdId = offer.productId?._id ? offer.productId._id.toString() : offer.productId?.toString();
                const offerCatId = offer.categoryId?._id ? offer.categoryId._id.toString() : offer.categoryId?.toString();

                if (offer.offerFor === 'product' && offerProdId === productObj._id.toString()) {
                    isApplicable = true;
                } else if (offer.offerFor === 'category' && offerCatId === prodCatId) {
                    isApplicable = true;
                }

                if (isApplicable) {
                    let currentDiscount = 0;
                    if (offer.discountType === 'percentage') {
                        currentDiscount = (productObj.price * offer.discountValue) / 100;
                    } else {
                        currentDiscount = offer.discountValue;
                    }

                    if (currentDiscount > bestDiscount) {
                        bestDiscount = currentDiscount;
                        appliedOffer = offer;
                    }
                }
            });

            if (bestDiscount > 0) {
                productObj.offerPrice = Math.max(0, productObj.price - bestDiscount);
                productObj.appliedOffer = appliedOffer;
            }

            return productObj;
        });
    }

    async getFeaturedProducts() {
        let products = await this.productRepository.findProducts(
            { isActive: true, $or: [{ featured: true }, { isPopular: true }, { isTrending: true }, { isBestSeller: true }] },
            8,
            { createdAt: -1 }
        );

        if (products.length < 8) {
            const excludedIds = products.map(p => p._id);
            const remainingCount = 8 - products.length;

            const extraProducts = await this.productRepository.findProducts(
                { isActive: true, _id: { $nin: excludedIds } },
                remainingCount,
                { createdAt: -1 }
            );

            products = [...products, ...extraProducts];
        }

        return await this.applyOffers(products);
    }

    async getFilteredProducts(filters: any) {
        const { categoryId, subcategoryId, search, minPrice, maxPrice, sort, onOffer } = filters;
        const query: any = { isActive: true };

        if (categoryId) {
            const catIds = typeof categoryId === 'string' ? categoryId.split(',') : (Array.isArray(categoryId) ? categoryId : [categoryId]);
            query.categoryId = { $in: catIds };
        }
        if (subcategoryId) {
            const subIds = typeof subcategoryId === 'string' ? subcategoryId.split(',') : (Array.isArray(subcategoryId) ? subcategoryId : [subcategoryId]);
            query.subcategoryId = { $in: subIds };
        }
        if (search) {
            query.productName = { $regex: search, $options: 'i' };
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        let sortOption: any = { createdAt: -1 };
        if (sort === 'price-low-high') sortOption = { price: 1 };
        if (sort === 'price-high-low') sortOption = { price: -1 };
        if (sort === 'newest') sortOption = { createdAt: -1 };

        const populateOptions = [
            { path: 'categoryId', select: 'categoryName' },
            { path: 'subcategoryId', select: 'subcategoryName' }
        ];

        const products = await this.productRepository.findProducts(query, undefined, sortOption, populateOptions);
        const productsWithOffers = await this.applyOffers(products);

        if (onOffer === 'true') {
            return productsWithOffers.filter(p => !!p.appliedOffer);
        }
        return productsWithOffers;
    }

    async getPopularProducts() {
        const products = await this.productRepository.findProducts(
            { isPopular: true, isActive: true },
            8,
            { createdAt: -1 }
        );
        return await this.applyOffers(products);
    }

    async getProductById(id: string) {
        const product = await this.productRepository.findProduct({ _id: id });
        if (!product || !product.isActive) {
            throw new AppError('Product not found or inactive', STATUS_CODES.NOT_FOUND);
        }
        
        // Populate
        await product.populate('categoryId', 'categoryName');
        await product.populate('subcategoryId', 'subcategoryName');

        return (await this.applyOffers([product]))[0];
    }

    async getComboOffers(filters: any) {
        const { categoryIds, discountTypes, sort } = filters;
        const now = new Date();
        const allCombos = await this.comboOfferRepository.findAllComboOffers();
        let combos = allCombos.filter((c: any) => 
            c.status && c.startDate <= now && c.endDate >= now
        );

        if (discountTypes) {
            const types = Array.isArray(discountTypes) ? discountTypes : [discountTypes];
            if (types.length > 0) {
                combos = combos.filter((c: any) => types.includes(c.discountType));
            }
        }

        let combosWithCalculations = combos.map((combo: any) => {
            const comboObj: any = combo.toObject ? combo.toObject() : combo;
            let totalMRP = 0;
            const uniqueCategories = new Set<string>();

            const products = comboObj.products.map((p: any) => {
                const prodPrice = p.productId?.price || 0;
                const qty = p.requiredQuantity || p.quantity || 1;
                totalMRP += prodPrice * qty;
                if (p.productId?.categoryId) {
                    uniqueCategories.add(p.productId.categoryId._id ? p.productId.categoryId._id.toString() : p.productId.categoryId.toString());
                }
                return { ...p, quantity: qty };
            });

            let savings = 0;
            if (comboObj.discountType === 'percentage') {
                savings = (totalMRP * comboObj.discountValue) / 100;
            } else if (comboObj.discountType === 'amount') {
                savings = comboObj.discountValue;
            }

            return {
                ...comboObj,
                products,
                totalMRP: Math.round(totalMRP),
                comboPrice: Math.round(Math.max(0, totalMRP - savings)),
                savings: Math.round(savings),
                savingsPercent: totalMRP > 0 ? Math.round((savings / totalMRP) * 100) : 0,
                categoryIds: Array.from(uniqueCategories)
            };
        });

        if (categoryIds) {
            const selectedCats = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
            if (selectedCats.length > 0) {
                combosWithCalculations = combosWithCalculations.filter(c => 
                    selectedCats.some((id: any) => c.categoryIds.includes(id))
                );
            }
        }

        if (sort === 'best-savings') {
            combosWithCalculations.sort((a: any, b: any) => b.savings - a.savings);
        } else if (sort === 'price-low-high') {
            combosWithCalculations.sort((a: any, b: any) => a.comboPrice - b.comboPrice);
        } else if (sort === 'price-high-low') {
            combosWithCalculations.sort((a: any, b: any) => b.comboPrice - a.comboPrice);
        }

        return combosWithCalculations;
    }

    async getOfferProducts() {
        const now = new Date();
        const allOffers = await this.offerRepository.findAllOffers();
        const activeOffers = allOffers.filter((o: any) => 
            o.status && o.startDate <= now && o.endDate >= now
        );

        const activeProductIds = activeOffers.filter((o: any) => o.offerFor === 'product').map((o: any) => o.productId?._id ? o.productId._id.toString() : o.productId?.toString());
        const activeCategoryIds = activeOffers.filter((o: any) => o.offerFor === 'category').map((o: any) => o.categoryId?._id ? o.categoryId._id.toString() : o.categoryId?.toString());

        const products = await this.productRepository.findProducts(
            {
                isActive: true,
                $or: [
                    { _id: { $in: activeProductIds } },
                    { categoryId: { $in: activeCategoryIds } }
                ]
            },
            4,
            { createdAt: -1 }
        );

        const productsWithOffers = await this.applyOffers(products);

        let maxPercent = 0;
        let maxAmount = 0;

        activeOffers.forEach((offer: any) => {
            if (offer.discountType === 'percentage') {
                if (offer.discountValue > maxPercent) maxPercent = offer.discountValue;
            } else {
                if (offer.discountValue > maxAmount) maxAmount = offer.discountValue;
            }
        });

        return {
            products: productsWithOffers,
            maxPercent,
            maxAmount
        };
    }
}
