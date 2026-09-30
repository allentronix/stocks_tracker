export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
      <div className="size-6 animate-spin rounded-full border-2 border-white/15 border-t-white"></div>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}
