package com.wealthtech.crm.modules.usermanager.service;

import com.wealthtech.crm.common.dto.DropdownOption;
import com.wealthtech.crm.modules.usermanager.entity.Group;
import com.wealthtech.crm.modules.usermanager.entity.Role;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UserDisplayService {
    private final UserRepository userRepository;

    public UserDisplayService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public DropdownOption<Long> toDropdownOption(User user) {
        if (user == null) {
            return null;
        }
        String displayName = user.getFirstName() + " " + user.getLastName();
        return new DropdownOption<>(displayName, user.getId());
    }

    public DropdownOption<Long> toDropdownOption(Group group) {
        if (group == null) {
            return null;
        }
        return new DropdownOption<>(group.getName(), group.getId());
    }

    public DropdownOption<Long> toDropdownOption(Role role) {
        if (role == null) {
            return null;
        }
        return new DropdownOption<>(role.getName(), role.getId());
    }

    public Map<Long, DropdownOption<Long>> buildDropdownMap(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<User> users = userRepository.findAllById(userIds);
        return users.stream()
                .collect(Collectors.toMap(User::getId, this::toDropdownOption));
    }

    public DropdownOption<Long> resolveUser(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .map(this::toDropdownOption)
                .orElse(new DropdownOption<>("Unknown", userId));
    }

    public DropdownOption<Long> resolve(Long userId) {
        return resolveUser(userId);
    }
}
