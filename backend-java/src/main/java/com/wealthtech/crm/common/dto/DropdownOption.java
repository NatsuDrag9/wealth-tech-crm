package com.wealthtech.crm.common.dto;

public record DropdownOption<T>(
        String displayName,
        T value
) {
}
