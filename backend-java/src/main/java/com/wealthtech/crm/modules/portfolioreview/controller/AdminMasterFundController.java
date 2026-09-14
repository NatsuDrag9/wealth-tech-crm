package com.wealthtech.crm.modules.portfolioreview.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.wealthtech.crm.modules.portfolioreview.dto.MasterFundUploadResponse;
import com.wealthtech.crm.modules.portfolioreview.service.MasterFundService;

import lombok.RequiredArgsConstructor;

/**
 * Controller providing administrative management endpoints for Master Funds,
 * including AWS S3 spreadsheet ingestion and template download.
 */
@RestController
@RequestMapping("/java-wtc-api/v1")
@RequiredArgsConstructor
public class AdminMasterFundController {

    private final MasterFundService masterFundService;

    /**
     * Admin endpoint to upload and ingest a new set of master eligible funds.
     * Uploads file to AWS S3 / LocalStack and returns a pre-signed download URL.
     */
    @PostMapping(
            value = {"/admin/master-funds/upload", "/eligible-funds/upload"},
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('masterfund:create')")
    public ResponseEntity<MasterFundUploadResponse> uploadMasterFunds(@RequestParam("file") MultipartFile file) {
        MasterFundUploadResponse response = masterFundService.uploadMasterFunds(file);
        return ResponseEntity.ok(response);
    }

    /**
     * Admin endpoint to download the styled master funds spreadsheet (.xlsx) template.
     */
    @GetMapping(value = {"/admin/master-funds/template", "/eligible-funds/template"})
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('masterfund:read')")
    public ResponseEntity<byte[]> downloadMasterFundsTemplate() {
        byte[] templateBytes = masterFundService.getMasterFundsTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"master_funds_template.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(templateBytes);
    }
}
