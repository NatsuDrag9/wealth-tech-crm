package com.wealthtech.crm.modules.usermanager.entity;

import java.time.LocalDateTime;
import java.util.Set;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roles")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true)
    private String name;

    @Column(name = "description")
    private String description;

    // Many roles in one group
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @OneToMany(mappedBy = "role")
    private Set<User> users;

    @ManyToMany
    @JoinTable(
        name = "role_permissions",  
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // Initializes created at timestamp upon creation
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    
}
