package com.wealthtech.crm.infrastructure.s3;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

/**
 * Service encapsulating AWS S3 and LocalStack storage operations:
 * - Direct object upload / download
 * - Pre-signed temporary URL generation for secure client downloads
 * - Automatic bucket provisioning in LocalStack
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class S3Service {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name:wealthtech-crm-bucket}")
    private String bucketName;

    @Value("${aws.s3.presigned-url-duration-minutes:60}")
    private int defaultDurationMinutes;

    private volatile boolean bucketInitialized = false;

    /**
     * Uploads raw binary content to S3 / LocalStack under the specified key.
     * Automatically ensures bucket exists before uploading.
     *
     * @param key S3 object key (e.g., "master-funds/12345_sample.xlsx")
     * @param content byte array of file contents
     * @param contentType MIME type of the file
     * @return object key stored in S3
     */
    public String uploadFile(String key, byte[] content, String contentType) {
        ensureBucketExists();

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType != null ? contentType : "application/octet-stream")
                .build();

        s3Client.putObject(putRequest, RequestBody.fromBytes(content));
        log.info("Successfully uploaded object to S3: s3://{}/{}", bucketName, key);
        return key;
    }

    /**
     * Generates a time-limited pre-signed GET URL allowing clients to download the file directly from S3/LocalStack.
     * Pre-signing is performed client-side using HMAC-SHA256 signature without invoking S3 API.
     *
     * @param key S3 object key
     * @return pre-signed GET URL string, or null if key is blank
     */
    public String generatePresignedGetUrl(String key) {
        return generatePresignedGetUrl(key, Duration.ofMinutes(defaultDurationMinutes));
    }

    /**
     * Generates a pre-signed GET URL with a custom expiration duration.
     *
     * @param key S3 object key
     * @param duration URL validity duration
     * @return pre-signed GET URL string
     */
    public String generatePresignedGetUrl(String key, Duration duration) {
        if (key == null || key.isBlank()) {
            return null;
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(duration != null ? duration : Duration.ofMinutes(defaultDurationMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
        String presignedUrl = presigned.url().toString();
        log.debug("Generated pre-signed GET URL for key '{}' (valid for {} min)", key, duration != null ? duration.toMinutes() : defaultDurationMinutes);
        return presignedUrl;
    }

    /**
     * Downloads an object directly from S3 as a byte array.
     */
    public byte[] downloadFile(String key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        return s3Client.getObjectAsBytes(getObjectRequest).asByteArray();
    }

    /**
     * Deletes an object from S3.
     */
    public void deleteFile(String key) {
        DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        s3Client.deleteObject(deleteRequest);
        log.info("Deleted object from S3: s3://{}/{}", bucketName, key);
    }

    /**
     * Automatically verifies or creates the target bucket in S3 / LocalStack.
     */
    public synchronized void ensureBucketExists() {
        if (bucketInitialized) {
            return;
        }

        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            bucketInitialized = true;
            log.info("S3 Bucket '{}' verified successfully", bucketName);
        } catch (NoSuchBucketException e) {
            log.info("S3 Bucket '{}' does not exist. Creating bucket in S3/LocalStack...", bucketName);
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
            bucketInitialized = true;
            log.info("S3 Bucket '{}' created successfully", bucketName);
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                log.info("S3 Bucket '{}' returned 404. Creating bucket in S3/LocalStack...", bucketName);
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
                bucketInitialized = true;
                log.info("S3 Bucket '{}' created successfully", bucketName);
            } else {
                log.warn("S3 headBucket check returned error (code {}): {}", e.statusCode(), e.getMessage());
            }
        } catch (Exception e) {
            log.warn("Unable to connect to S3/LocalStack (is LocalStack running at the configured endpoint?): {}", e.getMessage());
        }
    }
}
