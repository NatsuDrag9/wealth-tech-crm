package com.wealthtech.crm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("WealthTech CRM API")
                        .version("1.0.0")
                        .description("Modernized REST API for WealthTech CRM — Relationship Manager Workspace, Client Management, KYC Compliance, Risk Profiling, and Portfolio Recommendations.")
                        .contact(new Contact()
                                .name("WealthTech Engineering")
                                .email("engineering@wealthtech.crm")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste your JWT Bearer token obtained from POST /java-wtc-api/v1/auth/login")));
    }
}
