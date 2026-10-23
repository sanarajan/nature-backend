import { inject, injectable } from 'tsyringe';
import { ISponsorRepository } from '../../../domain/repositories/ISponsorRepository';
import cloudinary from '../../../infrastructure/config/cloudinary';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

/**
 * Safely extracts the Cloudinary public_id for a sponsor logo/image.
 * Ensures the target strictly belongs to the 'natural_ayam/sponsors' folder.
 */
function extractSponsorImagePublicId(url?: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
        if (!url.includes('res.cloudinary.com')) return null;
        const match = url.match(/\/image\/upload\/(?:v\d+\/)?(natural_ayam\/sponsors\/[^.?#]+)(?:\.[a-zA-Z0-9]+)?/);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
    } catch {
        return null;
    }
    return null;
}

/**
 * Validates that a string is a valid URL with safe http or https protocol.
 */
export function isValidWebsiteUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

@injectable()
export class AdminSponsorUseCases {
    constructor(
        @inject('ISponsorRepository') private sponsorRepository: ISponsorRepository
    ) {}

    async addSponsor(data: {
        companyName: string;
        companyType: string;
        websiteUrl: string;
        fileData: string;
        status?: 'active' | 'inactive';
    }) {
        const trimmedCompanyName = typeof data.companyName === 'string' ? data.companyName.trim() : '';
        if (!trimmedCompanyName) {
            throw new AppError('Company Name is required and cannot be empty or whitespace only.', STATUS_CODES.BAD_REQUEST);
        }

        const trimmedCompanyType = typeof data.companyType === 'string' ? data.companyType.trim() : '';
        if (!trimmedCompanyType) {
            throw new AppError('Company Type is required and cannot be empty or whitespace only.', STATUS_CODES.BAD_REQUEST);
        }

        const trimmedWebsiteUrl = typeof data.websiteUrl === 'string' ? data.websiteUrl.trim() : '';
        if (!trimmedWebsiteUrl) {
            throw new AppError('Website URL is required.', STATUS_CODES.BAD_REQUEST);
        }
        if (!isValidWebsiteUrl(trimmedWebsiteUrl)) {
            throw new AppError('Website URL must be a valid external URL starting with http:// or https://', STATUS_CODES.BAD_REQUEST);
        }

        if (!data.fileData) {
            throw new AppError('Sponsor logo image is required.', STATUS_CODES.BAD_REQUEST);
        }

        const isImage = /^data:image\/(jpeg|jpg|png|webp|gif|svg\+xml);base64,/.test(data.fileData);
        if (!isImage) {
            throw new AppError('Only JPG, JPEG, PNG, WEBP, GIF, and SVG image files are allowed.', STATUS_CODES.BAD_REQUEST);
        }

        const status = data.status === 'inactive' ? 'inactive' : 'active';

        let imageUrl = '';
        let imagePublicId = '';
        try {
            const uploadRes = await cloudinary.uploader.upload(data.fileData, {
                folder: 'natural_ayam/sponsors',
                resource_type: 'image'
            });
            imageUrl = uploadRes.secure_url;
            imagePublicId = uploadRes.public_id;
        } catch (error) {
            console.error('Cloudinary sponsor image upload error:', error);
            throw new AppError('Sponsor image upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
        }

        try {
            const newSponsor = await this.sponsorRepository.create({
                companyName: trimmedCompanyName,
                companyType: trimmedCompanyType,
                websiteUrl: trimmedWebsiteUrl,
                imageUrl,
                imagePublicId,
                status
            });
            return newSponsor;
        } catch (dbError) {
            // Clean up uploaded image if database save fails
            if (imagePublicId) {
                try {
                    await cloudinary.uploader.destroy(imagePublicId);
                } catch {}
            }
            throw dbError;
        }
    }

    async getAllSponsors() {
        return await this.sponsorRepository.findAll();
    }

    async getSponsorById(id: string) {
        const sponsor = await this.sponsorRepository.findById(id);
        if (!sponsor) {
            throw new AppError('Sponsor not found', STATUS_CODES.NOT_FOUND);
        }
        return sponsor;
    }

    async editSponsor(id: string, data: {
        companyName?: string;
        companyType?: string;
        websiteUrl?: string;
        fileData?: string;
        status?: 'active' | 'inactive';
    }) {
        const existingSponsor = await this.sponsorRepository.findById(id);
        if (!existingSponsor) {
            throw new AppError('Sponsor not found', STATUS_CODES.NOT_FOUND);
        }

        let companyName = existingSponsor.companyName;
        if (data.companyName !== undefined) {
            const trimmed = data.companyName.trim();
            if (!trimmed) {
                throw new AppError('Company Name cannot be empty.', STATUS_CODES.BAD_REQUEST);
            }
            companyName = trimmed;
        }

        let companyType = existingSponsor.companyType;
        if (data.companyType !== undefined) {
            const trimmed = data.companyType.trim();
            if (!trimmed) {
                throw new AppError('Company Type cannot be empty.', STATUS_CODES.BAD_REQUEST);
            }
            companyType = trimmed;
        }

        let websiteUrl = existingSponsor.websiteUrl;
        if (data.websiteUrl !== undefined) {
            const trimmed = data.websiteUrl.trim();
            if (!trimmed) {
                throw new AppError('Website URL cannot be empty.', STATUS_CODES.BAD_REQUEST);
            }
            if (!isValidWebsiteUrl(trimmed)) {
                throw new AppError('Website URL must be a valid external URL starting with http:// or https://', STATUS_CODES.BAD_REQUEST);
            }
            websiteUrl = trimmed;
        }

        let status = existingSponsor.status;
        if (data.status !== undefined) {
            status = data.status === 'inactive' ? 'inactive' : 'active';
        }

        let imageUrl = existingSponsor.imageUrl;
        let imagePublicId = existingSponsor.imagePublicId;
        const oldImagePublicId = existingSponsor.imagePublicId || extractSponsorImagePublicId(existingSponsor.imageUrl);

        let newImageUploaded = false;
        let newImagePublicId: string | null = null;

        if (data.fileData) {
            const isImage = /^data:image\/(jpeg|jpg|png|webp|gif|svg\+xml);base64,/.test(data.fileData);
            if (!isImage) {
                throw new AppError('Only JPG, JPEG, PNG, WEBP, GIF, and SVG image files are allowed.', STATUS_CODES.BAD_REQUEST);
            }

            try {
                const uploadRes = await cloudinary.uploader.upload(data.fileData, {
                    folder: 'natural_ayam/sponsors',
                    resource_type: 'image'
                });
                imageUrl = uploadRes.secure_url;
                imagePublicId = uploadRes.public_id;
                newImagePublicId = uploadRes.public_id;
                newImageUploaded = true;
            } catch (error) {
                console.error('Cloudinary sponsor image upload error:', error);
                throw new AppError('Sponsor image upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
            }
        }

        try {
            const updated = await this.sponsorRepository.update(id, {
                companyName,
                companyType,
                websiteUrl,
                imageUrl,
                imagePublicId,
                status
            });

            // If replacement succeeded, clean up the old image
            if (newImageUploaded && oldImagePublicId) {
                try {
                    await cloudinary.uploader.destroy(oldImagePublicId);
                } catch (cleanupErr) {
                    console.error('Failed to cleanup old sponsor image:', cleanupErr);
                }
            }

            return updated;
        } catch (dbError) {
            // Clean up newly uploaded image if database update fails
            if (newImageUploaded && newImagePublicId) {
                try {
                    await cloudinary.uploader.destroy(newImagePublicId);
                } catch {}
            }
            throw dbError;
        }
    }

    async deleteSponsor(id: string) {
        const existingSponsor = await this.sponsorRepository.findById(id);
        if (!existingSponsor) {
            throw new AppError('Sponsor not found', STATUS_CODES.NOT_FOUND);
        }

        const publicId = existingSponsor.imagePublicId || extractSponsorImagePublicId(existingSponsor.imageUrl);
        const deleted = await this.sponsorRepository.delete(id);

        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cleanupErr) {
                console.error('Failed to delete sponsor image from Cloudinary:', cleanupErr);
            }
        }

        return deleted;
    }

    async toggleSponsorStatus(id: string, newStatus?: 'active' | 'inactive') {
        const existingSponsor = await this.sponsorRepository.findById(id);
        if (!existingSponsor) {
            throw new AppError('Sponsor not found', STATUS_CODES.NOT_FOUND);
        }

        const targetStatus: 'active' | 'inactive' = newStatus 
            ? (newStatus === 'active' ? 'active' : 'inactive')
            : (existingSponsor.status === 'active' ? 'inactive' : 'active');

        const updated = await this.sponsorRepository.update(id, {
            status: targetStatus
        });

        return updated;
    }
}
