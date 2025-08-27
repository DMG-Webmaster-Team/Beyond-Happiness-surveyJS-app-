export default function TestStyles() {
  return (
    <div className="min-h-screen bg-red-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">Style Test</h1>
        <p className="text-gray-700 mb-4">
          If you can see this styled properly:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li className="text-green-600">
            ✅ Red background (Tailwind working)
          </li>
          <li className="text-green-600">✅ White card with shadow</li>
          <li className="text-green-600">✅ Blue title text</li>
          <li className="text-green-600">✅ Proper spacing and typography</li>
        </ul>
        <div className="mt-6">
          <button className="bg-brand-primary text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
            Custom Brand Color Test
          </button>
        </div>
      </div>
    </div>
  );
}

