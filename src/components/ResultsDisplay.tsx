'use client';

interface ResultsDisplayProps {
  results: string[];
  onReset: () => void;
}

export default function ResultsDisplay({
  results,
  onReset,
}: ResultsDisplayProps) {
  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Results Ready! 🎉
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((url, index) => (
            <div key={index} className="space-y-3">
              <div className="relative">
                <img
                  src={url}
                  alt={`Processed result ${index + 1}`}
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              </div>

              <button
                onClick={() =>
                  downloadImage(url, `ex-out-result-${index + 1}.png`)
                }
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Download Image {index + 1}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={onReset}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Process New Photos
          </button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>✅ All images have been processed and deleted from our servers</p>
        </div>
      </div>
    </div>
  );
}
