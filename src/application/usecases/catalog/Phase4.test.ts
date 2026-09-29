import 'reflect-metadata';
import { PlaceOrderUseCase } from './UserOrderUseCases';
import { SharedPricingService } from '../../services/SharedPricingService';
import { CartModel } from '../../../infrastructure/database/models/CartModel';
import { AddressModel } from '../../../infrastructure/database/models/AddressModel';
import { OrderModel } from '../../../infrastructure/database/models/OrderModel';
import { InfluencerSettingModel } from '../../../infrastructure/database/models/InfluencerSettingModel';

InfluencerSettingModel.findOne = (() => Promise.resolve(null)) as any;

const mockCalculatedResult: any = {
    products: [
        {
            product: { _id: 'p1', productName: 'P1', price: 500 },
            quantity: 2,
            isComboItem: true,
            finalUnitPrice: 500,
            comboAllocations: [
                {
                    comboOfferId: 'c1',
                    comboOfferName: 'Combo A',
                    quantity: 2,
                    discountAmount: 100
                }
            ]
        },
        {
            product: { _id: 'p2', productName: 'P2', price: 300 },
            quantity: 1,
            isComboItem: false,
            finalUnitPrice: 300,
            comboAllocations: []
        }
    ],
    pricing: {
        finalPrice: 1300,
        originalPrice: 1300,
        deliveryCharge: 0,
        totalDiscount: 100,
        comboDistributions: { 'p1': 100 }
    },
    appliedDiscounts: {
        combo: true,
        productOrCategory: false
    },
    appliedComboOffer: {
        _id: 'c1',
        offerName: 'Combo A'
    },
    appliedComboOffers: [
        {
            offerId: 'c1',
            offerName: 'Combo A',
            applications: 1,
            discountAmount: 100
        }
    ]
};

const mockSharedPricingService = {
    calculate: async () => mockCalculatedResult
};

CartModel.findOne = (() => ({
    populate: () => Promise.resolve({ products: [{}], save: async () => {} })
})) as any;

AddressModel.findById = (() => Promise.resolve({
    house: 'H1', place: 'P1', city: 'C1', district: 'D1', state: 'S1', pincode: 123456
})) as any;

OrderModel.findOne = (() => ({
    sort: () => Promise.resolve(null)
})) as any;

// Hack OrderModel constructor to capture what was saved
let savedOrder: any = null;
(OrderModel as any) = function(data: any) {
    savedOrder = data;
    return {
        save: async () => {}
    };
};
(OrderModel as any).findOne = (() => ({
    sort: () => Promise.resolve(null)
}));

const runTest = async () => {
    try {
        const useCase = new PlaceOrderUseCase({} as any, mockSharedPricingService as any);
        await useCase.execute('u1', {
            addressId: 'a1', paymentMethod: 'COD', isOnline: false
        }, {});

        if (!savedOrder) throw new Error('Order was not saved');

        // Test Order Root
        if (savedOrder.comboOffer !== 'c1') throw new Error('Legacy comboOffer missing/wrong');
        if (savedOrder.comboOfferName !== 'Combo A') throw new Error('Legacy comboOfferName missing/wrong');
        if (savedOrder.hasComboOffer !== true) throw new Error('Legacy hasComboOffer missing/wrong');
        
        if (!Array.isArray(savedOrder.appliedComboOffers)) throw new Error('appliedComboOffers is not array');
        if (savedOrder.appliedComboOffers.length !== 1) throw new Error('appliedComboOffers length wrong');
        if (savedOrder.appliedComboOffers[0].offerId !== 'c1') throw new Error('appliedComboOffers offerId wrong');

        // Test Products
        const p1 = savedOrder.orderedProducts.find((p: any) => p.productId === 'p1');
        if (!p1) throw new Error('p1 missing');
        if (p1.comboQuantity !== 2) throw new Error('Legacy comboQuantity wrong');
        if (p1.discounts.comboOffer.offerId !== 'c1') throw new Error('Legacy discounts.comboOffer wrong');

        if (!Array.isArray(p1.comboAllocations)) throw new Error('comboAllocations is not array');
        if (p1.comboAllocations.length !== 1) throw new Error('comboAllocations length wrong');
        if (p1.comboAllocations[0].comboOfferId !== 'c1') throw new Error('comboAllocations id wrong');

        const p2 = savedOrder.orderedProducts.find((p: any) => p.productId === 'p2');
        if (!Array.isArray(p2.comboAllocations)) throw new Error('p2 comboAllocations is not array');
        if (p2.comboAllocations.length !== 0) throw new Error('p2 comboAllocations length should be 0');

        console.log('[PASS] Phase 4 Snapshot Tests Passed');
    } catch (e: any) {
        console.error('[FAIL]', e.message);
        process.exit(1);
    }
};

runTest();
