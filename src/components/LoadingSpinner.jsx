export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="text-center flex flex-col items-center justify-center py-8">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-yellow-500"></div>
      <h2 className="text-zinc-900 dark:text-white mt-4">{label}</h2>
    </div>
  );
}

