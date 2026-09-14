import ExcelJS from 'exceljs';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { s3Service } from '../../../common/services/s3Service';
import { EligibleFund } from '../models/EligibleFund';
import { ScoreCategoryCode } from '../../riskappetite/enums/riskEnums';
import { MasterFundUploadResponseDto } from '../dto/portfolioDto';

interface ParsedFundRow {
  fundName: string;
  isin: string;
  fundSubCategory: string;
  assetClass: string;
  instrumentType: string;
  scoreCategory: ScoreCategoryCode;
  isActive: boolean;
}

export class EligibleFundExcelService {
  /**
   * Generates a pre-styled .xlsx template for Master Funds upload with sample rows across all risk appetite categories.
   */
  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Master Funds Template');

    worksheet.columns = [
      { header: 'Fund Name', key: 'fundName', width: 45 },
      { header: 'ISIN', key: 'isin', width: 18 },
      { header: 'Score Category', key: 'scoreCategory', width: 22 },
      { header: 'Sub Category', key: 'fundSubCategory', width: 28 },
      { header: 'Asset Class', key: 'assetClass', width: 16 },
      { header: 'Instrument Type', key: 'instrumentType', width: 18 },
      { header: 'Active (TRUE/FALSE)', key: 'isActive', width: 20 },
    ];

    // Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF004D40' }, // Dark teal to match enterprise branding
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Sample data rows across 5 Score Categories
    const sampleRows = [
      {
        fundName: 'ICICI Prudential Liquid Fund - Direct Growth',
        isin: 'INF109K01BE1',
        scoreCategory: 'VERY_CONSERVATIVE',
        fundSubCategory: 'Liquid',
        assetClass: 'Debt',
        instrumentType: 'Mutual Fund',
        isActive: 'TRUE',
      },
      {
        fundName: 'SBI Balanced Advantage Fund - Direct Growth',
        isin: 'INF200K01BE4',
        scoreCategory: 'CONSERVATIVE',
        fundSubCategory: 'Dynamic Asset Allocation',
        assetClass: 'Hybrid',
        instrumentType: 'Mutual Fund',
        isActive: 'TRUE',
      },
      {
        fundName: 'HDFC Top 100 Fund - Direct Growth',
        isin: 'INF179K01BE2',
        scoreCategory: 'MODERATE',
        fundSubCategory: 'Large Cap',
        assetClass: 'Equity',
        instrumentType: 'Mutual Fund',
        isActive: 'TRUE',
      },
      {
        fundName: 'Parag Parikh Flexi Cap Fund - Direct Growth',
        isin: 'INF879O01019',
        scoreCategory: 'AGGRESSIVE',
        fundSubCategory: 'Flexi Cap',
        assetClass: 'Equity',
        instrumentType: 'Mutual Fund',
        isActive: 'TRUE',
      },
      {
        fundName: 'Nippon India Small Cap Fund - Direct Growth',
        isin: 'INF204K01BE3',
        scoreCategory: 'VERY_AGGRESSIVE',
        fundSubCategory: 'Small Cap',
        assetClass: 'Equity',
        instrumentType: 'Mutual Fund',
        isActive: 'TRUE',
      },
    ];

    for (const sample of sampleRows) {
      worksheet.addRow(sample);
    }

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  /**
   * Normalizes category string to valid ScoreCategoryCode enum.
   */
  private normalizeCategory(rawCategory: string): ScoreCategoryCode | null {
    const cleaned = rawCategory.trim().toLowerCase().replace(/[\s-]+/g, '_');
    const validCategories = Object.values(ScoreCategoryCode);
    if (validCategories.includes(cleaned as ScoreCategoryCode)) {
      return cleaned as ScoreCategoryCode;
    }
    return null;
  }

  /**
   * Parses uploaded Excel file, archives file in AWS S3 / LocalStack, and upserts funds into MongoDB by ISIN.
   */
  async processUpload(buffer: Buffer, originalFilename: string): Promise<MasterFundUploadResponseDto> {
    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `master-funds/${Date.now()}_${safeFilename}`;
    let presignedUrl: string | null = null;

    // 1. Upload raw snapshot to AWS S3 / LocalStack
    try {
      await s3Service.uploadFile({
        key: s3Key,
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      presignedUrl = await s3Service.getPresignedDownloadUrl(s3Key);
    } catch (s3Error: unknown) {
      const msg = s3Error instanceof Error ? s3Error.message : String(s3Error);
      logger.warn(
        { error: msg, s3Key },
        'S3 upload failed or LocalStack unavailable. Continuing with database ingestion.'
      );
    }

    // 2. Parse Excel workbook
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    } catch (parseError: unknown) {
      const parseMsg = parseError instanceof Error ? parseError.message : String(parseError);
      logger.warn({ error: parseMsg, originalFilename }, 'Failed to parse Excel file workbook');
      throw new AppError(`Could not parse master funds Excel file: ${parseMsg}`, 400);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      logger.warn({ originalFilename }, 'Master funds upload failed: Excel sheet is empty');
      throw new AppError('The uploaded spreadsheet does not contain any data rows', 400);
    }

    // Dynamically detect column mapping from header row
    const headerRow = worksheet.getRow(1);
    let colFundName = 1;
    let colIsin = 2;
    let colScoreCategory = 3;
    let colSubCategory = 4;
    let colAssetClass = 5;
    let colInstrumentType = 6;
    let colActive = 7;

    headerRow.eachCell((cell, colNumber) => {
      const headerText = String(cell.text || '').toLowerCase().trim();
      if (headerText.includes('fund name') || headerText.includes('scheme name')) {
        colFundName = colNumber;
      } else if (headerText.includes('isin')) {
        colIsin = colNumber;
      } else if (headerText.includes('score category') || headerText === 'category' || headerText.includes('risk category')) {
        colScoreCategory = colNumber;
      } else if (headerText.includes('sub category') || headerText.includes('subcategory')) {
        colSubCategory = colNumber;
      } else if (headerText.includes('asset class')) {
        colAssetClass = colNumber;
      } else if (headerText.includes('instrument')) {
        colInstrumentType = colNumber;
      } else if (headerText.includes('active')) {
        colActive = colNumber;
      }
    });

    const fundsToUpsert: ParsedFundRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;

      const fundName = String(row.getCell(colFundName).text || '').trim();
      const isin = String(row.getCell(colIsin).text || '').trim().toUpperCase();
      const rawCategory = String(row.getCell(colScoreCategory).text || '').trim();
      const fundSubCategory = String(row.getCell(colSubCategory).text || '').trim();
      const assetClass = String(row.getCell(colAssetClass).text || 'Equity').trim() || 'Equity';
      const instrumentType = String(row.getCell(colInstrumentType).text || 'Mutual Fund').trim() || 'Mutual Fund';
      const activeText = String(row.getCell(colActive).text || 'TRUE').trim().toUpperCase();

      // Skip completely blank rows
      if (!isin && !fundName) return;

      if (!fundName) {
        logger.warn({ rowNumber }, 'Master fund row skipped: Missing fund name');
        return;
      }

      if (!isin) {
        logger.warn({ rowNumber, fundName }, 'Master fund row skipped: Missing ISIN');
        return;
      }

      if (!rawCategory) {
        logger.warn({ rowNumber, fundName, isin }, 'Master fund row skipped: Missing score category');
        return;
      }

      const scoreCategory = this.normalizeCategory(rawCategory);
      if (!scoreCategory) {
        logger.warn(
          { rowNumber, fundName, rawCategory, validCategories: Object.values(ScoreCategoryCode) },
          'Master fund row skipped: Invalid score category'
        );
        return;
      }

      fundsToUpsert.push({
        fundName,
        isin,
        fundSubCategory: fundSubCategory || 'Diversified',
        assetClass,
        instrumentType,
        scoreCategory,
        isActive: activeText !== 'FALSE',
      });
    });

    if (fundsToUpsert.length === 0) {
      logger.warn({ originalFilename }, 'Master funds upload failed: No valid fund rows found');
      throw new AppError('No valid fund records found in the uploaded file', 400);
    }

    // 3. Upsert into MongoDB by ISIN
    let insertedRecords = 0;
    let updatedRecords = 0;

    for (const fund of fundsToUpsert) {
      const existing = await EligibleFund.findOne({ isin: fund.isin });
      if (existing) {
        existing.fundName = fund.fundName;
        existing.fundSubCategory = fund.fundSubCategory;
        existing.assetClass = fund.assetClass;
        existing.instrumentType = fund.instrumentType;
        existing.scoreCategory = fund.scoreCategory;
        existing.isActive = fund.isActive;
        await existing.save();
        updatedRecords++;
      } else {
        await EligibleFund.create(fund);
        insertedRecords++;
      }
    }

    logger.info(
      { totalParsed: fundsToUpsert.length, insertedRecords, updatedRecords, s3Key },
      'Master funds successfully processed and upserted into database'
    );

    return {
      status: 'SUCCESS',
      message: `Master funds processed successfully (${insertedRecords} inserted, ${updatedRecords} updated)`,
      filename: originalFilename,
      s3Key,
      fileUrl: presignedUrl,
      totalRecords: fundsToUpsert.length,
      insertedRecords,
      updatedRecords,
    };
  }
}

export const eligibleFundExcelService = new EligibleFundExcelService();
