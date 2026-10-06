package com.wealthtech.crm.modules.customer.service;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.modules.customer.dto.ClientProfileResponse;
import com.wealthtech.crm.modules.customer.dto.ClientResponse;
import com.wealthtech.crm.modules.customer.dto.CreateClientRequest;
import com.wealthtech.crm.modules.customer.dto.VerifyKycRequest;
import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.entity.ClientProfile;
import com.wealthtech.crm.modules.customer.enums.ClientStatus;
import com.wealthtech.crm.modules.customer.enums.Gender;
import com.wealthtech.crm.modules.customer.enums.KycStatus;
import com.wealthtech.crm.modules.customer.repository.ClientProfileRepository;
import com.wealthtech.crm.modules.customer.repository.ClientRepository;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.exception.ConflictException;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class ClientServiceTest {

    @Mock
    private ClientRepository clientRepository;
    @Mock
    private ClientProfileRepository clientProfileRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ClientExcelService clientExcelService;

    private ClientService clientService;

    @BeforeEach
    void setUp() {
        clientService = new ClientService(
                clientRepository,
                clientProfileRepository,
                userRepository,
                clientExcelService
        );
    }

    @Test
    @DisplayName("Should throw ConflictException when creating client with duplicate email")
    void testDuplicateEmailThrowsConflict() {
        CreateClientRequest request = new CreateClientRequest(
                "Suresh", "Raina", "suresh@example.com", "9811122233", "ABCDE1234F",
                LocalDate.of(1986, 11, 27), Gender.MALE, null, "Delhi", "Delhi", "DL", "110001", "India"
        );

        when(clientRepository.existsByEmail("suresh@example.com")).thenReturn(true);

        assertThatThrownBy(() -> clientService.createClient(request, 1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Client with email already exists");
    }

    @Test
    @DisplayName("Should throw ConflictException when creating client with duplicate PAN")
    void testDuplicatePanThrowsConflict() {
        CreateClientRequest request = new CreateClientRequest(
                "Suresh", "Raina", "suresh@example.com", "9811122233", "ABCDE1234F",
                LocalDate.of(1986, 11, 27), Gender.MALE, null, "Delhi", "Delhi", "DL", "110001", "India"
        );

        when(clientRepository.existsByEmail("suresh@example.com")).thenReturn(false);
        when(clientRepository.existsByPhone("9811122233")).thenReturn(false);
        when(clientRepository.existsByPan("ABCDE1234F")).thenReturn(true);

        assertThatThrownBy(() -> clientService.createClient(request, 1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Client with pan already exists");
    }

    @Test
    @DisplayName("Should create client with automatic RM fallback to logged-in user when RM is null")
    void testCreateClientWithRmFallback() {
        CreateClientRequest request = new CreateClientRequest(
                "Rohit", "Sharma", "rohit@example.com", "9876543210", "XYZPA1234K",
                LocalDate.of(1987, 4, 30), Gender.MALE, null, "Mumbai", "Mumbai", "MH", "400050", "India"
        );

        when(clientRepository.existsByEmail(request.email())).thenReturn(false);
        when(clientRepository.existsByPhone(request.phone())).thenReturn(false);
        when(clientRepository.existsByPan(request.pan())).thenReturn(false);

        User currentUser = User.builder().id(2L).firstName("RM").lastName("User").build();
        when(userRepository.findById(2L)).thenReturn(Optional.of(currentUser));

        Client savedClient = Client.builder()
                .id(10L)
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .phone(request.phone())
                .pan(request.pan())
                .status(ClientStatus.ONBOARDING)
                .relationshipManager(currentUser)
                .build();
        when(clientRepository.save(any(Client.class))).thenReturn(savedClient);

        ClientResponse response = clientService.createClient(request, 2L);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.email()).isEqualTo("rohit@example.com");
        assertThat(response.relationshipManager()).isNotNull();
        assertThat(response.relationshipManager().value()).isEqualTo(2L);
    }

    @Test
    @DisplayName("Should promote client status from ONBOARDING to ACTIVE when KYC is verified")
    void testVerifyKycPromotesClientToActive() {
        Client client = Client.builder().id(10L).status(ClientStatus.ONBOARDING).build();
        ClientProfile profile = ClientProfile.builder().id(100L).client(client).kycStatus(KycStatus.PENDING).build();
        client.setProfile(profile);

        when(clientRepository.findByIdWithRelations(10L)).thenReturn(Optional.of(client));
        when(clientProfileRepository.save(any(ClientProfile.class))).thenReturn(profile);

        VerifyKycRequest verifyRequest = new VerifyKycRequest(KycStatus.VERIFIED);
        ClientProfileResponse response = clientService.verifyKyc(10L, verifyRequest);

        assertThat(response).isNotNull();
        assertThat(profile.getKycStatus()).isEqualTo(KycStatus.VERIFIED);
        assertThat(client.getStatus()).isEqualTo(ClientStatus.ACTIVE);
        verify(clientRepository).save(client);
        verify(clientProfileRepository).save(profile);
    }
}
