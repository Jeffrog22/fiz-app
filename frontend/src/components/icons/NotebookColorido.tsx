import { SVGProps } from 'react';

export function NotebookColorido({ className }: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-5 h-5 ${className ?? ''}`}
    >
      <path d="M16 2v20" stroke="blue-500" />
      <path d="M2 10h4" stroke="red-500" />
      <path d="M2 14h4" stroke="red-500" />
      <path d="M2 18h4" stroke="red-500" />
      <path d="M2 6h4" stroke="red-500" />
      <rect x="4" y="2" width="16" height="20" rx="2" stroke="white" fill="none" />
    </svg>
  );
}
