package com.wealthtech.crm.modules.usermanager.entity;
import org.springframework.security.core.GrantedAuthority; 
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;
@Entity
@Table(name = "permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission implements GrantedAuthority {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The human-readable lable for UI display e.g. "View Client"
    @Column(name = "display_name", nullable = false)
    private String displayName;

    // The unique authority identifier, e.g. "client:read"
    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String resource;

    @ManyToMany(mappedBy = "permissions")
    @JsonIgnore
    private Set<Role> roles;

    // Contract from GrantedAuthority interface to directly treat this entity as an authority without manual conversions
    @Override
    public String getAuthority() {
        return this.name;
    }
}
