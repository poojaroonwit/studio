'use client';

import { useEffect, useState } from 'react';

export default function TestThaiFontPage() {
  const [fontStatus, setFontStatus] = useState<{
    thaiFont: boolean;
    interFont: boolean;
    notoThaiFont: boolean;
    fontsReady: boolean;
  }>({
    thaiFont: false,
    interFont: false,
    notoThaiFont: false,
    fontsReady: false,
  });

  useEffect(() => {
    const checkFonts = async () => {
      try {
        // Check if fonts are available
        const thaiFontAvailable = await document.fonts.check('1em "IBM Plex Sans Thai"');
        const interFontAvailable = await document.fonts.check('1em "Inter"');
        const notoThaiFontAvailable = await document.fonts.check('1em "Noto Sans Thai"');
        
        // Wait for fonts to load
        await document.fonts.ready;
        
        setFontStatus({
          thaiFont: thaiFontAvailable,
          interFont: interFontAvailable,
          notoThaiFont: notoThaiFontAvailable,
          fontsReady: true,
        });
        
        console.log('Font status:', {
          'IBM Plex Sans Thai': thaiFontAvailable,
          'Inter': interFontAvailable,
          'Noto Sans Thai': notoThaiFontAvailable,
          'Fonts Ready': true
        });
      } catch (error) {
        console.error('Font checking error:', error);
        setFontStatus({
          thaiFont: false,
          interFont: false,
          notoThaiFont: false,
          fontsReady: true,
        });
      }
    };

    checkFonts();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Thai Font Test Page</h1>
      
      {/* Font Status */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Font Loading Status:</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 border rounded-lg ${fontStatus.thaiFont ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className="font-semibold mb-2">IBM Plex Sans Thai</h3>
            <p className={`text-lg ${fontStatus.thaiFont ? 'text-green-700' : 'text-red-700'}`}>
              {fontStatus.thaiFont ? '✓ Available' : '✗ Not Available'}
            </p>
            <p className="font-thai text-lg">สวัสดีครับ/ค่ะ - Hello in Thai</p>
          </div>
          <div className={`p-4 border rounded-lg ${fontStatus.notoThaiFont ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className="font-semibold mb-2">Noto Sans Thai</h3>
            <p className={`text-lg ${fontStatus.notoThaiFont ? 'text-green-700' : 'text-red-700'}`}>
              {fontStatus.notoThaiFont ? '✓ Available' : '✗ Not Available'}
            </p>
            <p style={{ fontFamily: 'Noto Sans Thai, Inter, Arial, sans-serif' }} className="text-lg">สวัสดีครับ/ค่ะ - Fallback Thai</p>
          </div>
          <div className={`p-4 border rounded-lg ${fontStatus.interFont ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className="font-semibold mb-2">Inter Font</h3>
            <p className={`text-lg ${fontStatus.interFont ? 'text-green-700' : 'text-red-700'}`}>
              {fontStatus.interFont ? '✓ Available' : '✗ Not Available'}
            </p>
            <p className="font-english text-lg">Hello World - English text</p>
          </div>
          <div className={`p-4 border rounded-lg ${fontStatus.fontsReady ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <h3 className="font-semibold mb-2">Font Loading</h3>
            <p className={`text-lg ${fontStatus.fontsReady ? 'text-green-700' : 'text-yellow-700'}`}>
              {fontStatus.fontsReady ? '✓ Ready' : '⏳ Loading...'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Thai Text Tests */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Thai Text Tests:</h2>
        <div className="space-y-2">
          <p className="text-base">สวัสดีครับ/ค่ะ - Hello in Thai</p>
          <p className="text-base">ชื่อของฉันคือ - My name is</p>
          <p className="text-base">ยินดีที่ได้รู้จัก - Nice to meet you</p>
          <p className="text-base">ขอบคุณมาก - Thank you very much</p>
          <p className="text-base">ประเทศไทย - Thailand</p>
          <p className="text-base">กรุงเทพมหานคร - Bangkok</p>
        </div>
      </div>
      
      {/* Mixed Text Tests */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Mixed Text Tests:</h2>
        <div className="space-y-2">
          <p className="text-base">Hello สวัสดีครับ/ค่ะ World</p>
          <p className="text-base">My name is ชื่อของฉันคือ John</p>
          <p className="text-base">Thank you ขอบคุณมาก for your help</p>
          <p className="text-base">Welcome to ประเทศไทย (Thailand)</p>
        </div>
      </div>
      
      {/* Font Classes Tests */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Font Classes Tests:</h2>
        <div className="space-y-2">
          <p className="font-thai text-lg">สวัสดีครับ/ค่ะ (font-thai class)</p>
          <p className="font-english text-lg">Hello World (font-english class)</p>
          <p className="font-auto text-lg">สวัสดีครับ/ค่ะ Hello World (font-auto class)</p>
          <p className="font-ibm-plex-sans-thai text-lg">สวัสดีครับ/ค่ะ (font-ibm-plex-sans-thai class)</p>
          <p className="font-inter text-lg">Hello World (font-inter class)</p>
        </div>
      </div>
      
      {/* Language Attributes Tests */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Language Attributes Tests:</h2>
        <div className="space-y-2">
          <p lang="th" className="text-lg">สวัสดีครับ/ค่ะ (lang="th")</p>
          <p lang="en" className="text-lg">Hello World (lang="en")</p>
          <p lang="th-TH" className="text-lg">สวัสดีครับ/ค่ะ (lang="th-TH")</p>
        </div>
      </div>
      
      {/* CSS Variables Test */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">CSS Variables Test:</h2>
        <div className="space-y-2">
          <p style={{ fontFamily: 'var(--font-family-primary)' }} className="text-lg">
            สวัสดีครับ/ค่ะ (--font-family-primary)
          </p>
          <p style={{ fontFamily: 'var(--font-family-secondary)' }} className="text-lg">
            Hello World (--font-family-secondary)
          </p>
        </div>
      </div>
      
      {/* Direct Font Family Test */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Direct Font Family Test:</h2>
        <div className="space-y-2">
          <p style={{ fontFamily: "'IBM Plex Sans Thai', 'Inter', 'Noto Sans Thai', 'Tahoma', Arial, Helvetica, sans-serif" }} className="text-lg">
            สวัสดีครับ/ค่ะ (Direct IBM Plex Sans Thai with fallbacks)
          </p>
          <p style={{ fontFamily: "'Inter', 'Segoe UI', 'Roboto', Arial, Helvetica, sans-serif" }} className="text-lg">
            Hello World (Direct Inter with fallbacks)
          </p>
        </div>
      </div>
      
      {/* Font Weight Tests */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Font Weight Tests:</h2>
        <div className="space-y-2">
          <p className="font-thai font-normal text-lg">สวัสดีครับ/ค่ะ (Normal weight)</p>
          <p className="font-thai font-medium text-lg">สวัสดีครับ/ค่ะ (Medium weight)</p>
          <p className="font-thai font-semibold text-lg">สวัสดีครับ/ค่ะ (Semibold weight)</p>
          <p className="font-thai font-bold text-lg">สวัสดีครับ/ค่ะ (Bold weight)</p>
        </div>
      </div>
      
      {/* Browser Font Detection */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Browser Font Detection:</h2>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm">
            <strong>Instructions:</strong> Right-click on any Thai text above and select "Inspect Element" 
            to check if the correct font is being applied in the browser's developer tools.
          </p>
          <p className="text-sm mt-2">
            <strong>Expected:</strong> Thai text should show "IBM Plex Sans Thai" as the computed font-family.
          </p>
          <p className="text-sm mt-2">
            <strong>Fallback:</strong> If IBM Plex Sans Thai is not available, it should fall back to Inter, then Noto Sans Thai, then Tahoma.
          </p>
        </div>
      </div>
      
      {/* Debug Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Debug Information:</h2>
        <div className="p-4 bg-gray-100 rounded-lg">
          <pre className="text-xs overflow-auto">
            {JSON.stringify(fontStatus, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
