import PDFDocument from 'pdfkit';
import { IOrderDocument } from '../../infrastructure/database/models/OrderModel';
import { AppError } from '../../shared/utils/AppError';
import { STATUS_CODES } from '../../shared/constants/statusCodes';
import fs from 'fs';
import path from 'path';

export class InvoiceGeneratorService {
    static async generateInvoice(order: IOrderDocument): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const buffers: Buffer[] = [];

                doc.on('data', (buffer) => buffers.push(buffer));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                this.generateHeader(doc, order);
                this.generateCustomerInformation(doc, order);
                this.generateInvoiceTable(doc, order);
                this.generateFooter(doc);

                doc.end();
            } catch (error) {
                console.error('PDF Generation Error:', error);
                reject(new AppError('Failed to generate PDF invoice', STATUS_CODES.INTERNAL_SERVER_ERROR));
            }
        });
    }

    private static generateHeader(doc: typeof PDFDocument, order: IOrderDocument) {
        doc.fillColor('#444444')
            .fontSize(20)
            .text('NATURALAYAM', 50, 57)
            .fontSize(10)
            .text('Natural & Herbal Wellness', 50, 80)
            .fontSize(20)
            .text('ORDER INVOICE', 50, 57, { align: 'right' })
            .fontSize(10)
            .text(`Order ID: ${order.orderId}`, 50, 80, { align: 'right' })
            .text(`Invoice Date: ${order.invoiceFinalizedAt ? order.invoiceFinalizedAt.toLocaleDateString() : order.createdAt.toLocaleDateString()}`, 50, 95, { align: 'right' })
            .moveDown();
            
        doc.moveTo(50, 115).lineTo(545, 115).stroke();
    }

    private static generateCustomerInformation(doc: typeof PDFDocument, order: IOrderDocument) {
        doc.fillColor('#444444')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Sold By', 50, 130)
            .font('Helvetica')
            .text('Naturalayam', 50, 145)
            .text('Thrissur, Kerala', 50, 160)
            .text('India', 50, 175);

        const customerTop = 130;
        const customerX = 300;

        doc.font('Helvetica-Bold')
            .text('Bill To / Ship To', customerX, customerTop)
            .font('Helvetica')
            .text(order.address?.house || '', customerX, customerTop + 15)
            .text(`${order.address?.place || ''}, ${order.address?.city || ''}`, customerX, customerTop + 30)
            .text(`${order.address?.district || ''}, ${order.address?.state || ''} - ${order.address?.pincode || ''}`, customerX, customerTop + 45);
            
        if (order.paymentMethod) {
            doc.text(`Payment Method: ${order.paymentMethod}`, customerX, customerTop + 60);
        }
        if (order.paymentStatus) {
            doc.text(`Payment Status: ${order.paymentStatus}`, customerX, customerTop + 75);
        }
    }

    private static generateInvoiceTable(doc: typeof PDFDocument, order: IOrderDocument) {
        const invoiceTableTop = 240;

        doc.font('Helvetica-Bold');
        this.generateTableRow(
            doc,
            invoiceTableTop,
            'Item',
            'Qty',
            'Price',
            'Total'
        );
        this.generateHr(doc, invoiceTableTop + 20);
        doc.font('Helvetica');

        const excludedStatuses = ['Cancelled', 'Returned', 'Return', 'Expired', 'Return Approved'];
        const activeItems = order.orderedProducts.filter(p => !excludedStatuses.includes(p.orderStatus));
        const excludedItems = order.orderedProducts.filter(p => excludedStatuses.includes(p.orderStatus));

        let i = 0;
        for (i = 0; i < activeItems.length; i++) {
            const item = activeItems[i];
            const position = invoiceTableTop + (i + 1) * 30;
            const price = item.price || 0;
            
            this.generateTableRow(
                doc,
                position,
                item.productName,
                item.quantity.toString(),
                `Rs. ${price.toFixed(2)}`,
                `Rs. ${(price * item.quantity).toFixed(2)}`
            );

            this.generateHr(doc, position + 20);
        }

        const subtotalPosition = invoiceTableTop + (i + 1) * 30;
        
        doc.font('Helvetica-Bold');
        this.generateTableRow(
            doc,
            subtotalPosition,
            '',
            '',
            'Subtotal',
            `Rs. ${(order.totalMRP || 0).toFixed(2)}`
        );
        
        let nextPosition = subtotalPosition + 20;

        if (order.totalDiscount && order.totalDiscount > 0) {
            this.generateTableRow(
                doc,
                nextPosition,
                '',
                '',
                'Discount',
                `- Rs. ${order.totalDiscount.toFixed(2)}`
            );
            nextPosition += 20;
        }

        if (order.deliveryCharge) {
            this.generateTableRow(
                doc,
                nextPosition,
                '',
                '',
                'Shipping',
                `Rs. ${order.deliveryCharge.toFixed(2)}`
            );
            nextPosition += 20;
        }

        if (order.packingCharge) {
            this.generateTableRow(
                doc,
                nextPosition,
                '',
                '',
                'Packing',
                `Rs. ${order.packingCharge.toFixed(2)}`
            );
            nextPosition += 20;
        }

        if (order.naturePointsDiscount && order.naturePointsDiscount > 0) {
            this.generateTableRow(
                doc,
                nextPosition,
                '',
                '',
                'Nature Points',
                `- Rs. ${order.naturePointsDiscount.toFixed(2)}`
            );
            nextPosition += 20;
        }

        doc.font('Helvetica-Bold');
        this.generateTableRow(
            doc,
            nextPosition + 10,
            '',
            '',
            'Grand Total',
            `Rs. ${(order.totalAmount || 0).toFixed(2)}`
        );
        doc.font('Helvetica');

        // CANCELLED / EXCLUDED ITEMS SECTION
        if (excludedItems.length > 0) {
            let excludedTop = nextPosition + 60;
            
            // Check if we need a new page for excluded items
            if (excludedTop > 700) {
                doc.addPage();
                excludedTop = 50;
            }

            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('CANCELLED / EXCLUDED ITEMS', 50, excludedTop);
            
            doc.fontSize(9).font('Helvetica-Oblique')
               .text('Not included in invoice payable total', 50, excludedTop + 15);

            this.generateHr(doc, excludedTop + 30);
            
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('Item', 50, excludedTop + 40, { width: 200 })
               .text('Qty', 280, excludedTop + 40, { width: 90, align: 'right' })
               .text('Status', 370, excludedTop + 40, { width: 90, align: 'right' })
               .text('Amount', 0, excludedTop + 40, { align: 'right' });
            
            this.generateHr(doc, excludedTop + 55);
            doc.font('Helvetica');
            
            for (let j = 0; j < excludedItems.length; j++) {
                const exItem = excludedItems[j];
                const exPos = excludedTop + 65 + (j * 20);
                const exPrice = exItem.price || 0;
                
                doc.fontSize(10)
                   .text(exItem.productName, 50, exPos, { width: 200 })
                   .text(exItem.quantity.toString(), 280, exPos, { width: 90, align: 'right' })
                   .text(exItem.orderStatus, 370, exPos, { width: 90, align: 'right' })
                   .text(`Rs. ${(exPrice * exItem.quantity).toFixed(2)}`, 0, exPos, { align: 'right' });
            }
        }
    }

    private static generateFooter(doc: typeof PDFDocument) {
        doc.fontSize(10)
            .text(
                'Thank you for shopping with Naturalayam. This is a computer-generated invoice.',
                50,
                700,
                { align: 'center', width: 500 }
            );
    }

    private static generateTableRow(
        doc: typeof PDFDocument,
        y: number,
        item: string,
        quantity: string,
        price: string,
        lineTotal: string
    ) {
        doc.fontSize(10)
            .text(item, 50, y, { width: 200 })
            .text(quantity, 280, y, { width: 90, align: 'right' })
            .text(price, 370, y, { width: 90, align: 'right' })
            .text(lineTotal, 0, y, { align: 'right' });
    }

    private static generateHr(doc: typeof PDFDocument, y: number) {
        doc.strokeColor('#aaaaaa')
            .lineWidth(1)
            .moveTo(50, y)
            .lineTo(545, y)
            .stroke();
    }
}
