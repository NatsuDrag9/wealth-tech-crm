package com.wealthtech.crm.modules.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.wealthtech.crm.modules.customer.enums.ClientStatus;

public record UpdateClientHeroRequest(
        @JsonProperty("status")
        ClientStatus status,

        @JsonProperty("relationship_manager_id")
        Long relationshipManagerId
) {
}
