package com.wealthtech.crm.modules.portfolioreview.service;

import java.awt.Color;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.wealthtech.crm.modules.portfolioreview.entity.PortfolioRecommendation;
import com.wealthtech.crm.modules.portfolioreview.entity.RecommendationFundItem;

@Service
public class PortfolioPdfGeneratorService {

    private static final String UPLOAD_DIR = "uploads/recommendations";

    public String generateRecommendationPdf(PortfolioRecommendation recommendation) {
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String filename = "recommendation_" + recommendation.getId() + ".pdf";
            Path filePath = uploadPath.resolve(filename);

            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            try (OutputStream out = Files.newOutputStream(filePath)) {
                PdfWriter.getInstance(document, out);
                document.open();

                // 1. Fonts & Colors
                Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(24, 43, 73));
                Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
                Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
                Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
                Font boldCellFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.BLACK);
                Font disclaimerFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Color.GRAY);

                // 2. Title & Header Banner
                Paragraph title = new Paragraph("INVESTMENT RECOMMENDATION PROPOSAL", titleFont);
                title.setAlignment(Element.ALIGN_CENTER);
                document.add(title);

                Paragraph subtitle = new Paragraph("WealthTech CRM — Client Advisory Services", subTitleFont);
                subtitle.setAlignment(Element.ALIGN_CENTER);
                subtitle.setSpacingAfter(15);
                document.add(subtitle);

                // 3. Metadata Info Box
                PdfPTable infoTable = new PdfPTable(2);
                infoTable.setWidthPercentage(100);
                infoTable.setSpacingAfter(15);

                infoTable.addCell(createMetaCell("Client ID: " + recommendation.getClientId(), cellFont));
                infoTable.addCell(createMetaCell("Recommendation ID: #" + recommendation.getId(), cellFont));
                infoTable.addCell(createMetaCell("Flow Type: " + (recommendation.getFlowType() != null ? recommendation.getFlowType().getDisplayName() : "N/A"), cellFont));
                infoTable.addCell(createMetaCell("Risk Category: " + (recommendation.getInvestorCategory() != null ? recommendation.getInvestorCategory().getDisplayName() : "N/A"), cellFont));
                if (recommendation.getCreatedAt() != null) {
                    infoTable.addCell(createMetaCell("Generated On: " + recommendation.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm")), cellFont));
                }
                infoTable.addCell(createMetaCell("Status: FINAL PROPOSAL", boldCellFont));
                document.add(infoTable);

                // 4. Recommendation Funds Table
                Paragraph tableHeader = new Paragraph("Proposed Fund Allocations", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.DARK_GRAY));
                tableHeader.setSpacingAfter(8);
                document.add(tableHeader);

                PdfPTable table = new PdfPTable(new float[]{1f, 4f, 2.5f, 2.5f, 2.5f, 2.5f});
                table.setWidthPercentage(100);
                table.setSpacingAfter(15);

                Color headerBg = new Color(30, 58, 138); // Navy blue
                table.addCell(createHeaderCell("#", headerFont, headerBg));
                table.addCell(createHeaderCell("Fund Name", headerFont, headerBg));
                table.addCell(createHeaderCell("ISIN", headerFont, headerBg));
                table.addCell(createHeaderCell("Asset Class", headerFont, headerBg));
                table.addCell(createHeaderCell("Amount (INR)", headerFont, headerBg));
                table.addCell(createHeaderCell("Replaces", headerFont, headerBg));

                BigDecimal totalAllocated = BigDecimal.ZERO;
                NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));

                int index = 1;
                for (RecommendationFundItem item : recommendation.getFunds()) {
                    table.addCell(createBodyCell(String.valueOf(item.getDisplayOrder() != null ? item.getDisplayOrder() : index++), cellFont));
                    table.addCell(createBodyCell(item.getEligibleFund().getFundName(), cellFont));
                    table.addCell(createBodyCell(item.getEligibleFund().getIsin(), cellFont));
                    table.addCell(createBodyCell(item.getEligibleFund().getAssetClass() + " (" + item.getEligibleFund().getFundSubCategory() + ")", cellFont));
                    
                    String formattedAmount = currencyFormat.format(item.getAmount()).replace("₹", "INR ");
                    table.addCell(createBodyCell(formattedAmount, boldCellFont));

                    String replaces = (item.getReplacesEntry() != null) 
                            ? item.getReplacesEntry().getFundName() 
                            : "New Allocation";
                    table.addCell(createBodyCell(replaces, cellFont));

                    totalAllocated = totalAllocated.add(item.getAmount());
                }

                // Total Row
                PdfPCell totalLabel = new PdfPCell(new Phrase("Total Allocation", boldCellFont));
                totalLabel.setColspan(4);
                totalLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
                totalLabel.setPadding(6);
                totalLabel.setBackgroundColor(new Color(243, 244, 246));
                table.addCell(totalLabel);

                PdfPCell totalVal = new PdfPCell(new Phrase(currencyFormat.format(totalAllocated).replace("₹", "INR "), boldCellFont));
                totalVal.setColspan(2);
                totalVal.setPadding(6);
                totalVal.setBackgroundColor(new Color(243, 244, 246));
                table.addCell(totalVal);

                document.add(table);

                // 5. Statutory Disclaimer
                Paragraph disclaimer = new Paragraph(
                        "Disclaimer: This investment proposal is prepared based on the client's verified Risk Appetite profile in compliance with regulatory suitability standards. Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing.",
                        disclaimerFont);
                disclaimer.setSpacingBefore(20);
                document.add(disclaimer);

                document.close();
            }

            return "/api/v1/documents/recommendations/" + filename;

        } catch (Exception e) {
            throw new RuntimeException("Error rendering recommendation PDF", e);
        }
    }

    private PdfPCell createHeaderCell(String text, Font font, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setPadding(6);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        return cell;
    }

    private PdfPCell createBodyCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setPadding(5);
        return cell;
    }

    private PdfPCell createMetaCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(3);
        return cell;
    }
}
