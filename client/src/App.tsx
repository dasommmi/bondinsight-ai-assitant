import { useState } from "react";
import { PdfUpload } from "./PdfUpload";

function App() {
    const [result, setResult] = useState<any>(null);

    return (
        <div style={{ padding: 24 }}>
            <h1>BondInsight AI Agent</h1>

            <PdfUpload setResult={setResult} />

            {result?.status && result.status !== "done" && (
                <div>
                    <h2>⏳ {result.message}</h2>
                    <p>진행 상태: {result.status}</p>
                </div>
            )}

            {result?.status === "done" && (
                <>
                    <h2>📄 Document Type</h2>
                    <pre>{result.documentType}</pre>

                    <h2>⚠️ Risk-first Summary</h2>
                    <pre>{result.summary}</pre>

                    <h2>🔥 Worst Case Scenario</h2>
                    <pre>{result.worstCase}</pre>
                </>
            )}
        </div>
    );
}

export default App;
