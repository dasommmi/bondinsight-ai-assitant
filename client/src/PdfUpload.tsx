import {
  uploadPdf,
  extractInfo,
  classifyDoc,
  getSummary,
  getWorstCase
} from "./api";

export function PdfUpload({ setResult }: any) {
  const onChange = async (e: any) => {
    const file = e.target.files[0];

    setResult({ status: "parsing", message: "PDF 파싱 중..." });

    const parsed = await uploadPdf(file);

    setResult({ status: "extracting", message: "정보 추출 중..." });

    const extracted = await extractInfo(parsed.text);

    setResult({ status: "classifying", message: "문서 분류 중..." });

    const { documentType } = await classifyDoc(parsed.text);

    setResult({ status: "summarizing", message: "요약/리스크 분석 중..." });

    const [summaryRes, worstCaseRes] = await Promise.all([
      getSummary(extracted, documentType),
      getWorstCase(extracted, documentType)
    ]);

    setResult({
      status: "done",
      documentType,
      summary: summaryRes.summary,
      worstCase: worstCaseRes.worstCase
    });
  };

  return <input type="file" accept="application/pdf" onChange={onChange} />;
}
