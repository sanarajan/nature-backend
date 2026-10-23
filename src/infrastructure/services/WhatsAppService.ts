
import { injectable } from 'tsyringe';
import axios from 'axios';
import { IWhatsAppService } from '../../domain/services/IWhatsAppService';
import { WHATSAPP_CONFIG } from '../config/whatsapp.config';

@injectable()
export class WhatsAppService implements IWhatsAppService {
    async sendVerificationOTP(
        phoneNumber: string,
        otp: string
    ): Promise<void> {
        const apiKey = WHATSAPP_CONFIG.API_KEY;
        if (!apiKey) {
            throw new Error('WhatsApp API key is not configured');
        }

        if (!phoneNumber || !otp) {
            throw new Error('Phone number and verification value are required');
        }

        const digits = phoneNumber.replace(/\D/g, '');

        const recipient = digits.startsWith('91')
            ? `+${digits}`
            : digits.length === 10
                ? `+91${digits}`
                : `+${digits}`;

        try {

            await axios.post(
                WHATSAPP_CONFIG.API_URL,
                {
                    phoneNumber: recipient,
                    template: {
                        name: 'naturalayam_account_verification',
                        language: {
                            code: 'en',
                        },
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    {
                                        type: 'text',
                                        text: otp,
                                    },
                                ],
                            },
                            {
                                type: 'button',
                                sub_type: 'url',
                                index: '0',
                                parameters: [
                                    {
                                        type: 'text',
                                        text: otp,
                                    },
                                ],
                            },
                        ],
                    },
                },
                {
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json',
                    },
                    timeout: WHATSAPP_CONFIG.REQUEST_TIMEOUT,
                }
            );

        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                console.error(
                    'WhatsApp verification message failed:',
                    error.response?.status ?? 'No response status'
                );
                console.error(
                    'Telinfy response:',
                    error.response?.data ?? error.message
                );
            } else {
                console.error('WhatsApp verification message failed:', error);
            }

            throw new Error('Failed to send WhatsApp verification message');
        }
    }




    async sendWelcomeComboOffer(
        phoneNumber: string,
        comboName: string,
        comboImageUrl: string,
        comboUrl: string
    ): Promise<void> {
        const apiKey = WHATSAPP_CONFIG.API_KEY;

        if (!apiKey) {
            throw new Error('WhatsApp API key is not configured');
        }

        if (!phoneNumber || !comboName || !comboImageUrl || !comboUrl) {
            throw new Error('Phone number, combo name, image URL and combo URL are required');
        }

        const digits = phoneNumber.replace(/\D/g, '');

        const recipient = digits.startsWith('91')
            ? `+${digits}`
            : digits.length === 10
                ? `+91${digits}`
                : `+${digits}`;

        try {
            const response = await axios.post(
                WHATSAPP_CONFIG.API_URL,
                {
                    phoneNumber: recipient,
                    template: {
                        name: 'naturalayam_welcome_combo_offer',
                        language: {
                            code: 'en',
                        },
                        components: [
                            {
                                type: 'header',
                                parameters: [
                                    {
                                        type: 'image',
                                        image: {
                                            link: comboImageUrl,
                                        },
                                    },
                                ],
                            },
                            {
                                type: 'body',
                                parameters: [
                                    {
                                        type: 'text',
                                        text: comboName,
                                    },
                                ],
                            },

                            {
                                type: 'button',
                                sub_type: 'url',
                                index: '0',
                                parameters: [
                                    {
                                        type: 'text',
                                        text: comboUrl,
                                    },
                                ],
                            },
                        ],
                    },
                },
                {
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json',
                    },
                    timeout: WHATSAPP_CONFIG.REQUEST_TIMEOUT,
                }
            );

            console.log('[Welcome WhatsApp] Telinfy status:', response.status);
            console.log('[Welcome WhatsApp] Telinfy response:', response.data);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                console.error(
                    'WhatsApp welcome message failed:',
                    error.response?.status ?? 'No response status'
                );
                console.error(
                    'Telinfy response:',
                    error.response?.data ?? error.message
                );
            } else {
                console.error('WhatsApp welcome message failed:', error);
            }

            throw new Error('Failed to send WhatsApp welcome message');
        }
    }

    async sendOrderConfirmation(
        phoneNumber: string,
        customerName: string,
        orderId: string,
        totalAmount: number,
        orderUrl: string
    ): Promise<void> {
        const apiKey = WHATSAPP_CONFIG.API_KEY;

        if (!apiKey) {
            throw new Error('WhatsApp API key is not configured');
        }

        if (!phoneNumber || !customerName || !orderId || !orderUrl) {
            throw new Error('Required order confirmation details are missing');
        }

        const digits = phoneNumber.replace(/\D/g, '');

        const recipient = digits.startsWith('91')
            ? `+${digits}`
            : digits.length === 10
                ? `+91${digits}`
                : `+${digits}`;

        try {
            const response = await axios.post(
                WHATSAPP_CONFIG.API_URL,
                {
                    phoneNumber: recipient,
                    template: {
                        name: 'naturalayam_order_confirmation',
                        language: {
                            code: 'en',
                        },
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    {
                                        type: 'text',
                                        text: customerName,
                                    },
                                    {
                                        type: 'text',
                                        text: orderId,
                                    },
                                    {
                                        type: 'text',
                                        text: Number(totalAmount).toFixed(2),
                                    },
                                ],
                            },
                            {
                                type: 'button',
                                sub_type: 'url',
                                index: '0',
                                parameters: [
                                    {
                                        type: 'text',
                                        text: orderUrl,
                                    },
                                ],
                            },
                        ],
                    },
                },
                {
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json',
                    },
                    timeout: WHATSAPP_CONFIG.REQUEST_TIMEOUT,
                }
            );

            console.log(
                '[Order Confirmation WhatsApp] Telinfy status:',
                response.status
            );
            console.log(
                '[Order Confirmation WhatsApp] Telinfy response:',
                response.data
            );
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                console.error(
                    'Order confirmation WhatsApp failed:',
                    error.response?.status ?? 'No response status'
                );
                console.error(
                    'Telinfy response:',
                    error.response?.data ?? error.message
                );
            } else {
                console.error('Order confirmation WhatsApp failed:', error);
            }

            throw new Error('Failed to send WhatsApp order confirmation');
        }
    }

    
async sendOrderDelivered(
    phoneNumber: string,
    customerName: string,
    orderId: string,
    orderUrl: string
): Promise<void> {
    const apiKey = WHATSAPP_CONFIG.API_KEY;

    if (!apiKey) {
        throw new Error('WhatsApp API key is not configured');
    }

    if (!phoneNumber || !customerName || !orderId || !orderUrl) {
        throw new Error('Required order delivery details are missing');
    }

    const digits = phoneNumber.replace(/\D/g, '');

    const recipient = digits.startsWith('91')
        ? `+${digits}`
        : digits.length === 10
            ? `+91${digits}`
            : `+${digits}`;

    try {
        const response = await axios.post(
            WHATSAPP_CONFIG.API_URL,
            {
                phoneNumber: recipient,
                template: {
                    name: 'naturalayam_order_delivered',
                    language: {
                        code: 'en',
                    },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                {
                                    type: 'text',
                                    text: customerName,
                                },
                                {
                                    type: 'text',
                                    text: orderId,
                                },
                            ],
                        },
                        {
                            type: 'button',
                            sub_type: 'url',
                            index: '0',
                            parameters: [
                                {
                                    type: 'text',
                                    text: orderUrl,
                                },
                            ],
                        },
                    ],
                },
            },
            {
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: WHATSAPP_CONFIG.REQUEST_TIMEOUT,
            }
        );

        console.log(
            '[Order Delivered WhatsApp] Telinfy status:',
            response.status
        );
        console.log(
            '[Order Delivered WhatsApp] Telinfy response:',
            response.data
        );
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error(
                'Order delivered WhatsApp failed:',
                error.response?.status ?? 'No response status'
            );
            console.error(
                'Telinfy response:',
                error.response?.data ?? error.message
            );
        } else {
            console.error('Order delivered WhatsApp failed:', error);
        }

        throw new Error('Failed to send WhatsApp order delivered message');
    }
}

async sendProductShipped(
    phoneNumber: string,
    customerName: string,
    productName: string,
    orderId: string,
    trackingUrl: string
): Promise<void> {
    const apiKey = WHATSAPP_CONFIG.API_KEY;

    if (!apiKey) {
        throw new Error('WhatsApp API key is not configured');
    }

    if (
        !phoneNumber ||
        !customerName ||
        !productName ||
        !orderId ||
        !trackingUrl
    ) {
        throw new Error('Required product shipping details are missing');
    }

    const digits = phoneNumber.replace(/\D/g, '');

    const recipient = digits.startsWith('91')
        ? `+${digits}`
        : digits.length === 10
            ? `+91${digits}`
            : `+${digits}`;

    try {
        const response = await axios.post(
            WHATSAPP_CONFIG.API_URL,
            {
                phoneNumber: recipient,
                template: {
                    name: 'naturalayam_order_shipped',
                    language: {
                        code: 'en',
                    },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                {
                                    type: 'text',
                                    text: customerName,
                                },
                                {
                                    type: 'text',
                                    text: productName,
                                },
                            ],
                        },
                        {
                            type: 'button',
                            sub_type: 'url',
                            index: '0',
                            parameters: [
                                {
                                    type: 'text',
                                    text: trackingUrl,
                                },
                            ],
                        },
                    ],
                },
            },
            {
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: WHATSAPP_CONFIG.REQUEST_TIMEOUT,
            }
        );

        console.log(
            '[Product Shipped WhatsApp] Telinfy status:',
            response.status
        );

        console.log(
            '[Product Shipped WhatsApp] Telinfy response:',
            response.data
        );
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error(
                'Product shipped WhatsApp failed:',
                error.response?.status ?? 'No response status'
            );

            console.error(
                'Telinfy response:',
                error.response?.data ?? error.message
            );
        } else {
            console.error(
                'Product shipped WhatsApp failed:',
                error
            );
        }

        throw new Error(
            'Failed to send WhatsApp product shipped message'
        );
    }
}


}
