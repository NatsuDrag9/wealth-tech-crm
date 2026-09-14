package com.wealthtech.crm.modules.portfolioreview.service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import com.wealthtech.crm.modules.portfolioreview.dto.MasterFundRowDto;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;
import com.wealthtech.crm.modules.usermanager.exception.BadRequestException;

import lombok.extern.slf4j.Slf4j;

/**
 * Service for generating master funds spreadsheet template and parsing uploaded Excel files.
 */
@Slf4j
@Service
public class EligibleFundExcelService {

    private static final String[] HEADERS = {
        "Fund Name", "ISIN", "Score Category", "Sub Category", "Asset Class", "Instrument Type", "Active (TRUE/FALSE)"
    };

    private final DataFormatter dataFormatter = new DataFormatter();

    /**
     * Generates a pre-styled Excel template with headers and representative sample records across risk appetite bands.
     */
    public byte[] generateMasterFundsTemplate() {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Master Funds Template");

            // Header Style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_TEAL.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Create Header Row
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            // Sample Data Rows across 5 Score Categories
            Object[][] sampleData = {
                {"HDFC Top 100 Fund - Direct Growth", "INF179K01BE2", "MODERATE", "Large Cap", "Equity", "Mutual Fund", "TRUE"},
                {"ICICI Prudential Liquid Fund - Direct Growth", "INF109K01BE1", "VERY_CONSERVATIVE", "Liquid", "Debt", "Mutual Fund", "TRUE"},
                {"Nippon India Small Cap Fund - Direct Growth", "INF204K01BE3", "VERY_AGGRESSIVE", "Small Cap", "Equity", "Mutual Fund", "TRUE"},
                {"Parag Parikh Flexi Cap Fund - Direct Growth", "INF879O01019", "AGGRESSIVE", "Flexi Cap", "Equity", "Mutual Fund", "TRUE"},
                {"SBI Balanced Advantage Fund - Direct Growth", "INF200K01BE4", "CONSERVATIVE", "Dynamic Asset Allocation", "Hybrid", "Mutual Fund", "TRUE"}
            };

            for (int r = 0; r < sampleData.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < sampleData[r].length; c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue((String) sampleData[r][c]);
                }
            }

            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();

        } catch (Exception e) {
            log.error("Failed to generate master funds Excel template", e);
            throw new RuntimeException("Could not generate master funds Excel template", e);
        }
    }

    /**
     * Parses an uploaded Excel (.xlsx, .xls) spreadsheet into a list of MasterFundRowDto records.
     */
    public List<MasterFundRowDto> parseMasterFundsExcel(InputStream is) {
        List<MasterFundRowDto> list = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new BadRequestException("The uploaded spreadsheet does not contain any sheets");
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                String fundName = getCellValue(row, 0);
                String isin = getCellValue(row, 1);
                String categoryStr = getCellValue(row, 2);
                String subCategory = getCellValue(row, 3);
                String assetClass = getCellValue(row, 4);
                String instrumentType = getCellValue(row, 5);
                String activeStr = getCellValue(row, 6);

                if (fundName == null || fundName.isBlank()) {
                    log.warn("Row {} skipped: missing fund name", i + 1);
                    continue;
                }
                if (isin == null || isin.isBlank()) {
                    log.warn("Row {} skipped: missing ISIN for fund '{}'", i + 1, fundName);
                    continue;
                }
                if (categoryStr == null || categoryStr.isBlank()) {
                    log.warn("Row {} skipped: missing score category for fund '{}'", i + 1, fundName);
                    continue;
                }

                ScoreCategory category;
                try {
                    category = ScoreCategory.fromCode(categoryStr.trim());
                } catch (IllegalArgumentException e) {
                    log.warn("Row {} skipped: invalid score category '{}'", i + 1, categoryStr);
                    continue;
                }

                boolean isActive = activeStr == null || activeStr.isBlank() || "true".equalsIgnoreCase(activeStr.trim());
                String resolvedInstrument = (instrumentType != null && !instrumentType.isBlank()) ? instrumentType.trim() : "Mutual Fund";

                list.add(new MasterFundRowDto(
                        fundName.trim(),
                        isin.trim().toUpperCase(),
                        category,
                        subCategory != null ? subCategory.trim() : "",
                        assetClass != null ? assetClass.trim() : "Equity",
                        resolvedInstrument,
                        isActive
                ));
            }

        } catch (BadRequestException bre) {
            throw bre;
        } catch (Exception e) {
            log.error("Failed to parse master funds Excel file", e);
            throw new BadRequestException("Could not parse master funds file: " + e.getMessage());
        }

        return list;
    }

    private String getCellValue(Row row, int cellIndex) {
        Cell cell = row.getCell(cellIndex);
        if (cell == null || cell.getCellType() == CellType.BLANK) {
            return null;
        }
        return dataFormatter.formatCellValue(cell).trim();
    }

    private boolean isRowEmpty(Row row) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = dataFormatter.formatCellValue(cell).trim();
                if (!val.isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }
}
