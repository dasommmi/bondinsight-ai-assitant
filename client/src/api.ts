const BASE = "http://localhost:3001";

export const uploadPdf = async (file: File) => {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/parse`, {
    method: "POST",
    body: form
  });
  return res.json();
};

export const extractInfo = async (text: string) => {
  const res = await fetch(`${BASE}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  return res.json();
};

export const classifyDoc = async (text: string) => {
  const res = await fetch(`${BASE}/solar/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  return res.json();
};

export const getSummary = async (extracted: any, documentType: string) => {
  const res = await fetch(`${BASE}/solar/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extracted, documentType })
  });
  return res.json();
};

export const getWorstCase = async (extracted: any, documentType: string) => {
  const res = await fetch(`${BASE}/solar/worst-case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extracted, documentType })
  });
  return res.json();
};

