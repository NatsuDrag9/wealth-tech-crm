package com.wealthtech.crm.modules.customer.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.wealthtech.crm.modules.customer.enums.ClientStatus;
import com.wealthtech.crm.modules.customer.enums.Gender;
import com.wealthtech.crm.modules.usermanager.entity.User;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "clients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "phone")
    private String phone;

    @Column(name = "pan", length = 10)
    private String pan;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 20)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ClientStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "relationship_manager_id")
    private User relationshipManager;

    @Column(name = "sign_up_date")
    private LocalDate signUpDate;

    @OneToOne(mappedBy = "client", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private ClientProfile profile;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.signUpDate == null) {
            this.signUpDate = LocalDate.now();
        }
        if (this.status == null) {
            this.status = ClientStatus.ONBOARDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.profile != null) {
            this.profile.setClientStatus(this.status);
        }
    }

    public void setProfile(ClientProfile profile) {
        this.profile = profile;
        if (profile != null) {
            profile.setClient(this);
            profile.setClientStatus(this.status);
        }
    }

    public void setStatus(ClientStatus status) {
        this.status = status;
        if (this.profile != null) {
            this.profile.setClientStatus(status);
        }
    }
}
