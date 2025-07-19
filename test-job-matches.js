import fetch from 'node-fetch';

async function testJobMatches() {
  const candidateId = 'bb9ac1d7-4dce-46f2-9278-4c92a9f7dc34';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFhZTVmZjAxLTE1N2QtNDY3Yi04MjZhLTkxNGZlYzMyNjE4NiIsImVtYWlsIjoiYWRtaW5AcXNuY2MuY29tIiwicm9sZSI6IkFkbWluIiwibW9kdWxlUGVybWlzc2lvbnMiOlsiQ0FORElEQVRFU19WSUVXIiwiQ0FORElEQVRFU19NQU5BR0UiLCJDQU5ESURBVEVTX0lNUE9SVCIsIkNBTkRJREFURVNfRVhQT1JUIiwiUE9TSVRJT05TX1ZJRVciLCJQT1NJVElPTlNfTUFOQUdFIiwiUE9TSVRJT05TX0lNUE9SVCIsIlBPU0lUSU9OU19FWFBPUlQiLCJVU0VSU19NQU5BR0UiLCJVU0VSX0dST1VQU19NQU5BR0UiLCJTWVNURU1fU0VUVElOR1NfTUFOQUdFIiwiVVNFUl9QUkVGRVJFTkNFU19NQU5BR0UiLCJSRUNSVUlUTUVOVF9TVEFHRVNfTUFOQUdFIiwiQ1VTVE9NX0ZJRUxEU19NQU5BR0UiLCJMT0dTX1ZJRVciLCJBSV9JTlRFR1JBVElPTl9NQU5BR0UiLCJBTkFMWVRJQ1NfVklFVyIsIkFQSV9LRVlTX01BTkFHRSIsIkFVRElUX0xPR1NfVklFVyIsIkFVVE9NQVRJT05fVVBMT0FEIiwiQlVMS19VUExPQUQiLCJDQU5ESURBVEVTX0NPTU1FTlRTIiwiQ0FORElEQVRFU19SRUNSVUlURVJfQVNTSUdOIiwiQ0FORElEQVRFU19SRVNVTUVTIiwiQ0FORElEQVRFU19UUkFOU0lUSU9OUyIsIkRBU0hCT0FSRF9WSUVXIiwiRklOQU5DRV9ERVBBUlRNRU5UX01BTkFHRSIsIkhSX0RFUEFSVE1FTlRfTUFOQUdFIiwiSVRfREVQQVJUTUVOVF9NQU5BR0UiLCJNQVJLRVRJTkdfREVQQVJUTUVOVF9NQU5BR0UiLCJVUExPQURfUVVFVUVfTUFOQUdFIiwiV0VCSE9PS19BTkFMWVRJQ1NfVklFVyIsIldFQkhPT0tfTE9HU19WSUVXIiwiV0VCSE9PS19NQVBQSU5HX01BTkFHRSJdLCJpYXQiOjE3NTI5NDQ4MjUsImV4cCI6MTc1Mjk0ODQyNX0.nJSG8ahPTNkBg9JNw1acI9il1_lyTa0WSdU9oNSFFiU';

  const payload = {
    "job_matches": [{
      "fitScore": 0.65, 
      "jobId": "22222222-2222-2222-2222-222222222222", 
      "matchReasons": [
        "ผู้สมัครมีประสบการณ์ในตำแหน่ง System Division Manager และเคยทำงานใน Central Department Store ซึ่งอาจมีความเกี่ยวข้องกับงาน Product Manager .",
        "ผู้สมัครมีทักษะด้าน Project management, solution design, และ team management ซึ่งเป็นทักษะที่สำคัญสำหรับตำแหน่ง Product Manager .",
        "ผู้สมัครมีประสบการณ์ในการจัดการผลิตภัณฑ์ รวมถึงการวิเคราะห์ข้อมูลผลิตภัณฑ์ ซึ่งสอดคล้องกับความรับผิดชอบของ Product Manager .",
        "ผู้สมัครมีทักษะด้าน Digital services เช่น e-commerce website และ data analytics solutions ซึ่งอาจเป็นประโยชน์ในตำแหน่ง Product Manager .",
        "ผู้สมัครมีประสบการณ์น้อยในบทบาท Product Manager โดยตรง .",
        "ผู้สมัครไม่มีประสบการณ์ด้านการพัฒนาผลิตภัณฑ์โดยตรง .",
        "ทักษะด้านเทคนิคของผู้สมัคร เช่น Next.js, Node.js, PHP, และ Python อาจไม่เกี่ยวข้องโดยตรงกับความรับผิดชอบหลักของ Product Manager .",
        "ไม่มีข้อมูลที่ชัดเจนเกี่ยวกับความเข้าใจของผู้สมัครเกี่ยวกับวงจรชีวิตผลิตภัณฑ์และการจัดการผลิตภัณฑ์ .",
        "ไม่มีข้อมูลเกี่ยวกับความสามารถของผู้สมัครในการกำหนดกลยุทธ์ผลิตภัณฑ์และ roadmap ."
      ]
    }]
  };

  try {
    const response = await fetch(`http://192.168.1.45:8021/api/v1/candidates/${candidateId}/job-matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response:', responseText);

    if (!response.ok) {
      console.error('Error response:', responseText);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

testJobMatches(); 