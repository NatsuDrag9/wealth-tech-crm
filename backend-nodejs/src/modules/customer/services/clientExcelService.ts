import ExcelJS from 'exceljs';
import { CreateClientDto } from '../dto/clientDto';
import { Gender } from '../enums/clientEnums';
import { logger } from '../../../common/utils/logger';

export class ClientExcelService {
  /**
   * Generates a styled Excel (.xlsx) template with headers and 1 sample row.
   * RMs download this template, fill in client records, and upload it.
   */
  async generateClientBulkTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Clients Template');

    // Define column headers, keys, and display widths
    worksheet.columns = [
      { header: 'First Name', key: 'firstName', width: 18 },
      { header: 'Last Name', key: 'lastName', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'PAN', key: 'pan', width: 16 },
      { header: 'Date of Birth (YYYY-MM-DD)', key: 'dateOfBirth', width: 26 },
      { header: 'Gender (MALE/FEMALE/OTHER)', key: 'gender', width: 28 },
      { header: 'Address Line', key: 'addressLine', width: 30 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'State', key: 'state', width: 18 },
      { header: 'Pincode', key: 'pincode', width: 14 },
      { header: 'Country', key: 'country', width: 16 },
    ];

    // Header styling: Dark Blue corporate theme with bold white text
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    // Provide 1 sample row to demonstrate expected formatting
    worksheet.addRow({
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'aarav.sharma@example.com',
      phone: '9876543210',
      pan: 'ABCDE1234F',
      dateOfBirth: '1992-05-15',
      gender: 'MALE',
      addressLine: 'Flat 402, Highline Towers',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Parses uploaded Excel buffer into validated CreateClientDto records.
   */
  async parseClientExcel(buffer: Buffer): Promise<CreateClientDto[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      logger.warn('Excel parsing aborted: No worksheet found');
      return [];
    }

    const clients: CreateClientDto[] = [];

    // Row 1 is header; iterate starting from row 2
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const firstName = this.getCellValue(row.getCell(1));
      const email = this.getCellValue(row.getCell(3));
      const phone = this.getCellValue(row.getCell(4));

      // Skip empty or invalid rows missing primary required fields
      if (!firstName || !email || !phone) {
        return;
      }

      const lastName = this.getCellValue(row.getCell(2)) || '';
      const pan = this.getCellValue(row.getCell(5))?.toUpperCase();
      const rawDob = row.getCell(6).value;
      const dateOfBirth = this.parseDate(rawDob);
      const rawGender = this.getCellValue(row.getCell(7))?.toUpperCase();
      const gender = Object.values(Gender).includes(rawGender as Gender)
        ? (rawGender as Gender)
        : undefined;

      const addressLine = this.getCellValue(row.getCell(8));
      const city = this.getCellValue(row.getCell(9));
      const state = this.getCellValue(row.getCell(10));
      const pincode = this.getCellValue(row.getCell(11));
      const country = this.getCellValue(row.getCell(12)) || 'India';

      clients.push({
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        pan: pan || undefined,
        dateOfBirth,
        gender,
        addressLine: addressLine || undefined,
        city: city || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
        country,
      });
    });

    logger.info({ parsedCount: clients.length }, 'Successfully parsed clients from Excel');
    return clients;
  }

  /**
   * Helper: Extracts string representation using ExcelJS cell.text.
   */
  private getCellValue(cell: ExcelJS.Cell): string | undefined {
    const text = cell.text?.trim();
    return text && text.length > 0 ? text : undefined;
  }

  /**
   * Helper: Safely parses Excel dates using unknown type and runtime type-guards.
   */
  private parseDate(val: unknown): Date | undefined {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    if (typeof val === 'string' || typeof val === 'number') {
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  }
}

export const clientExcelService = new ClientExcelService();
