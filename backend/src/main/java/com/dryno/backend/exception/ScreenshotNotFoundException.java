package com.dryno.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ScreenshotNotFoundException extends RuntimeException {

    public ScreenshotNotFoundException(String screenshotId) {
        super("Screenshot not found: " + screenshotId);
    }
}
