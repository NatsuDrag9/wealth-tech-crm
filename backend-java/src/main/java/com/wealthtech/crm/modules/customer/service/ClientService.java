package com.wealthtech.crm.modules.customer.service;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.wealthtech.crm.common.dto.DropdownOption;
import com.wealthtech.crm.modules.customer.dto.*;
import com.wealthtech.crm.modules.customer.entity.*;
import com.wealthtech.crm.modules.customer.enums.ClientStatus;
import com.wealthtech.crm.modules.customer.enums.KycStatus;
import com.wealthtech.crm.modules.customer.repository.*;
import com.wealthtech.crm.modules.usermanager.dto.CursorPaginatedResponse;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.exception.ConflictException;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClientService {
    private final ClientRepository cRepo;
    private final ClientProfileRepository cpRepo;
    private final UserRepository userRepo;
    private final ClientExcelService excelService;

    // Mappers
    private ClientResponse mapToClientResponse(Client c) {
        DropdownOption<Long> rmDropdown = null;
        if(c.getRelationshipManager() != null) {
            String rmName = c.getRelationshipManager().getFirstName() + " " + c.getRelationshipManager().getLastName();
            rmDropdown = new DropdownOption<>(rmName, c.getRelationshipManager().getId());
        }

        String kycStatusStr = (c.getProfile() != null && c.getProfile().getKycStatus() != null)
                ? c.getProfile().getKycStatus().name() : KycStatus.PENDING.name();

        return new ClientResponse(c.getId(), c.getFirstName(),                                                                     
                    c.getLastName(),                                                                      
                    c.getFirstName() + " " + c.getLastName(),                                             
                    c.getEmail(),                                                                         
                    c.getPhone(),                                                                         
                    c.getPan(),                                                                           
                    c.getDateOfBirth(),                                                                   
                    c.getGender() != null ? c.getGender().name() : null,                                  
                    c.getStatus() != null ? c.getStatus().name() : null,                                  
                    kycStatusStr,                                                                     
                    rmDropdown,                                                                       
                    c.getSignUpDate(),                                                                    
                    c.getCreatedAt());
    }

    private ClientProfileResponse mapToProfileResponse(ClientProfile p) {
        return new ClientProfileResponse(                                                             
                    p.getId(),                                                                            
                    p.getClient() != null ? p.getClient().getId() : null,                                 
                    p.getKycStatus() != null ? p.getKycStatus().name() : null,                            
                    p.getClientStatus() != null ? p.getClientStatus().name() : null,                      
                    p.getAddressLine(),                                                                   
                    p.getCity(),                                                                          
                    p.getState(),                                                                         
                    p.getPincode(),                                                                       
                    p.getCountry(),                                                                       
                    p.getCreatedAt(),
                    p.getUpdatedAt()
            );
    }

    // Read operations
    public ClientResponse getClient(Long id) {
        Client client = cRepo.findByIdWithRelations(id)
                    .orElseThrow(() -> new NotFoundException("Client not found with id: " + id));
        return mapToClientResponse(client);
    }

    public ClientProfileResponse getClientProfile(Long clientId) {
        ClientProfile profile = cpRepo.findByClientId(clientId) .orElseThrow(() -> new NotFoundException("Client profile not found client id: " + clientId));
        return mapToProfileResponse(profile);
    }

    public CursorPaginatedResponse<ClientResponse> getClientList(
        ClientStatus status,
        Long rmId,
        String search,
        Long cursor,
        int pageSize
    ) {
        long effectiveCursor = (cursor != null) ? cursor : 0L;
        Pageable pageable = PageRequest.of(0, pageSize+1);

        List<Client> clients = cRepo.findWithFilters(status, rmId, search, effectiveCursor, pageable);
        
        boolean hasNext = clients.size() > pageSize;
        List<Client> pageResults = hasNext ? clients.subList(0, pageSize) : clients;

        String nextCursor = null;
        if(hasNext && !pageResults.isEmpty()) {
            nextCursor = String.valueOf(pageResults.get(pageResults.size() - 1).getId());
        }

        long totalSize = cRepo.countWithFilters(status, rmId, search);
        
        List<ClientResponse> responseList = pageResults.stream().map(this::mapToClientResponse).toList();

        return new CursorPaginatedResponse<>(responseList, nextCursor, null, null, null, totalSize);
    }

    // Create and  update operations
    @Transactional 
    public ClientResponse createClient(CreateClientRequest request, Long currentUserId) {
        if(cRepo.existsByEmail(request.email())) {
            throw new ConflictException("Client with email already exists: " + request.email());
        }

        if(request.phone() != null && !request.phone().isBlank() && cRepo.existsByPhone(request.phone())) {
            throw new ConflictException("Client with phone already exists: " + request.phone());
        }
        
        if(request.pan() != null && !request.pan().isBlank() && cRepo.existsByPan(request.pan())) {
            throw new ConflictException("Client with pan already exists: "+ request.pan());
        }

        // Resolve relationship manager
        User rm = null;
        if(request.relationshipManagerId() != null) {
            rm = userRepo.findById(request.relationshipManagerId())
                    .orElseThrow(() -> new NotFoundException("Relationship Manager not found: " + request.relationshipManagerId()));
        }
        else if(currentUserId != null) {
            // Automatically assign the logged in employee as the RM
            rm = userRepo.findById(currentUserId).orElse(null);
        }

        // Build client entity
        Client client = Client.builder()
                        .firstName(request.firstName())
                        .lastName(request.lastName())
                        .email(request.email())
                        .phone(request.phone())
                        .pan(request.pan())
                        .dateOfBirth(request.dateOfBirth())
                        .gender(request.gender())
                        .status(ClientStatus.ONBOARDING)
                        .relationshipManager(rm)
                        .signUpDate(LocalDate.now())
                        .createdBy(currentUserId)
                        .build();
        
        // Build lean ClientProfile
        ClientProfile profile = ClientProfile.builder()
                    .client(client)
                    .kycStatus(KycStatus.PENDING)
                    .clientStatus(ClientStatus.ONBOARDING)
                    .addressLine(request.addressLine())
                    .city(request.city())
                    .state(request.state())
                    .pincode(request.pincode())
                    .country(request.country() != null ? request.country() : "India")
                    .build();
        client.setProfile(profile);
        Client savedClient = cRepo.save(client);
        return mapToClientResponse(savedClient);
    }

    @Transactional
    public ClientResponse updateClientStatus(Long id, UpdateClientStatusRequest request) {
        Client client = cRepo.findByIdWithRelations(id)
                    .orElseThrow(() -> new NotFoundException("Client not found with id: " + id));
        
        client.setStatus(request.status());
        Client updatedClient = cRepo.save(client);
        return mapToClientResponse(updatedClient);
    }

    @Transactional
    public ClientResponse updateClientRm(Long id, UpdateClientRmRequest request) {
        Client client = cRepo.findByIdWithRelations(id)
                .orElseThrow(() -> new NotFoundException("Client not found with id: " + id));
        
        User rm = userRepo.findById(request.rmId())
                    .orElseThrow(() -> new NotFoundException("Relationship manager not found with id: " + request.rmId()));
        
        client.setRelationshipManager(rm);
        Client updatedClient = cRepo.save(client);
        return mapToClientResponse(updatedClient);
    }

    @Transactional                                                                                                                    
    public int bulkReassignRm(BulkReassignRmRequest request) {
            User newRm = userRepo.findById(request.newRmId())
                    .orElseThrow(() -> new NotFoundException("Relationship Manager not found with id: " + request.newRmId()));            
  
            return cRepo.bulkReassignRm(request.clientIds(), newRm);
        }
    
    @Transactional
    public ClientProfileResponse verifyKyc(Long clientId, VerifyKycRequest request) {
        Client client = cRepo.findByIdWithRelations(clientId).orElseThrow(() -> new NotFoundException("Client not found with id: " + clientId));

        ClientProfile profile = client.getProfile();
        if(profile == null) {
            throw new NotFoundException("Client profile not found for client id: " + clientId);
        }

        profile.setKycStatus(request.kycStatus());

        if(request.kycStatus() == KycStatus.VERIFIED) {
            client.setStatus(ClientStatus.ACTIVE);
            cRepo.save(client);
        }

        ClientProfile updatedProfile = cpRepo.save(profile);
        return mapToProfileResponse(updatedProfile);
    }

    @Async
    public void processBulkUploadAsync(byte[] fileBytes, Long currentUserId) {
        log.info("Starting async bulk client upload for userId: {}", currentUserId);
        try (ByteArrayInputStream bais = new ByteArrayInputStream(fileBytes)) {
            List<CreateClientRequest> requests = excelService.parseClientExcel(bais);
            log.info("Parsed {} client records from uploaded Excel file", requests.size());

            int savedCount = 0;
            int skippedCount = 0;

            for (CreateClientRequest req : requests) {
                // Skip duplicates
                if (cRepo.existsByEmail(req.email()) ||
                    (req.phone() != null && !req.phone().isBlank() && cRepo.existsByPhone(req.phone())) ||
                    (req.pan() != null && !req.pan().isBlank() && cRepo.existsByPan(req.pan()))) {
                    log.warn("Skipping duplicate client: email={}, pan={}", req.email(), req.pan());
                    skippedCount++;
                    continue;
                }

                createClient(req, currentUserId);
                savedCount++;
            }

            log.info("Async bulk client upload finished. Successfully saved: {}, Skipped duplicates: {}", savedCount, skippedCount);
        } catch (Exception e) {
            log.error("Failed to process bulk client upload asynchronously", e);
        }
    }
}
