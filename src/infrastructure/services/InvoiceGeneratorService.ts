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
        // Try multiple paths to accommodate both 'src' and 'dist' execution environments
        const possiblePaths = [
            path.resolve(process.cwd(), 'assets/logo.png'),                                 // backend root /assets
            path.resolve(__dirname, '../../../../assets/logo.png'),                         // from dist/infrastructure/services
            path.resolve(__dirname, '../../../../../nature-frontend/src/assets/images/logo.png'), // fallback to frontend src
            path.resolve(process.cwd(), '../nature-frontend/src/assets/images/logo.png')    // fallback to frontend src from backend root
        ];
        
        let logoPath = '';
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                logoPath = p;
                break;
            }
        }
        
        // Try to add logo if it exists
        if (logoPath) {
            doc.image(logoPath, 50, 45, { fit: [150, 75] });
        } else {
            doc.fillColor('#166534')
                .fontSize(20)
                .font('Helvetica-Bold')
                .text('NATURALAYAM', 50, 50);
        }

        doc.fillColor('#166534')
            .fontSize(28)
            .font('Helvetica-Bold')
            .text('ORDER INVOICE', 50, 45, { align: 'right' })
            .fillColor('#444444')
            .fontSize(10)
            .font('Helvetica')
            .text(`Invoice #: NAT-${order.orderId}`, 50, 75, { align: 'right' })
            .text(`Date: ${order.invoiceFinalizedAt ? order.invoiceFinalizedAt.toLocaleDateString() : order.createdAt.toLocaleDateString()}`, 50, 90, { align: 'right' })
            .text(`Order ID: ${order.orderId}`, 50, 105, { align: 'right' })
            .moveDown();
            
        doc.strokeColor('#166534')
            .lineWidth(2)
            .moveTo(50, 135)
            .lineTo(545, 135)
            .stroke();
    }

    private static generateCustomerInformation(doc: typeof PDFDocument, order: IOrderDocument) {
        doc.fillColor('#166534')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text('SOLD BY', 50, 155)
            .fillColor('#444444')
            .fontSize(10)
            .font('Helvetica')
            .text('Naturalayam', 50, 170)
            .text('Thrissur, Kerala', 50, 185)
            .text('India', 50, 200);

        const customerTop = 155;
        const customerX = 300;

        doc.fillColor('#166534')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text('BILL TO / SHIP TO', customerX, customerTop)
            .fillColor('#444444')
            .fontSize(10)
            .font('Helvetica')
            .text(order.address?.house || '', customerX, customerTop + 15)
            .text(`${order.address?.place || ''}, ${order.address?.city || ''}`, customerX, customerTop + 30)
            .text(`${order.address?.district || ''}, ${order.address?.state || ''} - ${order.address?.pincode || ''}`, customerX, customerTop + 45);
            
        if (order.paymentMethod) {
            doc.font('Helvetica-Bold').text('Payment Method:', customerX, customerTop + 65)
               .font('Helvetica').text(order.paymentMethod, customerX + 90, customerTop + 65);
        }
        if (order.paymentStatus) {
            doc.font('Helvetica-Bold').text('Payment Status:', customerX, customerTop + 80)
               .font('Helvetica').fillColor(order.paymentStatus === 'Success' ? '#166534' : '#444444').text(order.paymentStatus, customerX + 90, customerTop + 80);
        }
    }

    private static generateInvoiceTable(doc: typeof PDFDocument, order: IOrderDocument) {
        let invoiceTableTop = 270;

        // Table Header Background
        doc.rect(50, invoiceTableTop, 495, 25).fill('#166534');
        
        doc.fillColor('#ffffff')
           .font('Helvetica-Bold');
           
        this.generateTableRow(
            doc,
            invoiceTableTop + 8,
            'PRODUCT',
            'QTY',
            'UNIT PRICE',
            'TOTAL'
        );
        doc.font('Helvetica');

        const terminalNonSaleStatuses = ['Cancelled', 'Cancellation Request', 'Expired'];
        const activeItems = order.orderedProducts.filter(p => !terminalNonSaleStatuses.includes(p.orderStatus));
        const excludedItems = order.orderedProducts.filter(p => terminalNonSaleStatuses.includes(p.orderStatus));

        let i = 0;
        let position = invoiceTableTop + 25;
        for (i = 0; i < activeItems.length; i++) {
            const item = activeItems[i];
            position = invoiceTableTop + 25 + (i * 30);
            
            // Check for page break
            if (position > 700) {
                doc.addPage();
                invoiceTableTop = 50;
                position = invoiceTableTop;
            }

            // Alternating row background
            if (i % 2 !== 0) {
                doc.rect(50, position, 495, 30).fill('#f8fafc');
            }

            doc.fillColor('#333333');
            const price = item.price || 0;
            
            this.generateTableRow(
                doc,
                position + 10,
                item.productName,
                item.quantity.toString(),
                `Rs. ${price.toFixed(2)}`,
                `Rs. ${(price * item.quantity).toFixed(2)}`
            );

            this.generateHr(doc, position + 30);
        }

        const subtotalPosition = position + 40;
        
        doc.fillColor('#333333').font('Helvetica');
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
            doc.fillColor('#166534');
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

        doc.fillColor('#333333');
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
            doc.fillColor('#166534');
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

        if (order.cancelledAmount && order.cancelledAmount > 0) {
            doc.fillColor('#d97706');
            this.generateTableRow(
                doc,
                nextPosition,
                '',
                '',
                'Cancelled Items Deduction',
                `- Rs. ${order.cancelledAmount.toFixed(2)}`
            );
            nextPosition += 20;
        }

        // Grand Total Row
        doc.rect(280, nextPosition + 5, 265, 25).fill('#f0fdf4');
        doc.fillColor('#166534').font('Helvetica-Bold').fontSize(11);
        this.generateTableRow(
            doc,
            nextPosition + 12,
            '',
            '',
            'GRAND TOTAL',
            `Rs. ${((order.totalAmount || 0) - (order.cancelledAmount || 0)).toFixed(2)}`
        );
        doc.font('Helvetica').fontSize(10);

        const totalRefund = (order.refundedAmount || 0) > 0 ? order.refundedAmount : (order.returnedAmount || 0);
        if (totalRefund && totalRefund > 0) {
            const finalPosition = nextPosition + 40;
            doc.fillColor('#166534');
            this.generateTableRow(
                doc,
                finalPosition,
                '',
                '',
                'Refunded/Returned',
                `Rs. ${totalRefund.toFixed(2)}`
            );
        }

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
        doc.strokeColor('#166534')
            .lineWidth(1)
            .moveTo(50, 710)
            .lineTo(545, 710)
            .stroke();
            
        doc.fillColor('#166534')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Thank you for choosing Naturalayam.', 50, 725, { align: 'center', width: 500 })
            .fillColor('#666666')
            .font('Helvetica')
            .fontSize(9)
            .text('This is a computer-generated invoice.', 50, 740, { align: 'center', width: 500 });
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
        doc.strokeColor('#e2e8f0')
            .lineWidth(1)
            .moveTo(50, y)
            .lineTo(545, y)
            .stroke();
    }
}
