"use client";

import { FileDown } from "lucide-react";

export function DownloadSyllabusBtn() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hidden inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
    >
      <FileDown className="h-5 w-5" aria-hidden />
      Download Syllabus PDF
    </button>
  );
}
