package com.wealthtech.crm.modules.agent.tool.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.agent.tool.AgentTool;
import com.wealthtech.crm.modules.agent.tool.AgentToolResult;
import com.wealthtech.crm.modules.customer.dto.ClientResponse;
import com.wealthtech.crm.modules.customer.service.ClientService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class ClientProfileTool implements AgentTool {

    private final ClientService clientService;

    @Override
    public String getName() {
        return "get_client_profile";
    }

    @Override
    public String getDescription() {
        return "Retrieves verified KYC, identity, contact information, and Relationship Manager details for a specific client.";
    }

    @Override
    public Map<String, Object> getParameterSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "client_id", Map.of(
                                "type", "integer",
                                "description", "The unique client ID"
                        )
                ),
                "required", List.of("client_id")
        );
    }

    @Override
    public AgentToolResult execute(Map<String, Object> parameters) {
        try {
            Object rawId = parameters.get("client_id");
            if (rawId == null) {
                return AgentToolResult.error("Parameter 'client_id' is required.");
            }
            Long clientId = Long.valueOf(rawId.toString());
            ClientResponse response = clientService.getClient(clientId);

            Map<String, Object> data = new HashMap<>();
            data.put("id", response.id());
            data.put("full_name", response.fullName());
            data.put("email", response.email());
            data.put("phone", response.phone());
            data.put("pan", response.pan());
            data.put("kyc_status", response.kycStatus());
            data.put("status", response.status());

            String summary = String.format("Client: %s (PAN: %s), KYC: %s, Status: %s",
                    response.fullName(), response.pan(), response.kycStatus(), response.status());

            return AgentToolResult.success(data, summary);
        } catch (Exception e) {
            log.error("Error executing ClientProfileTool: {}", e.getMessage(), e);
            return AgentToolResult.error("Failed to retrieve client profile: " + e.getMessage());
        }
    }
}
