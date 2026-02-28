const axios = require('axios');

async function createTestJob() {
    const backendUrl = 'http://localhost:8080';
    
    const jobRequest = {
        type: 'URL_ANALYSIS',
        url: 'https://samskritsamhita.org/',
        pages: 3,
        clarityProjectId: 'urjdss007k',
        clarityToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4M0FCMDhFNUYwRDMxNjdEOTRFMTQ3M0FEQTk2RTcyRDkwRUYwRkYiLCJ0eXAiOiJKV1QifQ.eyJqdGkiOiIwMTIxMGZjNC00MTJiLTRjZmMtODJkYy0xNWM3NDg5YWMxNDQiLCJzdWIiOiIzMTI0NDg3NjI0OTI0NDMyIiwic2NvcGUiOiJEYXRhLkV4cG9ydCIsIm5iZiI6MTc2Njk4MzkzMCwiZXhwIjo0OTIwNTgzOTMwLCJpYXQiOjE3NjY5ODM5MzAsImlzcyI6ImNsYXJpdHkiLCJhdWQiOiJjbGFyaXR5LmRhdGEtZXhwb3J0ZXIifQ.BVumdBeL-wM-O5fkaVt0IWc_r6OBsW-tB8NTkFg92V-Nq1UcODP34wWMviTyuIfGSyLfRw1CFegest38bL8ewQUnFAuSBtR9cFBJ7xcAB5kR-juzOW4QQ4losxmUfZb_7tkbHK7Ehc3MnCNMAXlmwZScNuEZmKlCG-J_sIgdPqKdaBjUP01b_vjtUjwVTtBgO2zr5RcH6E7uOCWebuAuugS9Xz5rmgxduzpDsw7rLtaAhqxR9dt59mNJ_P0UQ8aJUDj2Z4AqmJZCw5WIuwbB_VaS2yLF1OaYBAT6PWTSzpr6BS6HDJGgSXo3SxK_QkxxPVo7Svecn0n8IIBYCvbKVg'
    };
    
    console.log('Creating test job...');
    console.log('Request:', JSON.stringify(jobRequest, null, 2));
    
    try {
        const response = await axios.post(`${backendUrl}/api/jobs`, jobRequest);
        const job = response.data;
        
        console.log('\n✅ Job created successfully!');
        console.log('Job ID:', job.id);
        console.log('Status:', job.status);
        console.log('\nView job at: http://localhost:3000/dashboard/jobs');
        console.log('\nWait 60-90 seconds for data to populate, then refresh the page.');
        
    } catch (error) {
        console.error('\n❌ Failed to create job:');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

createTestJob();
