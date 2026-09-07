package com.wealthtech.crm.modules.usermanager.service;

import java.util.HashSet;
import java.util.Set;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new UsernameNotFoundException("User not found with email" + email));

        Set<GrantedAuthority> authorities = new HashSet<>();
        
        if(user.getRole() != null) {
            // Add role (with standard Spring "ROLE_" prefix)
            authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().getName()));

            // Add permissions directly as GrantedAuthority instances
            if(user.getRole().getPermissions() != null) {
                authorities.addAll(user.getRole().getPermissions());
            }
        }

       
        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPassword(),
            authorities
        );
        
    }
}
