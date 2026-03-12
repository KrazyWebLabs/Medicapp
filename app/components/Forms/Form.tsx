export default function Form({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <form
      className="items-center justify-center max-w-full min-w-full max-h-full mx-auto p-4 grid grid-cols-2 md:grid-cols-1 gap-2"
      method="post"
    >
      <h2 className="text-4xl dark:text-white font-bold text-black text-center col-span-2 md:col-span-1 mb-10">
        {title}
      </h2>
      {children}
    </form>
  );
}
