package com.wealthtech.crm.modules.portfolioreview.service;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.wealthtech.crm.infrastructure.s3.S3Service;
import com.wealthtech.crm.modules.portfolioreview.dto.MasterFundRowDto;
import com.wealthtech.crm.modules.portfolioreview.dto.MasterFundUploadResponse;
import com.wealthtech.crm.modules.portfolioreview.entity.EligibleFund;
import com.wealthtech.crm.modules.portfolioreview.repository.EligibleFundRepository;
import com.wealthtech.crm.modules.usermanager.exception.BadRequestException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service managing master funds universe ingestion, AWS S3 archive synchronization,
 * and database upsert operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MasterFundService {

    private final EligibleFundRepository eligibleFundRepository;
    private final EligibleFundExcelService excelService;
    private final S3Service s3Service;

    /**
     * Uploads master funds spreadsheet to AWS S3, generates a pre-signed access URL,
     * and performs upsert (insert new / update existing by ISIN) on the eligible_funds table.
     */
    @Transactional
    public MasterFundUploadResponse uploadMasterFunds(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please select an Excel file to upload");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || (!originalFilename.endsWith(".xlsx") && !originalFilename.endsWith(".xls"))) {
            throw new BadRequestException("Only Excel files (.xlsx, .xls) are supported");
        }

        String safeFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String s3Key = "master-funds/" + System.currentTimeMillis() + "_" + safeFilename;
        String presignedUrl = null;

        try {
            // 1. Persist master funds file directly to S3 / LocalStack
            s3Service.uploadFile(s3Key, file.getBytes(), file.getContentType());
            presignedUrl = s3Service.generatePresignedGetUrl(s3Key);
        } catch (IOException e) {
            throw new BadRequestException("Failed to read uploaded file contents");
        } catch (Exception e) {
            log.warn("S3 upload failed or LocalStack unavailable: {}. Continuing with database ingestion.", e.getMessage());
        }

        // 2. Parse spreadsheet rows
        List<MasterFundRowDto> rows;
        try {
            rows = excelService.parseMasterFundsExcel(file.getInputStream());
        } catch (IOException e) {
            throw new BadRequestException("Failed to process spreadsheet stream: " + e.getMessage());
        }

        if (rows.isEmpty()) {
            throw new BadRequestException("No valid fund rows found in the uploaded file");
        }

        // 3. Upsert records into eligible_funds table
        int insertedCount = 0;
        int updatedCount = 0;

        for (MasterFundRowDto row : rows) {
            Optional<EligibleFund> existingOpt = eligibleFundRepository.findByIsin(row.isin());
            if (existingOpt.isPresent()) {
                EligibleFund existing = existingOpt.get();
                existing.setFundName(row.fundName());
                existing.setFundSubCategory(row.fundSubCategory());
                existing.setAssetClass(row.assetClass());
                existing.setInstrumentType(row.instrumentType());
                existing.setScoreCategory(row.scoreCategory());
                existing.setIsActive(row.isActive());
                eligibleFundRepository.save(existing);
                updatedCount++;
            } else {
                EligibleFund newFund = EligibleFund.builder()
                        .fundName(row.fundName())
                        .isin(row.isin())
                        .fundSubCategory(row.fundSubCategory())
                        .assetClass(row.assetClass())
                        .instrumentType(row.instrumentType())
                        .scoreCategory(row.scoreCategory())
                        .isActive(row.isActive())
                        .build();
                eligibleFundRepository.save(newFund);
                insertedCount++;
            }
        }

        log.info("Master funds upload complete: {} total parsed, {} inserted, {} updated (S3 Key: {})",
                rows.size(), insertedCount, updatedCount, s3Key);

        return new MasterFundUploadResponse(
                "SUCCESS",
                "Master funds processed successfully (" + insertedCount + " inserted, " + updatedCount + " updated)",
                originalFilename,
                s3Key,
                presignedUrl,
                rows.size(),
                insertedCount,
                updatedCount
        );
    }

    /**
     * Generates a template spreadsheet for downloading.
     */
    public byte[] getMasterFundsTemplate() {
        return excelService.generateMasterFundsTemplate();
    }
}
