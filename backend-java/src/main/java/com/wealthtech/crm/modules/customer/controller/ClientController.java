package com.wealthtech.crm.modules.customer.controller;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.wealthtech.crm.modules.customer.dto.BulkReassignRmRequest;
import com.wealthtech.crm.modules.customer.dto.BulkUploadResponse;
import com.wealthtech.crm.modules.customer.dto.ClientProfileResponse;
import com.wealthtech.crm.modules.customer.dto.ClientResponse;
import com.wealthtech.crm.modules.customer.dto.CreateClientRequest;
import com.wealthtech.crm.modules.customer.dto.UpdateClientRmRequest;
import com.wealthtech.crm.modules.customer.dto.UpdateClientStatusRequest;
import com.wealthtech.crm.modules.customer.dto.VerifyKycRequest;
import com.wealthtech.crm.modules.customer.enums.ClientStatus;
import com.wealthtech.crm.modules.customer.service.ClientExcelService;
import com.wealthtech.crm.modules.customer.service.ClientService;
import com.wealthtech.crm.modules.usermanager.dto.CursorPaginatedResponse;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.infrastructure.s3.S3Service;
import com.wealthtech.crm.modules.usermanager.exception.BadRequestException;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/java-wtc-api/v1/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;
    private final ClientExcelService excelService;
    private final UserRepository userRepository;
    private final S3Service s3Service;

    // List clients with cursor pagination & search/status/RM filtering
    @GetMapping
    @PreAuthorize("hasAuthority('client:read')")
    public ResponseEntity<CursorPaginatedResponse<ClientResponse>> getClients(
            @RequestParam(required = false) ClientStatus status,
            @RequestParam(name = "rm_id", required = false) Long rmId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long cursor,
            @RequestParam(name = "page_size", defaultValue = "50") int pageSize
    ) {
        CursorPaginatedResponse<ClientResponse> response = clientService.getClientList(status, rmId, search, cursor, pageSize);
        return ResponseEntity.ok(response);
    }

    // Get single client by id
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('client:read')")
    public ResponseEntity<ClientResponse> getClient(@PathVariable Long id) {
        ClientResponse response = clientService.getClient(id);
        return ResponseEntity.ok(response);
    }

    // Create a new client
    @PostMapping
    @PreAuthorize("hasAuthority('client:create')")
    public ResponseEntity<ClientResponse> createClient(
            @Valid @RequestBody CreateClientRequest request,
            Authentication authentication
    ) {
        Long currentUserId = resolveCurrentUserId(authentication);
        ClientResponse response = clientService.createClient(request, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Update client operational status
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('client:update')")
    public ResponseEntity<ClientResponse> updateClientStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClientStatusRequest request
    ) {
        ClientResponse response = clientService.updateClientStatus(id, request);
        return ResponseEntity.ok(response);
    }

    // Update client relationship manager
    @PatchMapping("/{id}/rm")
    @PreAuthorize("hasAuthority('client:update')")
    public ResponseEntity<ClientResponse> updateClientRm(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClientRmRequest request
    ) {
        ClientResponse response = clientService.updateClientRm(id, request);
        return ResponseEntity.ok(response);
    }

    // Get client KYC & address profile
    @GetMapping("/{id}/profile")
    @PreAuthorize("hasAuthority('clientprofile:read')")
    public ResponseEntity<ClientProfileResponse> getClientProfile(@PathVariable Long id) {
        ClientProfileResponse response = clientService.getClientProfile(id);
        return ResponseEntity.ok(response);
    }

    // Verify KYC documents (approval or rejection)
    @PostMapping("/{id}/profile/verify")
    @PreAuthorize("hasAuthority('clientprofile:update')")
    public ResponseEntity<ClientProfileResponse> verifyKyc(
            @PathVariable Long id,
            @Valid @RequestBody VerifyKycRequest request
    ) {
        ClientProfileResponse response = clientService.verifyKyc(id, request);
        return ResponseEntity.ok(response);
    }

    // Bulk reassign relationship manager
    @PostMapping("/bulk-reassign")
    @PreAuthorize("hasAuthority('client:update')")
    public ResponseEntity<Map<String, Object>> bulkReassignRm(
            @Valid @RequestBody BulkReassignRmRequest request
    ) {
        int updatedCount = clientService.bulkReassignRm(request);
        return ResponseEntity.ok(Map.of(
                "message", "Successfully reassigned relationship manager",
                "count", updatedCount
        ));
    }

    // Download bulk upload Excel (.xlsx) template
    @GetMapping("/bulk-template")
    @PreAuthorize("hasAuthority('client:create')")
    public ResponseEntity<byte[]> downloadBulkTemplate() {
        byte[] excelBytes = excelService.generateClientBulkTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"clients_bulk_template.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    // Upload Excel (.xlsx) file for asynchronous batch client ingestion
    @PostMapping(value = "/bulk-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('client:create')")
    public ResponseEntity<BulkUploadResponse> uploadBulkClients(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please select an Excel file to upload");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            throw new BadRequestException("Only Excel files (.xlsx, .xls) are supported");
        }

        Long currentUserId = resolveCurrentUserId(authentication);
        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Failed to read uploaded file contents");
        }

        String safeFilename = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String s3Key = "client-uploads/" + System.currentTimeMillis() + "_" + safeFilename;
        String presignedUrl = null;

        try {
            s3Service.uploadFile(s3Key, fileBytes, file.getContentType());
            presignedUrl = s3Service.generatePresignedGetUrl(s3Key);
        } catch (Exception e) {
            log.warn("S3 upload for client bulk upload failed: {}. Proceeding with async database ingestion.", e.getMessage());
        }

        clientService.processBulkUploadAsync(fileBytes, currentUserId);

        BulkUploadResponse response = new BulkUploadResponse(
                "PROCESSING",
                "Bulk client upload is being processed in background",
                filename,
                s3Key,
                presignedUrl
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    private Long resolveCurrentUserId(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElse(null);
    }
}
