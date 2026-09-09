package com.wealthtech.crm.modules.portfolioreview.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.portfolioreview.entity.EligibleFund;
import com.wealthtech.crm.modules.portfolioreview.repository.EligibleFundRepository;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;

import lombok.*;

@Component 
@RequiredArgsConstructor 
public class EligibleFundSeeder implements CommandLineRunner {
    private final EligibleFundRepository efRepo;

    @Override
    public void run(String... args) {
        if(efRepo.count() > 0) {
            return;
        }


    }

    private void seedFund(String name, String isin, String subcategory, String assetClass, ScoreCategory category) {
        efRepo.save(EligibleFund.builder().
        fundName(name)
        .isin(isin)
        .fundSubCategory(subcategory)
        .assetClass(assetClass)
        .instrumentType("Mutual Fund")
        .scoreCategory(category)
        .isActive(true)
        .build()
    );
    }
}
