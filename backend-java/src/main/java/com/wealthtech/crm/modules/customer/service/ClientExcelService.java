package com.wealthtech.crm.modules.customer.service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import com.wealthtech.crm.modules.customer.dto.CreateClientRequest;
import com.wealthtech.crm.modules.customer.enums.Gender;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ClientExcelService {

    private static final String[] HEADERS = {
        "First Name", "Last Name", "Email", "Phone", "PAN",
        "Date of Birth (YYYY-MM-DD)", "Gender (MALE/FEMALE/OTHER)",
        "Address Line", "City", "State", "Pincode", "Country"
    };

    private final DataFormatter dataFormatter = new DataFormatter();

    /**
     * Generates a styled Excel (.xlsx) template with headers and 1 sample row.
     */
    public byte[] generateClientBulkTemplate() {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Clients Template");

            // Header Style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Create Header Row
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            // Create Sample Row
            Row sampleRow = sheet.createRow(1);
            sampleRow.createCell(0).setCellValue("Aarav");
            sampleRow.createCell(1).setCellValue("Sharma");
            sampleRow.createCell(2).setCellValue("aarav.sharma@example.com");
            sampleRow.createCell(3).setCellValue("9876543210");
            sampleRow.createCell(4).setCellValue("ABCDE1234F");
            sampleRow.createCell(5).setCellValue("1992-05-15");
            sampleRow.createCell(6).setCellValue("MALE");
            sampleRow.createCell(7).setCellValue("Flat 402, Highline Towers");
            sampleRow.createCell(8).setCellValue("Bengaluru");
            sampleRow.createCell(9).setCellValue("Karnataka");
            sampleRow.createCell(10).setCellValue("560001");
            sampleRow.createCell(11).setCellValue("India");

            // Auto-size columns
            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate bulk client upload template", e);
            throw new RuntimeException("Could not generate Excel template", e);
        }
    }

    /**
     * Parses uploaded .xlsx rows into List<CreateClientRequest>.
     */
    public List<CreateClientRequest> parseClientExcel(InputStream inputStream) {
        List<CreateClientRequest> clients = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                String firstName = getCellValueAsString(row.getCell(0));
                String lastName = getCellValueAsString(row.getCell(1));
                String email = getCellValueAsString(row.getCell(2));
                String phone = getCellValueAsString(row.getCell(3));
                String pan = getCellValueAsString(row.getCell(4));
                LocalDate dob = parseDate(row.getCell(5));
                Gender gender = parseGender(getCellValueAsString(row.getCell(6)));
                String addressLine = getCellValueAsString(row.getCell(7));
                String city = getCellValueAsString(row.getCell(8));
                String state = getCellValueAsString(row.getCell(9));
                String pincode = getCellValueAsString(row.getCell(10));
                String country = getCellValueAsString(row.getCell(11));

                if (firstName == null || email == null) {
                    continue; // Skip invalid rows
                }

                CreateClientRequest clientRequest = new CreateClientRequest(
                        firstName,
                        lastName != null ? lastName : "",
                        email,
                        phone,
                        pan,
                        dob != null ? dob : LocalDate.of(1990, 1, 1),
                        gender,
                        null, // RM will be assigned as the current user
                        addressLine,
                        city,
                        state,
                        pincode,
                        (country != null && !country.isBlank()) ? country : "India"
                );
                clients.add(clientRequest);
            }
        } catch (Exception e) {
            log.error("Failed to parse client Excel file", e);
            throw new RuntimeException("Failed to parse uploaded Excel file", e);
        }

        return clients;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return null;
        }
        String formatted = dataFormatter.formatCellValue(cell);
        return (formatted != null && !formatted.isBlank()) ? formatted.trim() : null;
    }

    private LocalDate parseDate(Cell cell) {
        if (cell == null) {
            return null;
        }
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            Date date = cell.getDateCellValue();
            if (date != null) {
                return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            }
        }
        String str = getCellValueAsString(cell);
        if (str == null || str.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(str, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e) {
            return null;
        }
    }

    private Gender parseGender(String genderStr) {
        if (genderStr == null || genderStr.isBlank()) {
            return null;
        }
        try {
            return Gender.valueOf(genderStr.trim().toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }
        short firstCell = row.getFirstCellNum();
        short lastCell = row.getLastCellNum();
        if (firstCell < 0 || lastCell < 0) {
            return true;
        }
        for (int c = firstCell; c < lastCell; c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = getCellValueAsString(cell);
                if (val != null && !val.isBlank()) {
                    return false;
                }
            }
        }
        return true;
    }
}
