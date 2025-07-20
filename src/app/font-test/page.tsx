export default function FontTestPage() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">Font Test Page</h1>
      
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Default Font (should be IBM Plex Sans Thai)</h2>
        <p className="text-lg">This text should use IBM Plex Sans Thai font by default.</p>
        <p className="text-base">English text: Hello World</p>
        <p className="text-base">Thai text: สวัสดีชาวโลก</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Font Classes Test</h2>
        <p className="font-sans">font-sans class</p>
        <p className="font-inter">font-inter class</p>
        <p className="font-ibm-plex-sans-thai">font-ibm-plex-sans-thai class</p>
        <p className="font-auto">font-auto class</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Language Attributes Test</h2>
        <p lang="en">English text with lang="en"</p>
        <p lang="th">Thai text with lang="th": สวัสดีชาวโลก</p>
        <p lang="th-TH">Thai text with lang="th-TH": สวัสดีชาวโลก</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Form Elements Test</h2>
        <input 
          type="text" 
          placeholder="Input field" 
          className="border p-2 rounded"
        />
        <textarea 
          placeholder="Textarea field" 
          className="border p-2 rounded w-full h-20"
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Button text
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">CSS Custom Property Test</h2>
        <p style={{ fontFamily: 'var(--font-family-primary)' }}>
          Using CSS custom property: var(--font-family-primary)
        </p>
      </div>
    </div>
  );
} 