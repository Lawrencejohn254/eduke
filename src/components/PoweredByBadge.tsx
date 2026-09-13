import Image from "next/image";

export default function PoweredByBadge() {
  return (
    <a
      href="https://diraflowai.com"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-gray-900/90 backdrop-blur px-3.5 py-2 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 transition-transform hover:scale-105 hover:bg-gray-900"
    >
      <Image
        src="/diraflow-mark.png"
        alt="DiraFlow AI"
        width={16}
        height={16}
        className="shrink-0"
      />
      Powered by DiraFlow AI
    </a>
  );
}