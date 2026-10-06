package com.wealthtech.crm.modules.portfolioreview.service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.wealthtech.crm.modules.portfolioreview.dto.MasterFundRowDto;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;
import com.wealthtech.crm.modules.usermanager.exception.BadRequestException;

class EligibleFundExcelServiceTest {

    private EligibleFundExcelService excelService;

    @BeforeEach
    void setUp() {
        excelService = new EligibleFundExcelService();
    }

    @Test
    @DisplayName("Should generate master funds Excel template with headers and sample rows")
    void testGenerateMasterFundsTemplate() {
        byte[] templateBytes = excelService.generateMasterFundsTemplate();

        assertThat(templateBytes).isNotNull();
        assertThat(templateBytes.length).isGreaterThan(100);

        // Parsing generated template should extract sample funds
        List<MasterFundRowDto> parsedRows = excelService.parseMasterFundsExcel(new ByteArrayInputStream(templateBytes));

        assertThat(parsedRows).isNotEmpty();
        assertThat(parsedRows).hasSize(5);

        MasterFundRowDto hdfc = parsedRows.stream()
                .filter(r -> "INF179K01BE2".equals(r.isin()))
                .findFirst()
                .orElse(null);

        assertThat(hdfc).isNotNull();
        assertThat(hdfc.fundName()).contains("HDFC Top 100");
        assertThat(hdfc.scoreCategory()).isEqualTo(ScoreCategory.MODERATE);
        assertThat(hdfc.isActive()).isTrue();
    }

    @Test
    @DisplayName("Should throw BadRequestException when parsing corrupt or non-Excel stream")
    void testParseCorruptStreamThrowsBadRequest() {
        InputStream corruptStream = new ByteArrayInputStream("Not a real Excel file".getBytes());

        assertThatThrownBy(() -> excelService.parseMasterFundsExcel(corruptStream))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Could not parse master funds file");
    }
}
