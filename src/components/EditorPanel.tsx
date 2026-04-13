export default function EditorPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="w-96 bg-[#1e293b] border-l border-slate-700 p-4 overflow-y-auto absolute right-0 top-0 bottom-0">
      <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
      <p className="text-slate-500 mt-4">Editor — coming soon</p>
    </div>
  );
}
