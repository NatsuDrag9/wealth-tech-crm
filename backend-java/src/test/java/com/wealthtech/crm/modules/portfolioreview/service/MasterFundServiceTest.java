package com.wealthtech.crm.modules.portfolioreview.service;

import java.io.InputStream;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import com.wealthtech.crm.infrastructure.s3.S3Service;
import com.wealthtech.crm.modules.portfolioreview.dto.MasterFundRowDto;
import com.wealthtech.crm.modules.portfolioreview.dto.MasterFundUploadResponse;
import com.wealthtech.crm.modules.portfolioreview.entity.EligibleFund;
import com.wealthtech.crm.modules.portfolioreview.repository.EligibleFundRepository;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;
import com.wealthtech.crm.modules.usermanager.exception.BadRequestException;

@ExtendWith(MockitoExtension.class)
class MasterFundServiceTest {

    @Mock
    private EligibleFundRepository eligibleFundRepository;
    @Mock
    private EligibleFundExcelService excelService;
    @Mock
    private S3Service s3Service;

    @InjectMocks
    private MasterFundService masterFundService;

    @Test
    @DisplayName("Should successfully upload Excel file, archive to S3, and upsert eligible funds")
    void testUploadMasterFundsSuccess() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "master_funds.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "excel content".getBytes()
        );

        MasterFundRowDto newRow = new MasterFundRowDto(
                "PPFAS Flexi Cap",
                "INF879O01019",
                ScoreCategory.AGGRESSIVE,
                "Flexi Cap",
                "Equity",
                "Mutual Fund",
                true
        );

        MasterFundRowDto existingRow = new MasterFundRowDto(
                "HDFC Top 100",
                "INF179K01BE2",
                ScoreCategory.MODERATE,
                "Large Cap",
                "Equity",
                "Mutual Fund",
                true
        );

        when(excelService.parseMasterFundsExcel(any(InputStream.class))).thenReturn(List.of(newRow, existingRow));
        when(s3Service.generatePresignedGetUrl(anyString())).thenReturn("https://s3.amazonaws.com/test-url");

        Eligork existingFund = new Eligork();
        EligibleFund existingEntity = EligibleFund.builder()
                .id(1L)
                .isin("INF179K01BE2")
                .fundName("Old HDFC Top 100")
                .scoreCategory(ScoreCategory.MODERATE)
                .isActive(true)
                .build();

        when(eligibleFundRepository.findByIsin("INF879O01019")).thenReturn(Optional.empty());
        when(eligibleFundRepository.findByIsin("INF179K01BE2")).thenReturn(Optional.of(existingEntity));

        MasterFundUploadResponse response = masterFundService.uploadMasterFunds(file);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.totalRecords()).isEqualTo(2);
        assertThat(response.insertedRecords()).isEqualTo(1);
        assertThat(response.updatedRecords()).isEqualTo(1);
        assertThat(response.fileUrl()).isEqualTo("https://s3.amazonaws.com/test-url");

        verify(s3Service).uploadFile(anyString(), any(byte[].class), anyString());
        verify(eligibleFundRepository, org.mockito.Mockito.times(2)).save(any(EligibleFund.class));
    }

    @Test
    @DisplayName("Should reject empty file with BadRequestException")
    void testUploadEmptyFileThrowsBadRequest() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.xlsx", "text/plain", new byte[0]);

        assertThatThrownBy(() -> masterFundService.uploadMasterFunds(emptyFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Please select an Excel file to upload");
    }

    @Test
    @DisplayName("Should reject unsupported file extension with BadRequestException")
    void testUploadUnsupportedExtensionThrowsBadRequest() {
        MockMultipartFile csvFile = new MockMultipartFile("file", "test.csv", "text/csv", "col1,col2".getBytes());

        assertThatThrownBy(() -> masterFundService.uploadMasterFunds(csvFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Only Excel files (.xlsx, .xls) are supported");
    }
}
class Eligork {}
