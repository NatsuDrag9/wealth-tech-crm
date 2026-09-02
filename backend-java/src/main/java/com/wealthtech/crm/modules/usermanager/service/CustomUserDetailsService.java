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
            // Add role
            authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().getName()));

            // Add permissions
            if(user.getRole().getPermissions() != null) {
                user.getRole().getPermissions().forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission.getCodename())));
            }
        }

        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPassword(),
            authorities
        );
        
    }
}
