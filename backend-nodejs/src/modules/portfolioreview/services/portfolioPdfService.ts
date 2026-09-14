import PDFDocument from 'pdfkit';
import { IPortfolioRecommendation } from '../models/PortfolioRecommendation';
import { IEligibleFund } from '../models/EligibleFund';
import { FLOW_TYPE_DISPLAY_NAMES } from '../enums/portfolioEnums';
import { SCORE_CATEGORIES, ScoreCategoryCode } from '../../riskappetite/enums/riskEnums';
import { logger } from '../../../common/utils/logger';
import { s3Service } from '../../../common/services/s3Service';

export interface GeneratedPdfResult {
  s3Key: string;
  presignedUrl: string;
}

export class PortfolioPdfService {
  /**
   * Compiles a branded investment recommendation proposal PDF entirely in-memory
   * and persists the resulting binary buffer directly to AWS S3 / LocalStack.
   * Returns the S3 object key and a secure, time-limited pre-signed download URL.
   */
  async generateRecommendationPdf(
    recommendation: IPortfolioRecommendation
  ): Promise<GeneratedPdfResult> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      // Currency Formatter (Indian Rupee)
      const currencyFormatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      });

      // 1. Header Banner
      doc
        .fillColor('#182B49')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('INVESTMENT RECOMMENDATION PROPOSAL', { align: 'center' });

      doc
        .moveDown(0.3)
        .fillColor('#64748B')
        .fontSize(10)
        .font('Helvetica')
        .text('WealthTech CRM — Client Advisory Services', { align: 'center' });

      doc.moveDown(1.5);

      // 2. Metadata Box
      const riskCategoryInfo = recommendation.investorCategory
        ? SCORE_CATEGORIES[recommendation.investorCategory as ScoreCategoryCode]
        : null;

      const flowDisplayName =
        FLOW_TYPE_DISPLAY_NAMES[recommendation.flowType] || recommendation.flowType;

      const startY = doc.y;
      doc.rect(40, startY, 515, 65).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc.fillColor('#1E293B').fontSize(9).font('Helvetica');
      doc.text(`Client ID: ${recommendation.client.toString()}`, 55, startY + 12);
      doc.text(`Recommendation ID: #${recommendation._id.toString()}`, 300, startY + 12);

      doc.text(`Strategy / Flow: ${flowDisplayName}`, 55, startY + 28);
      doc.text(`Investor Category: ${riskCategoryInfo?.displayName || 'N/A'}`, 300, startY + 28);

      const formattedDate = new Date(recommendation.createdAt || Date.now()).toLocaleDateString(
        'en-GB',
        { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      );
      doc.text(`Generated On: ${formattedDate}`, 55, startY + 44);
      doc.font('Helvetica-Bold').text('Status: FINAL PROPOSAL', 300, startY + 44);

      doc.moveDown(3);

      // 3. Section Title
      doc
        .fillColor('#1E293B')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Proposed Fund Allocations');

      doc.moveDown(0.5);

      // 4. Table Header
      const tableTop = doc.y;
      doc.rect(40, tableTop, 515, 20).fill('#1E3A8A');

      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      doc.text('#', 45, tableTop + 6, { width: 25 });
      doc.text('Fund Name', 75, tableTop + 6, { width: 170 });
      doc.text('ISIN', 250, tableTop + 6, { width: 75 });
      doc.text('Asset Class', 330, tableTop + 6, { width: 85 });
      doc.text('Amount (INR)', 420, tableTop + 6, { width: 75, align: 'right' });
      doc.text('Target', 505, tableTop + 6, { width: 45 });

      // 5. Table Rows
      let rowY = tableTop + 20;
      let totalAllocated = 0;

      doc.font('Helvetica').fontSize(8);

      recommendation.funds.forEach((item, index) => {
        const isAlternate = index % 2 === 1;
        if (isAlternate) {
          doc.rect(40, rowY, 515, 20).fill('#F8FAFC');
        }

        const fund = item.eligibleFund as IEligibleFund;
        const fundName = fund?.fundName || 'Mutual Fund';
        const isin = fund?.isin || 'N/A';
        const assetClass = fund?.assetClass ? `${fund.assetClass}` : 'Mutual Fund';
        const replaces = item.replacesEntryId ? 'Replace' : 'New';

        totalAllocated += item.amount;

        doc.fillColor('#334155');
        doc.text(String(item.displayOrder || index + 1), 45, rowY + 6, { width: 25 });
        doc.text(fundName, 75, rowY + 6, { width: 170, ellipsis: true });
        doc.text(isin, 250, rowY + 6, { width: 75 });
        doc.text(assetClass, 330, rowY + 6, { width: 85 });
        doc.text(currencyFormatter.format(item.amount), 420, rowY + 6, { width: 75, align: 'right' });
        doc.text(replaces, 505, rowY + 6, { width: 45 });

        rowY += 20;
      });

      // 6. Total Row
      doc.rect(40, rowY, 515, 22).fillAndStroke('#F1F5F9', '#CBD5E1');
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9);
      doc.text('Total Proposed Allocation', 75, rowY + 6, { width: 250 });
      doc.text(currencyFormatter.format(totalAllocated), 420, rowY + 6, { width: 75, align: 'right' });

      // 7. Regulatory Disclaimer Footer
      doc
        .moveDown(3)
        .fillColor('#94A3B8')
        .fontSize(7)
        .font('Helvetica-Oblique')
        .text(
          'Disclaimer: Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing. Past performance is not indicative of future returns. This proposal is generated strictly for advisory purposes.',
          40,
          750,
          { align: 'center', width: 515 }
        );

      doc.end();

      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const s3Key = `recommendations/${recommendation._id.toString()}/proposal_${Date.now()}.pdf`;

          await s3Service.uploadFile({
            key: s3Key,
            buffer: pdfBuffer,
            contentType: 'application/pdf',
          });

          const presignedUrl = await s3Service.getPresignedDownloadUrl(s3Key);

          logger.info(
            { s3Key, recommendationId: recommendation._id.toString() },
            'Recommendation PDF generated entirely in-memory and uploaded directly to S3'
          );

          resolve({ s3Key, presignedUrl });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(
            { error: msg, recommendationId: recommendation._id.toString() },
            'Failed to upload generated recommendation PDF to S3'
          );
          reject(error);
        }
      });

      doc.on('error', (err) => {
        logger.error(
          { err, recommendationId: recommendation._id.toString() },
          'PDFKit compilation error occurred'
        );
        reject(err);
      });
    });
  }
}

export const portfolioPdfService = new PortfolioPdfService();
