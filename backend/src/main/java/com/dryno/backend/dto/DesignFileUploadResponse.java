package com.dryno.backend.dto;

import java.util.List;

public class DesignFileUploadResponse {
    private List<UploadedFile> files;

    public DesignFileUploadResponse() {
    }

    public DesignFileUploadResponse(List<UploadedFile> files) {
        this.files = files;
    }

    public List<UploadedFile> getFiles() {
        return files;
    }

    public void setFiles(List<UploadedFile> files) {
        this.files = files;
    }

    public static class UploadedFile {
        private String fileName;
        private String storagePath;
        private String publicUrl;
        private String contentType;
        private long size;

        public UploadedFile() {
        }

        public UploadedFile(String fileName, String storagePath, String publicUrl, String contentType, long size) {
            this.fileName = fileName;
            this.storagePath = storagePath;
            this.publicUrl = publicUrl;
            this.contentType = contentType;
            this.size = size;
        }

        public String getFileName() {
            return fileName;
        }

        public void setFileName(String fileName) {
            this.fileName = fileName;
        }

        public String getStoragePath() {
            return storagePath;
        }

        public void setStoragePath(String storagePath) {
            this.storagePath = storagePath;
        }

        public String getPublicUrl() {
            return publicUrl;
        }

        public void setPublicUrl(String publicUrl) {
            this.publicUrl = publicUrl;
        }

        public String getContentType() {
            return contentType;
        }

        public void setContentType(String contentType) {
            this.contentType = contentType;
        }

        public long getSize() {
            return size;
        }

        public void setSize(long size) {
            this.size = size;
        }
    }
}

