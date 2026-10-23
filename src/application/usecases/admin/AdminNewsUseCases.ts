import { inject, injectable } from 'tsyringe';
import { INewsRepository } from '../../../domain/repositories/INewsRepository';
import cloudinary from '../../../infrastructure/config/cloudinary';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

/**
 * Safely extracts the Cloudinary public_id for a news cover image.
 * Ensures the target belongs to the 'natural_ayam/news' folder.
 */
function extractNewsImagePublicId(url?: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
        if (!url.includes('res.cloudinary.com')) return null;
        const match = url.match(/\/image\/upload\/(?:v\d+\/)?(natural_ayam\/news\/[^.?#]+)(?:\.[a-zA-Z0-9]+)?/);
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
export class AdminNewsUseCases {
    constructor(
        @inject('INewsRepository') private newsRepository: INewsRepository
    ) {}

    async addNews(data: {
        title: string;
        summary?: string;
        content?: string;
        publishedDate?: string | Date;
        websiteUrl?: string;
        fileData: string;
        status?: 'active' | 'inactive';
    }) {
        const trimmedTitle = typeof data.title === 'string' ? data.title.trim() : '';
        if (!trimmedTitle) {
            throw new AppError('Title is required and cannot be empty or whitespace only.', STATUS_CODES.BAD_REQUEST);
        }

        const trimmedSummary = typeof data.summary === 'string' ? data.summary.trim() : '';
        const trimmedContent = typeof data.content === 'string' ? data.content.trim() : '';

        let trimmedWebsiteUrl = '';
        if (data.websiteUrl && typeof data.websiteUrl === 'string') {
            trimmedWebsiteUrl = data.websiteUrl.trim();
            if (trimmedWebsiteUrl && !isValidWebsiteUrl(trimmedWebsiteUrl)) {
                throw new AppError('Website URL must be a valid external URL starting with http:// or https://', STATUS_CODES.BAD_REQUEST);
            }
        }

        let publishedDate = new Date();
        if (data.publishedDate) {
            const parsed = new Date(data.publishedDate);
            if (!isNaN(parsed.getTime())) {
                publishedDate = parsed;
            }
        }

        if (!data.fileData) {
            throw new AppError('News cover image is required.', STATUS_CODES.BAD_REQUEST);
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
                folder: 'natural_ayam/news',
                resource_type: 'image'
            });
            imageUrl = uploadRes.secure_url;
            imagePublicId = uploadRes.public_id;
        } catch (error) {
            console.error('Cloudinary news image upload error:', error);
            throw new AppError('News image upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
        }

        try {
            const newNews = await this.newsRepository.create({
                title: trimmedTitle,
                summary: trimmedSummary,
                content: trimmedContent,
                publishedDate,
                imageUrl,
                imagePublicId,
                websiteUrl: trimmedWebsiteUrl,
                status
            });
            return newNews;
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

    async getAllNews() {
        return await this.newsRepository.findAll();
    }

    async getNewsById(id: string) {
        const news = await this.newsRepository.findById(id);
        if (!news) {
            throw new AppError('News item not found', STATUS_CODES.NOT_FOUND);
        }
        return news;
    }

    async editNews(id: string, data: {
        title?: string;
        summary?: string;
        content?: string;
        publishedDate?: string | Date;
        websiteUrl?: string;
        fileData?: string;
        status?: 'active' | 'inactive';
    }) {
        const existingNews = await this.newsRepository.findById(id);
        if (!existingNews) {
            throw new AppError('News item not found', STATUS_CODES.NOT_FOUND);
        }

        let title = existingNews.title;
        if (data.title !== undefined) {
            const trimmed = data.title.trim();
            if (!trimmed) {
                throw new AppError('Title cannot be empty.', STATUS_CODES.BAD_REQUEST);
            }
            title = trimmed;
        }

        let summary = existingNews.summary;
        if (data.summary !== undefined) {
            summary = data.summary.trim();
        }

        let content = existingNews.content;
        if (data.content !== undefined) {
            content = data.content.trim();
        }

        let publishedDate = existingNews.publishedDate;
        if (data.publishedDate !== undefined) {
            const parsed = new Date(data.publishedDate);
            if (!isNaN(parsed.getTime())) {
                publishedDate = parsed;
            }
        }

        let websiteUrl = existingNews.websiteUrl;
        if (data.websiteUrl !== undefined) {
            const trimmed = data.websiteUrl.trim();
            if (trimmed && !isValidWebsiteUrl(trimmed)) {
                throw new AppError('Website URL must be a valid external URL starting with http:// or https://', STATUS_CODES.BAD_REQUEST);
            }
            websiteUrl = trimmed;
        }

        let status = existingNews.status;
        if (data.status !== undefined) {
            status = data.status === 'inactive' ? 'inactive' : 'active';
        }

        let imageUrl = existingNews.imageUrl;
        let imagePublicId = existingNews.imagePublicId;
        const oldImagePublicId = existingNews.imagePublicId || extractNewsImagePublicId(existingNews.imageUrl);

        let newImageUploaded = false;
        let newImagePublicId: string | null = null;

        if (data.fileData) {
            const isImage = /^data:image\/(jpeg|jpg|png|webp|gif|svg\+xml);base64,/.test(data.fileData);
            if (!isImage) {
                throw new AppError('Only JPG, JPEG, PNG, WEBP, GIF, and SVG image files are allowed.', STATUS_CODES.BAD_REQUEST);
            }

            try {
                const uploadRes = await cloudinary.uploader.upload(data.fileData, {
                    folder: 'natural_ayam/news',
                    resource_type: 'image'
                });
                imageUrl = uploadRes.secure_url;
                imagePublicId = uploadRes.public_id;
                newImagePublicId = uploadRes.public_id;
                newImageUploaded = true;
            } catch (error) {
                console.error('Cloudinary news image upload error:', error);
                throw new AppError('News image upload failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
            }
        }

        try {
            const updated = await this.newsRepository.update(id, {
                title,
                summary,
                content,
                publishedDate,
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
                    console.error('Failed to cleanup old news image:', cleanupErr);
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

    async deleteNews(id: string) {
        const existingNews = await this.newsRepository.findById(id);
        if (!existingNews) {
            throw new AppError('News item not found', STATUS_CODES.NOT_FOUND);
        }

        const publicId = existingNews.imagePublicId || extractNewsImagePublicId(existingNews.imageUrl);
        const deleted = await this.newsRepository.delete(id);

        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cleanupErr) {
                console.error('Failed to delete news image from Cloudinary:', cleanupErr);
            }
        }

        return deleted;
    }

    async toggleNewsStatus(id: string, newStatus?: 'active' | 'inactive') {
        const existingNews = await this.newsRepository.findById(id);
        if (!existingNews) {
            throw new AppError('News item not found', STATUS_CODES.NOT_FOUND);
        }

        const targetStatus: 'active' | 'inactive' = newStatus 
            ? (newStatus === 'active' ? 'active' : 'inactive')
            : (existingNews.status === 'active' ? 'inactive' : 'active');

        const updated = await this.newsRepository.update(id, {
            status: targetStatus
        });

        return updated;
    }
}
