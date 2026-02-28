const axios = require('axios');
const https = require('https');

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
    timeout: 30000,
});

async function testClarityAPI() {
    const apiKey = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4M0FCMDhFNUYwRDMxNjdEOTRFMTQ3M0FEQTk2RTcyRDkwRUYwRkYiLCJ0eXAiOiJKV1QifQ.eyJqdGkiOiI0YzU0ZjU3Yy0yZDRkLTRmMTMtOTlhNy0xY2M4MmQ4ZWRiMWIiLCJzdWIiOiIzMTI0NDg3NjI0OTI0NDMyIiwic2NvcGUiOiJEYXRhLkV4cG9ydCIsIm5iZiI6MTc2Njg5MjYwNSwiZXhwIjo0OTIwNDkyNjA1LCJpYXQiOjE3NjY4OTI2MDUsImlzcyI6ImNsYXJpdHkiLCJhdWQiOiJjbGFyaXR5LmRhdGEtZXhwb3J0ZXIifQ.PtKIyDhc6yxw7wP5iaud1otp3k6J6FB2GcYjE0oS9wD2qzrZfHPFIP9cfqWPepEvf_qT6AILFzkoNeuhuemrLrZq8ECwQ_79DQBEXVSrAu-IzdZF89Zna1jxmn5O5vYHix8u0Y5oTlXxyU2q6M87efnuJnR16Npx_Zpe9U0nkf9XfclAR9Sfy1XutHoRXazixibIb4osC0UeN7yh3J4VGhun0aw4MwpsFvIRMwHKe97NgEyhiLqEvSGxoLQHncbeOxrT3cerxo3Qjhl-HNjmXIsFieDo2NhSrHhp1TLCgbF_W9AG_HmR3i_1UYcEOw7KLcq3LBd36yfWie5jWpcgPA';
    const baseUrl = 'https://www.clarity.ms/export-data/api/v1';
    const apiUrl = `${baseUrl}/project-live-insights`;
    
    const params = new URLSearchParams({
        numOfDays: '3',
    });
    
    params.append('dimension1', 'URL');
    params.append('dimension2', 'Device');
    params.append('dimension3', 'Country');
    
    const fullUrl = `${apiUrl}?${params.toString()}`;
    
    console.log(`Fetching from: ${fullUrl}`);
    
    try {
        const response = await axiosInstance.get(fullUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
        });
        
        const data = response.data;
        
        console.log('\n=== Response Type ===');
        console.log('Is Array:', Array.isArray(data));
        console.log('Type:', typeof data);
        
        if (Array.isArray(data)) {
            console.log('\n=== Array Length ===');
            console.log('Length:', data.length);
            
            console.log('\n=== First Item ===');
            console.log(JSON.stringify(data[0], null, 2));
            
            console.log('\n=== Second Item ===');
            console.log(JSON.stringify(data[1], null, 2));
            
            console.log('\n=== All Keys in First Item ===');
            console.log(Object.keys(data[0]));
        } else {
            console.log('\n=== Full Response ===');
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testClarityAPI();
