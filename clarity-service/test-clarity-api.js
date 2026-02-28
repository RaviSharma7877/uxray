const axios = require('axios');
const https = require('https');

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
    timeout: 30000,
});

async function testClarityAPI() {
    const apiKey = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4M0FCMDhFNUYwRDMxNjdEOTRFMTQ3M0FEQTk2RTcyRDkwRUYwRkYiLCJ0eXAiOiJKV1QifQ.eyJqdGkiOiIwMTIxMGZjNC00MTJiLTRjZmMtODJkYy0xNWM3NDg5YWMxNDQiLCJzdWIiOiIzMTI0NDg3NjI0OTI0NDMyIiwic2NvcGUiOiJEYXRhLkV4cG9ydCIsIm5iZiI6MTc2Njk4MzkzMCwiZXhwIjo0OTIwNTgzOTMwLCJpYXQiOjE3NjY5ODM5MzAsImlzcyI6ImNsYXJpdHkiLCJhdWQiOiJjbGFyaXR5LmRhdGEtZXhwb3J0ZXIifQ.BVumdBeL-wM-O5fkaVt0IWc_r6OBsW-tB8NTkFg92V-Nq1UcODP34wWMviTyuIfGSyLfRw1CFegest38bL8ewQUnFAuSBtR9cFBJ7xcAB5kR-juzOW4QQ4losxmUfZb_7tkbHK7Ehc3MnCNMAXlmwZScNuEZmKlCG-J_sIgdPqKdaBjUP01b_vjtUjwVTtBgO2zr5RcH6E7uOCWebuAuugS9Xz5rmgxduzpDsw7rLtaAhqxR9dt59mNJ_P0UQ8aJUDj2Z4AqmJZCw5WIuwbB_VaS2yLF1OaYBAT6PWTSzpr6BS6HDJGgSXo3SxK_QkxxPVo7Svecn0n8IIBYCvbKVg';
    const projectId = 'urjdss007k';
    const baseUrl = 'https://www.clarity.ms/export-data/api/v1';
    const apiUrl = `${baseUrl}/project-live-insights`;
    
    const params = new URLSearchParams({
        numOfDays: '3',
    });
    
    params.append('dimension1', 'URL');
    params.append('dimension2', 'Device');
    params.append('dimension3', 'Country');
    
    const fullUrl = `${apiUrl}?${params.toString()}`;
    
    console.log('='.repeat(80));
    console.log('TESTING CLARITY API CONNECTION');
    console.log('='.repeat(80));
    console.log(`Project ID: ${projectId}`);
    console.log(`API URL: ${fullUrl}`);
    console.log('');
    
    try {
        const response = await axiosInstance.get(fullUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
        });
        
        const data = response.data;
        
        console.log('✅ SUCCESS! API returned data');
        console.log('');
        console.log('Response Type:', Array.isArray(data) ? 'Array' : typeof data);
        console.log('Response Length:', Array.isArray(data) ? data.length : 'N/A');
        console.log('');
        
        if (Array.isArray(data) && data.length > 0) {
            console.log('='.repeat(80));
            console.log('SAMPLE DATA (First 3 items):');
            console.log('='.repeat(80));
            data.slice(0, 3).forEach((item, index) => {
                console.log(`\nItem ${index + 1}:`);
                console.log(JSON.stringify(item, null, 2));
            });
            
            console.log('');
            console.log('='.repeat(80));
            console.log('DATA SUMMARY:');
            console.log('='.repeat(80));
            
            // Aggregate data
            let totalSessions = 0;
            let totalActiveUsers = 0;
            const urls = new Set();
            const devices = new Set();
            const countries = new Set();
            
            data.forEach(item => {
                if (item.sessions) totalSessions += parseInt(item.sessions, 10) || 0;
                if (item.activeUsers) totalActiveUsers += parseInt(item.activeUsers, 10) || 0;
                if (item.dimension1) urls.add(item.dimension1);
                if (item.dimension2) devices.add(item.dimension2);
                if (item.dimension3) countries.add(item.dimension3);
            });
            
            console.log(`Total Sessions: ${totalSessions}`);
            console.log(`Total Active Users: ${totalActiveUsers}`);
            console.log(`Unique URLs: ${urls.size}`);
            console.log(`Unique Devices: ${devices.size}`);
            console.log(`Unique Countries: ${countries.size}`);
            console.log('');
            console.log('URLs:', Array.from(urls).slice(0, 5).join(', '));
            console.log('Devices:', Array.from(devices).join(', '));
            console.log('Countries:', Array.from(countries).slice(0, 5).join(', '));
            
        } else {
            console.log('⚠️  API returned empty data');
            console.log('Full response:', JSON.stringify(data, null, 2));
        }
        
        console.log('');
        console.log('='.repeat(80));
        console.log('✅ TEST COMPLETE - API IS WORKING!');
        console.log('='.repeat(80));
        
    } catch (error) {
        console.log('');
        console.log('='.repeat(80));
        console.log('❌ ERROR - API REQUEST FAILED');
        console.log('='.repeat(80));
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Status Text:', error.response.statusText);
            console.error('Data:', error.response.data);
        }
        console.log('='.repeat(80));
    }
}

testClarityAPI();
