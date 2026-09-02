package com.wealthtech.crm.modules.usermanager.entity;

import java.util.Set;

import jakarta.persistence.*;
import lombok.*;
@Entity
@Table(name = "permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String codename;
    

    @Column(name = "permission_name", nullable = false)
    private String name;

    @Column(name = "content_type")
    private String contentType;

    @ManyToMany(mappedBy = "permissions")
    private Set<Role> roles;
}
