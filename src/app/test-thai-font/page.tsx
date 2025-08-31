export default function TestThaiFontPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Thai Font Test Page</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Font Loading Status:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">IBM Plex Sans Thai</h3>
            <p className="font-thai text-lg">สวัสดีครับ/ค่ะ - Hello in Thai</p>
            <p className="text-sm text-muted-foreground mt-2">This should display in IBM Plex Sans Thai font</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Inter Font</h3>
            <p className="font-english text-lg">Hello World - English text</p>
            <p className="text-sm text-muted-foreground mt-2">This should display in Inter font</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Thai Text Tests:</h2>
        <div className="space-y-2">
          <p className="text-base">สวัสดีครับ/ค่ะ - Hello in Thai</p>
          <p className="text-base">ชื่อของฉันคือ - My name is</p>
          <p className="text-base">ยินดีที่ได้รู้จัก - Nice to meet you</p>
          <p className="text-base">ขอบคุณมาก - Thank you very much</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Mixed Text Tests:</h2>
        <div className="space-y-2">
          <p className="text-base">Hello สวัสดีครับ/ค่ะ World</p>
          <p className="text-base">My name is ชื่อของฉันคือ John</p>
          <p className="text-base">Thank you ขอบคุณมาก for your help</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Font Classes Tests:</h2>
        <div className="space-y-2">
          <p className="font-thai debug-thai-font">สวัสดีครับ/ค่ะ (font-thai class)</p>
          <p className="font-english debug-english-font">Hello World (font-english class)</p>
          <p className="font-auto">สวัสดีครับ/ค่ะ Hello World (font-auto class)</p>
          <p className="font-ibm-plex-sans-thai">สวัสดีครับ/ค่ะ (font-ibm-plex-sans-thai class)</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Language Attributes Tests:</h2>
        <div className="space-y-2">
          <p lang="th" className="debug-thai-font">สวัสดีครับ/ค่ะ (lang="th")</p>
          <p lang="en" className="debug-english-font">Hello World (lang="en")</p>
          <p lang="th-TH">สวัสดีครับ/ค่ะ (lang="th-TH")</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">CSS Variables Test:</h2>
        <div className="space-y-2">
          <p style={{ fontFamily: 'var(--font-family-primary)' }}>สวัสดีครับ/ค่ะ (--font-family-primary)</p>
          <p style={{ fontFamily: 'var(--font-family-secondary)' }}>Hello World (--font-family-secondary)</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Direct Font Family Test:</h2>
        <div className="space-y-2">
          <p style={{ fontFamily: "'IBM Plex Sans Thai', 'Inter', Arial, Helvetica, sans-serif" }}>
            สวัสดีครับ/ค่ะ (Direct IBM Plex Sans Thai)
          </p>
          <p style={{ fontFamily: "'Inter', Arial, Helvetica, sans-serif" }}>
            Hello World (Direct Inter)
          </p>
        </div>
      </div>
      
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
        </div>
      </div>
    </div>
  );
}
