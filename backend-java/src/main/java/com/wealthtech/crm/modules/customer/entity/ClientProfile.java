package com.wealthtech.crm.modules.customer.entity;

import java.time.LocalDateTime;

import com.wealthtech.crm.modules.customer.enums.ClientStatus;
import com.wealthtech.crm.modules.customer.enums.KycStatus;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "client_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false, unique = true)
    private Client client;

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status", nullable = false, length = 30)
    private KycStatus kycStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "client_status", nullable = false, length = 30)
    private ClientStatus clientStatus;

    @Column(name = "address_line")
    private String addressLine;

    @Column(name = "city")
    private String city;

    @Column(name = "state")
    private String state;

    @Column(name = "pincode", length = 10)
    private String pincode;

    @Column(name = "country", length = 50)
    private String country;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.client != null && this.client.getStatus() != null) {
            this.clientStatus = this.client.getStatus();
        } else if (this.clientStatus == null) {
            this.clientStatus = ClientStatus.ONBOARDING;
        }

        if (this.kycStatus == null) {
            this.kycStatus = KycStatus.PENDING;
        }
        if (this.country == null) {
            this.country = "India";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.client != null && this.client.getStatus() != null) {
            this.clientStatus = this.client.getStatus();
        }
    }
}
