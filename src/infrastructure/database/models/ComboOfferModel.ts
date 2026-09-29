import mongoose, { Schema, Document } from 'mongoose';

export interface IComboOfferDocument extends Document {
    offerName: string;
    products: { 
        productId: mongoose.Types.ObjectId; 
        requiredQuantity: number;
        comboRole?: string;
        comboRoleDescription?: string;
    }[]; // List of products and their required quantities
    discountType: 'percentage' | 'amount';
    discountValue: number;
    startDate: Date;
    endDate: Date;
    maxUsagePerOrder?: number;
    imageUrl?: string;
    
    // Optional marketing content fields
    subtitle?: string;
    tagline?: string;
    shortDescription?: string;
    overviewTitle?: string;
    overviewDescription?: string;
    routineLabel?: string;
    targetConcerns?: string[];
    whySpecial?: string[];
    howToUseSteps?: { title: string; description: string }[];
    recommendedRoutine?: string;
    whoMayBenefit?: string[];
    resultsAndExpectations?: string[];
    safetyInformation?: string[];
    patchTestGuidance?: string;
    storageInstructions?: string;
    disclaimer?: string;
    faqs?: { question: string; answer: string }[];
    
    // SEO / Display fields
    seoTitle?: string;
    metaDescription?: string;
    slug?: string;
    imageAltText?: string;
    productBadge?: string;
    promotionalBadge?: string;
    ctaLabel?: string;
    supportingCtaLabel?: string;

    status: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ComboOfferSchema = new Schema<IComboOfferDocument>({
    offerName: { type: String, required: true, trim: true },
    products: [{ 
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        requiredQuantity: { type: Number, required: true, default: 1 },
        comboRole: { type: String },
        comboRoleDescription: { type: String }
    }],
    discountType: { type: String, enum: ['percentage', 'amount'], default: 'amount' },
    discountValue: { type: Number, required: true },
    maxUsagePerOrder: { type: Number, default: 0 }, // 0 means unlimited
    imageUrl: { type: String, default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    
    // Optional marketing content fields
    subtitle: { type: String },
    tagline: { type: String },
    shortDescription: { type: String },
    overviewTitle: { type: String },
    overviewDescription: { type: String },
    routineLabel: { type: String },
    targetConcerns: [{ type: String }],
    whySpecial: [{ type: String }],
    howToUseSteps: [{ 
        title: { type: String },
        description: { type: String }
    }],
    recommendedRoutine: { type: String },
    whoMayBenefit: [{ type: String }],
    resultsAndExpectations: [{ type: String }],
    safetyInformation: [{ type: String }],
    patchTestGuidance: { type: String },
    storageInstructions: { type: String },
    disclaimer: { type: String },
    faqs: [{ 
        question: { type: String },
        answer: { type: String }
    }],
    
    // SEO / Display fields
    seoTitle: { type: String },
    metaDescription: { type: String },
    slug: { type: String },
    imageAltText: { type: String },
    productBadge: { type: String },
    promotionalBadge: { type: String },
    ctaLabel: { type: String },
    supportingCtaLabel: { type: String }
}, { timestamps: true });

export const ComboOfferModel = mongoose.model<IComboOfferDocument>('ComboOffer', ComboOfferSchema);
