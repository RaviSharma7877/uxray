package com.dryno.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String frontendOrigin = "http://localhost:3000";
    private Queues queues = new Queues();
    private OAuth oauth = new OAuth();

    public String getFrontendOrigin() {
        return frontendOrigin;
    }

    public void setFrontendOrigin(String frontendOrigin) {
        this.frontendOrigin = frontendOrigin;
    }

    public Queues getQueues() {
        return queues;
    }

    public void setQueues(Queues queues) {
        this.queues = queues;
    }

    public OAuth getOauth() {
        return oauth;
    }

    public void setOauth(OAuth oauth) {
        this.oauth = oauth;
    }

    public static class Queues {
        private String screenshot = "screenshot-jobs-queue";
        private String lighthouse = "lighthouse-audits-queue";
        private String designAnalysis = "design-analysis-queue";
        private String ga4 = "ga4-analytics-queue";
        private String clarity = "clarity-analytics-queue";

        public String getScreenshot() {
            return screenshot;
        }

        public void setScreenshot(String screenshot) {
            this.screenshot = screenshot;
        }

        public String getLighthouse() {
            return lighthouse;
        }

        public void setLighthouse(String lighthouse) {
            this.lighthouse = lighthouse;
        }

        public String getDesignAnalysis() {
            return designAnalysis;
        }

        public void setDesignAnalysis(String designAnalysis) {
            this.designAnalysis = designAnalysis;
        }

        public String getGa4() {
            return ga4;
        }

        public void setGa4(String ga4) {
            this.ga4 = ga4;
        }

        public String getClarity() {
            return clarity;
        }

        public void setClarity(String clarity) {
            this.clarity = clarity;
        }
    }

    public static class OAuth {
        private String successRedirect = "http://localhost:3000";

        public String getSuccessRedirect() {
            return successRedirect;
        }

        public void setSuccessRedirect(String successRedirect) {
            this.successRedirect = successRedirect;
        }
    }
}
